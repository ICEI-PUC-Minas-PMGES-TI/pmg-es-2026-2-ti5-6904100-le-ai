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
 * Logs da autenticação (F-AUT, RNF-SEC-35/36): falha de login e bloqueio por tentativas ficam
 * registrados, e nenhum log de cadastro, login ou renovação carrega senha, e-mail ou token. A troca
 * de senha tem o mesmo cuidado em {@code AlterarSenhaIntegracaoTest}, e a recuperação em {@code
 * RecuperacaoIntegracaoTest}.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
@ExtendWith(OutputCaptureExtension.class)
class LogDeAutenticacaoIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";
  private static final String SENHA_ERRADA = "senha-que-nao-e-dela";

  @Autowired private ObjectMapper objectMapper;

  private record Leitor(String username, String email) {}

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    Leitor leitor = new Leitor("log_" + s, "log." + s + "@exemplo.com");
    HttpResponse<String> cadastro =
        postJson(
            "/auth/register",
            """
            {"email":"%s","username":"%s","displayName":"Leitora","dataNascimento":"1990-01-01",
             "senha":"%s"}
            """
                .formatted(leitor.email(), leitor.username(), SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(cadastro.statusCode()).isEqualTo(201);
    return leitor;
  }

  private HttpResponse<String> entrar(String identificador, String senha) {
    return postJson(
        "/auth/login",
        "{\"identificador\":\"%s\",\"senha\":\"%s\"}".formatted(identificador, senha),
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  @Test
  @DisplayName("login com senha errada fica no log, sem a senha tentada nem o e-mail")
  void falhaDeLoginRegistrada(CapturedOutput saida) {
    Leitor leitor = novoLeitor();

    assertThat(entrar(leitor.email(), SENHA_ERRADA).statusCode()).isEqualTo(401);

    assertThat(saida.getOut()).contains("NAO_AUTENTICADO (401)");
    assertThat(saida.getOut())
        .doesNotContain(SENHA_ERRADA)
        .doesNotContain(SENHA)
        .doesNotContain(leitor.email());
  }

  @Test
  @DisplayName("bloqueio por tentativas fica no log, sem identificar a conta")
  void bloqueioRegistrado(CapturedOutput saida) {
    Leitor leitor = novoLeitor();

    for (int tentativa = 0; tentativa < 6; tentativa++) {
      entrar(leitor.username(), SENHA_ERRADA);
    }

    assertThat(saida.getOut()).contains("Identidade bloqueada por tentativas sucessivas");
    assertThat(saida.getOut()).doesNotContain(SENHA_ERRADA).doesNotContain(leitor.username());
  }

  @Test
  @DisplayName("login e renovação bem-sucedidos não deixam senha nem token no log")
  void sessaoSemSegredoNoLog(CapturedOutput saida) {
    Leitor leitor = novoLeitor();

    HttpResponse<String> login = entrar(leitor.username(), SENHA);
    assertThat(login.statusCode()).isEqualTo(200);
    JsonNode sessao = objectMapper.readTree(login.body());
    String refreshToken = sessao.get("refreshToken").asString();
    HttpResponse<String> renovacao =
        postJson(
            "/auth/refresh",
            "{\"refreshToken\":\"" + refreshToken + "\"}",
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(renovacao.statusCode()).isEqualTo(200);
    JsonNode renovada = objectMapper.readTree(renovacao.body());

    assertThat(saida.getOut())
        .doesNotContain(SENHA)
        .doesNotContain(leitor.email())
        .doesNotContain(sessao.get("accessToken").asString())
        .doesNotContain(refreshToken)
        .doesNotContain(renovada.get("accessToken").asString())
        .doesNotContain(renovada.get("refreshToken").asString());
  }
}
