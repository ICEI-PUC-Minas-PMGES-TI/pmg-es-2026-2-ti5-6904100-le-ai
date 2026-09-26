package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpResponse;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Troca de senha contra Postgres real (RF-AUT-05, RNF-SEC-30): cadeia do Spring Security com
 * token de verdade, trava da linha, revogação das renovações e log sem segredo (RNF-SEC-35/36).
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
@ExtendWith(OutputCaptureExtension.class)
class AlterarSenhaIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";
  private static final String NOVA_SENHA = "outra-senha-comprida";

  @Autowired private ObjectMapper objectMapper;

  private String novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    HttpResponse<String> cadastro =
        postJson(
            "/auth/register",
            """
            {"email":"troca.%1$s@exemplo.com","username":"troca_%1$s","displayName":"Leitora",
             "dataNascimento":"1990-01-01","senha":"%2$s"}
            """
                .formatted(s, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(cadastro.statusCode()).isEqualTo(201);
    return "troca_" + s;
  }

  private HttpResponse<String> entrar(String username, String senha) {
    return postJson(
        "/auth/login",
        """
        {"identificador":"%s","senha":"%s"}
        """
            .formatted(username, senha),
            "Idempotency-Key",
            UUID.randomUUID().toString());
  }

  private JsonNode sessao(String username) {
    HttpResponse<String> login = entrar(username, SENHA);
    assertThat(login.statusCode()).isEqualTo(200);
    return objectMapper.readTree(login.body());
  }

  private HttpResponse<String> alterar(
      String accessToken, String senhaAtual, String novaSenha, String chave) {
    return postJson(
        "/auth/password/change",
        """
        {"senhaAtual":"%s","novaSenha":"%s"}
        """
            .formatted(senhaAtual, novaSenha),
        "Authorization",
        "Bearer " + accessToken,
        "Idempotency-Key",
        chave);
  }

  private HttpResponse<String> renovar(String refreshToken) {
    return postJson(
        "/auth/refresh",
        "{\"refreshToken\":\"" + refreshToken + "\"}",
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  @Test
  @DisplayName("troca responde 204, a senha nova entra, a antiga não e as renovações caem")
  void trocaRevogaRenovacoes(CapturedOutput saida) {
    String username = novoLeitor();
    JsonNode celular = sessao(username);
    String navegador = sessao(username).get("refreshToken").asString();

    HttpResponse<String> resposta =
        alterar(
            celular.get("accessToken").asString(), SENHA, NOVA_SENHA, UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(204);
    assertThat(resposta.body()).isEmpty();
    assertThat(entrar(username, SENHA).statusCode()).isEqualTo(401);
    assertThat(entrar(username, NOVA_SENHA).statusCode()).isEqualTo(200);
    // Inclusive a do aparelho que pediu a troca: o contrato não recebe o refresh dele.
    assertThat(renovar(celular.get("refreshToken").asString()).statusCode()).isEqualTo(401);
    assertThat(renovar(navegador).statusCode()).isEqualTo(401);

    assertThat(saida.getOut()).contains("Senha alterada pelo usuário");
    assertThat(saida.getOut()).doesNotContain(SENHA).doesNotContain(NOVA_SENHA);
  }

  @Test
  @DisplayName("senha atual incorreta é 422, não troca nada e não derruba a sessão")
  void senhaAtualIncorreta(CapturedOutput saida) {
    String username = novoLeitor();
    JsonNode sessao = sessao(username);

    HttpResponse<String> resposta =
        alterar(
            sessao.get("accessToken").asString(),
            "senha-que-nao-e-a-atual",
            NOVA_SENHA,
            UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(422);
    assertThat(resposta.body())
        .contains("ENTIDADE_NAO_PROCESSAVEL")
        .contains("Senha atual incorreta.");
    assertThat(entrar(username, SENHA).statusCode()).isEqualTo(200);
    assertThat(renovar(sessao.get("refreshToken").asString()).statusCode()).isEqualTo(200);

    assertThat(saida.getOut()).contains("Troca de senha recusada");
    assertThat(saida.getOut()).doesNotContain("senha-que-nao-e-a-atual");
  }

  @Test
  @DisplayName("senha nova na lista de comuns é 422 com a mensagem do protótipo")
  void senhaNovaComum() {
    String username = novoLeitor();
    String accessToken = sessao(username).get("accessToken").asString();

    HttpResponse<String> resposta =
        alterar(accessToken, SENHA, "senha123", UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(422);
    assertThat(resposta.body()).contains("Essa senha é muito comum.");
    assertThat(entrar(username, SENHA).statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("sem token é 401 no corpo de erro padrão, mesmo com corpo e chave válidos")
  void semTokenVira401() {
    HttpResponse<String> resposta =
        postJson(
            "/auth/password/change",
            """
            {"senhaAtual":"%s","novaSenha":"%s"}
            """
                .formatted(SENHA, NOVA_SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(401);
    assertThat(resposta.body()).contains("NAO_AUTENTICADO");
  }

  @Test
  @DisplayName("repetir a chave devolve 204 sem trocar de novo; mesma chave com outro corpo é 409")
  void idempotencia() {
    String username = novoLeitor();
    String accessToken = sessao(username).get("accessToken").asString();
    String chave = UUID.randomUUID().toString();

    assertThat(alterar(accessToken, SENHA, NOVA_SENHA, chave).statusCode()).isEqualTo(204);
    // A senha atual já não é SENHA: sem o recibo, a repetição seria 422.
    assertThat(alterar(accessToken, SENHA, NOVA_SENHA, chave).statusCode()).isEqualTo(204);
    assertThat(alterar(accessToken, NOVA_SENHA, "terceira-senha-longa", chave).statusCode())
        .isEqualTo(409);
    assertThat(entrar(username, NOVA_SENHA).statusCode()).isEqualTo(200);
  }
}
