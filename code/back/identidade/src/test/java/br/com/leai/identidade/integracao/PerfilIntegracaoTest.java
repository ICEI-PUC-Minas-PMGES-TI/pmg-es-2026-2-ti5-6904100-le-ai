package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Próprio perfil contra Postgres real (RF-SOC-01/04): leitura, edição, avatar e privacidade. */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class PerfilIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";
  private static final String AVATAR =
      "https://res.cloudinary.com/leai/image/upload/v1727200000/avatares/k3j2h1g0.png";

  @Autowired private ObjectMapper objectMapper;

  /** Cadastra, entra e devolve o token de acesso. */
  private String leitorComToken() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    postJson(
        "/auth/register",
        """
        {"email":"perfil.%1$s@exemplo.com","username":"perfil_%1$s","displayName":"Leitora",
         "dataNascimento":"1990-01-01","senha":"%2$s"}
        """
            .formatted(s, SENHA),
        "Idempotency-Key",
        UUID.randomUUID().toString());
    HttpResponse<String> login =
        postJson(
            "/auth/login",
            "{\"identificador\":\"perfil_%s\",\"senha\":\"%s\"}".formatted(s, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    return objectMapper.readTree(login.body()).get("accessToken").asString();
  }

  private JsonNode meuPerfil(String token) {
    HttpResponse<String> resposta =
        enviar(
            HttpRequest.newBuilder(uri("/me/perfil"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build());
    assertThat(resposta.statusCode()).isEqualTo(200);
    return objectMapper.readTree(resposta.body());
  }

  private HttpResponse<String> editar(String token, String corpo, String chave) {
    return enviar(
        HttpRequest.newBuilder(uri("/me/perfil"))
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", chave)
            .PUT(HttpRequest.BodyPublishers.ofString(corpo))
            .build());
  }

  private static String corpo(String nome, String bio, String avatar, String privacidade) {
    String avatarJson =
        avatar == null
            ? "null"
            : "{\"url\":\"%s\",\"publicId\":\"avatares/k3j2h1g0\"}".formatted(avatar);
    String bioJson = bio == null ? "null" : "\"" + bio + "\"";
    return "{\"displayName\":\"%s\",\"biografia\":%s,\"avatar\":%s,\"privacidade\":\"%s\"}"
        .formatted(nome, bioJson, avatarJson, privacidade);
  }

  @Test
  @DisplayName("perfil recém-criado é público, próprio, sem avatar e com contadores zerados")
  void perfilNovo() {
    JsonNode perfil = meuPerfil(leitorComToken());

    assertThat(perfil.get("relacao").asString()).isEqualTo("proprio");
    assertThat(perfil.get("privacidade").asString()).isEqualTo("publico");
    assertThat(perfil.get("conteudoRestrito").asBoolean()).isFalse();
    assertThat(perfil.get("avatarUrl").isNull()).isTrue();
    assertThat(perfil.get("contadores").get("seguidores").asLong()).isZero();
    assertThat(perfil.has("email")).isFalse();
  }

  @Test
  @DisplayName("edição troca nome, biografia, avatar e privacidade; avatar nulo remove a foto")
  void editaERemoveAvatar() {
    String token = leitorComToken();

    HttpResponse<String> resposta =
        editar(token, corpo("Marina", "Leio ficção.", AVATAR, "privado"), UUID.randomUUID().toString());
    assertThat(resposta.statusCode()).isEqualTo(200);
    JsonNode perfil = meuPerfil(token);
    assertThat(perfil.get("displayName").asString()).isEqualTo("Marina");
    assertThat(perfil.get("biografia").asString()).isEqualTo("Leio ficção.");
    assertThat(perfil.get("avatarUrl").asString()).isEqualTo(AVATAR);
    assertThat(perfil.get("privacidade").asString()).isEqualTo("privado");

    editar(token, corpo("Marina", "  ", null, "publico"), UUID.randomUUID().toString());
    JsonNode semFoto = meuPerfil(token);
    assertThat(semFoto.get("avatarUrl").isNull()).isTrue();
    assertThat(semFoto.get("biografia").isNull()).isTrue();
  }

  @Test
  @DisplayName("avatar de fora do projeto é 422 e nada é salvo, nem o nome")
  void avatarRecusadoNaoSalva() {
    String token = leitorComToken();

    HttpResponse<String> resposta =
        editar(
            token,
            corpo("Outro nome", null, "https://evil.example/avatares/k3j2h1g0.png", "publico"),
            UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(422);
    assertThat(resposta.body()).contains("Não foi possível usar essa imagem.");
    assertThat(meuPerfil(token).get("displayName").asString()).isEqualTo("Leitora");
  }

  @Test
  @DisplayName("privacidade fora do enum e nome vazio são 400")
  void validacao() {
    String token = leitorComToken();

    assertThat(editar(token, corpo("Marina", null, null, "secreto"), UUID.randomUUID().toString())
            .statusCode())
        .isEqualTo(400);
    assertThat(editar(token, corpo(" ", null, null, "publico"), UUID.randomUUID().toString())
            .statusCode())
        .isEqualTo(400);
  }

  @Test
  @DisplayName("mesma chave com outro corpo é 409; sem token é 401")
  void idempotenciaESeguranca() {
    String token = leitorComToken();
    String chave = UUID.randomUUID().toString();

    assertThat(editar(token, corpo("Marina", null, null, "publico"), chave).statusCode())
        .isEqualTo(200);
    assertThat(editar(token, corpo("Marina", null, null, "publico"), chave).statusCode())
        .isEqualTo(200);
    assertThat(editar(token, corpo("Outra", null, null, "publico"), chave).statusCode())
        .isEqualTo(409);

    HttpResponse<String> semToken =
        enviar(HttpRequest.newBuilder(uri("/me/perfil")).GET().build());
    assertThat(semToken.statusCode()).isEqualTo(401);
  }
}
