package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Perfil de outro leitor e busca exata contra Postgres real (RF-SOC-02/03, RN-08). Prioridade
 * obrigatória de teste (RNF-TST-01): a matriz de acesso cobre público, privado para não-seguidor,
 * privado para seguidor aceito, próprio e conta oculta. Seguimentos e solicitações entram direto
 * no banco, porque seguir pela API é da etapa seguinte.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class PerfilDeOutroIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";

  @Autowired private JdbcTemplate jdbc;

  @Autowired private ObjectMapper objectMapper;

  private record Leitor(UUID id, String username, String token) {}

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    String username = "outro_" + s;
    postJson(
        "/auth/register",
        """
        {"email":"outro.%1$s@exemplo.com","username":"%2$s","displayName":"Leitora %1$s",
         "dataNascimento":"1990-01-01","senha":"%3$s"}
        """
            .formatted(s, username, SENHA),
        "Idempotency-Key",
        UUID.randomUUID().toString());
    HttpResponse<String> login =
        postJson(
            "/auth/login",
            "{\"identificador\":\"%s\",\"senha\":\"%s\"}".formatted(username, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    String token = objectMapper.readTree(login.body()).get("accessToken").asString();
    UUID id = jdbc.queryForObject("SELECT id FROM usuario WHERE username = ?", UUID.class, username);
    return new Leitor(id, username, token);
  }

  private void tornarPrivado(Leitor leitor) {
    jdbc.update(
        "UPDATE usuario SET privacidade = 'privado', biografia = 'Bio pública' WHERE id = ?",
        leitor.id());
  }

  private HttpResponse<String> get(String caminho, String token) {
    return enviar(
        HttpRequest.newBuilder(uri(caminho)).header("Authorization", "Bearer " + token).GET().build());
  }

  private JsonNode perfil(Leitor quem, Leitor de) {
    HttpResponse<String> resposta = get("/perfis/" + de.username(), quem.token());
    assertThat(resposta.statusCode()).isEqualTo(200);
    return objectMapper.readTree(resposta.body());
  }

  @Test
  @DisplayName("perfil público de outro: relação nenhuma, conteúdo aberto, sem e-mail")
  void publico() {
    Leitor eu = novoLeitor();
    Leitor outro = novoLeitor();

    JsonNode resposta = perfil(eu, outro);

    assertThat(resposta.get("relacao").asString()).isEqualTo("nenhuma");
    assertThat(resposta.get("conteudoRestrito").asBoolean()).isFalse();
    assertThat(resposta.has("email")).isFalse();
    assertThat(resposta.get("contadores").get("seguidores").asLong()).isZero();
  }

  @Test
  @DisplayName("privado para não-seguidor: 200 com identidade e bio públicas e conteúdo restrito")
  void privadoParaNaoSeguidor() {
    Leitor eu = novoLeitor();
    Leitor outro = novoLeitor();
    tornarPrivado(outro);

    JsonNode resposta = perfil(eu, outro);

    assertThat(resposta.get("conteudoRestrito").asBoolean()).isTrue();
    assertThat(resposta.get("biografia").asString()).isEqualTo("Bio pública");
    assertThat(resposta.get("displayName").asString()).startsWith("Leitora");
  }

  @Test
  @DisplayName("privado para seguidor aceito: relação seguindo e conteúdo aberto")
  void privadoParaSeguidor() {
    Leitor eu = novoLeitor();
    Leitor outro = novoLeitor();
    tornarPrivado(outro);
    jdbc.update("INSERT INTO seguidor (seguidor_id, seguido_id) VALUES (?, ?)", eu.id(), outro.id());

    JsonNode resposta = perfil(eu, outro);

    assertThat(resposta.get("relacao").asString()).isEqualTo("seguindo");
    assertThat(resposta.get("conteudoRestrito").asBoolean()).isFalse();
  }

  @Test
  @DisplayName("solicitação pendente aparece como enviada para quem pediu e recebida para o alvo")
  void solicitacaoPendente() {
    Leitor eu = novoLeitor();
    Leitor outro = novoLeitor();
    tornarPrivado(outro);
    jdbc.update(
        "INSERT INTO solicitacao_seguir (solicitante_id, alvo_id) VALUES (?, ?)", eu.id(), outro.id());

    JsonNode visaoDeQuemPediu = perfil(eu, outro);
    JsonNode visaoDoAlvo = perfil(outro, eu);

    assertThat(visaoDeQuemPediu.get("relacao").asString()).isEqualTo("solicitacao_enviada");
    assertThat(visaoDeQuemPediu.get("conteudoRestrito").asBoolean()).isTrue();
    assertThat(visaoDoAlvo.get("relacao").asString()).isEqualTo("solicitacao_recebida");
  }

  @Test
  @DisplayName("o próprio perfil pelo username é relação próprio, mesmo privado")
  void proprio() {
    Leitor eu = novoLeitor();
    tornarPrivado(eu);

    JsonNode resposta = perfil(eu, eu);

    assertThat(resposta.get("relacao").asString()).isEqualTo("proprio");
    assertThat(resposta.get("conteudoRestrito").asBoolean()).isFalse();
  }

  @Test
  @DisplayName("conta suspensa ou em exclusão é 404 no perfil e não aparece na busca")
  void contaOculta() {
    Leitor eu = novoLeitor();
    Leitor suspensa = novoLeitor();
    Leitor excluindo = novoLeitor();
    jdbc.update("UPDATE usuario SET suspenso = true WHERE id = ?", suspensa.id());
    jdbc.update(
        "UPDATE usuario SET exclusao_solicitada_em = now(),"
            + " exclusao_prevista_em = now() + interval '30 days' WHERE id = ?",
        excluindo.id());

    assertThat(get("/perfis/" + suspensa.username(), eu.token()).statusCode()).isEqualTo(404);
    assertThat(get("/perfis/" + excluindo.username(), eu.token()).statusCode()).isEqualTo(404);
    assertThat(get("/perfis/nao_existe_ninguem", eu.token()).statusCode()).isEqualTo(404);
    assertThat(get("/perfis?username=" + suspensa.username(), eu.token()).body()).isEqualTo("[]");
  }

  @Test
  @DisplayName("busca acha pelo username inteiro, sem diferenciar caixa, e nada por prefixo")
  void buscaExata() {
    Leitor eu = novoLeitor();
    Leitor outro = novoLeitor();
    tornarPrivado(outro);

    JsonNode achado =
        objectMapper.readTree(get("/perfis?username=" + outro.username().toUpperCase(), eu.token()).body());
    HttpResponse<String> prefixo =
        get("/perfis?username=" + outro.username().substring(0, 8), eu.token());

    assertThat(achado).hasSize(1);
    assertThat(achado.get(0).get("username").asString()).isEqualTo(outro.username());
    assertThat(achado.get(0).get("conteudoRestrito").asBoolean()).isTrue();
    // Biografia é pública mesmo em perfil privado (RN-08); está no resumo desde 25/09.
    assertThat(achado.get(0).has("biografia")).isTrue();
    assertThat(achado.get(0).has("contadores")).isFalse();
    assertThat(prefixo.statusCode()).isEqualTo(200);
    assertThat(prefixo.body()).isEqualTo("[]");
  }

  @Test
  @DisplayName("busca sem username ou fora do formato é 400; sem token é 401")
  void buscaInvalida() {
    Leitor eu = novoLeitor();

    assertThat(get("/perfis", eu.token()).statusCode()).isEqualTo(400);
    assertThat(get("/perfis?username=a%25", eu.token()).statusCode()).isEqualTo(400);
    assertThat(get("/perfis?username=ab", eu.token()).statusCode()).isEqualTo(400);
    assertThat(enviar(HttpRequest.newBuilder(uri("/perfis?username=abc")).GET().build()).statusCode())
        .isEqualTo(401);
  }

  @Test
  @DisplayName("acima de 30 buscas por minuto o mesmo usuário recebe 429")
  void limiteDeBusca() {
    Leitor eu = novoLeitor();
    for (int i = 0; i < 30; i++) {
      assertThat(get("/perfis?username=ninguem_" + i, eu.token()).statusCode()).isEqualTo(200);
    }

    assertThat(get("/perfis?username=ninguem_x", eu.token()).statusCode()).isEqualTo(429);
    // O limite é por usuário: outra pessoa continua buscando.
    assertThat(get("/perfis?username=ninguem_x", novoLeitor().token()).statusCode()).isEqualTo(200);
  }
}
