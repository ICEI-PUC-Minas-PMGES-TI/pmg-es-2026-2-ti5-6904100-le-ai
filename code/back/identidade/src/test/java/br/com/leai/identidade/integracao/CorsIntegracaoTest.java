package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/**
 * CORS restrito às origens conhecidas (RNF-SEC-21), pelo HTTP de verdade. A lista dos testes tem
 * só {@link #ORIGEM_WEB}. O preflight da origem aceita está em {@code
 * IdempotenciaCadastroIntegracaoTest}; aqui ficam a recusa, na requisição e no preflight, e a
 * requisição comum da origem aceita.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class CorsIntegracaoTest extends IntegracaoComPostgres {

  private static final String ORIGEM_ESTRANHA = "https://invasor.exemplo.com";

  private HttpResponse<String> preflight(String caminho, String origem, String metodo) {
    return enviar(
        HttpRequest.newBuilder(uri(caminho))
            .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
            .header("Origin", origem)
            .header("Access-Control-Request-Method", metodo)
            .header("Access-Control-Request-Headers", "authorization,content-type,idempotency-key")
            .build());
  }

  private HttpResponse<String> login(String origem) {
    return enviar(
        HttpRequest.newBuilder(uri("/auth/login"))
            .header("Content-Type", "application/json")
            .header("Origin", origem)
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .POST(
                HttpRequest.BodyPublishers.ofString(
                    "{\"identificador\":\"ninguem_cors\",\"senha\":\"senha-bem-comprida\"}"))
            .build());
  }

  private static void semCabecalhoDeCors(HttpResponse<String> resposta) {
    assertThat(resposta.headers().firstValue("Access-Control-Allow-Origin")).isEmpty();
    assertThat(resposta.headers().firstValue("Access-Control-Allow-Credentials")).isEmpty();
  }

  @Test
  @DisplayName("preflight de origem fora da lista é 403, sem Access-Control-Allow-Origin")
  void preflightDeOrigemEstranha() {
    HttpResponse<String> resposta = preflight("/me/conta", ORIGEM_ESTRANHA, "DELETE");

    assertThat(resposta.statusCode()).isEqualTo(403);
    semCabecalhoDeCors(resposta);
    assertThat(resposta.body()).contains("\"codigo\":\"ACESSO_NEGADO\"").contains("correlationId");
  }

  @Test
  @DisplayName("requisição de origem fora da lista é 403 no corpo de erro padrão e não chega à rota")
  void requisicaoDeOrigemEstranha() {
    HttpResponse<String> resposta = login(ORIGEM_ESTRANHA);

    // Credencial inexistente daria 401 se a requisição chegasse ao login.
    assertThat(resposta.statusCode()).isEqualTo(403);
    semCabecalhoDeCors(resposta);
    assertThat(resposta.body()).contains("\"codigo\":\"ACESSO_NEGADO\"").contains("correlationId");
  }

  @Test
  @DisplayName("requisição da origem da lista recebe Access-Control-Allow-Origin com a própria origem")
  void requisicaoDaOrigemAceita() {
    HttpResponse<String> resposta = login(ORIGEM_WEB);

    assertThat(resposta.statusCode()).isEqualTo(401);
    assertThat(resposta.headers().firstValue("Access-Control-Allow-Origin")).contains(ORIGEM_WEB);
  }

  @Test
  @DisplayName("origem parecida com a da lista também é recusada: a comparação é exata, sem curinga")
  void origemParecida() {
    List<String> parecidas =
        List.of(
            "http://localhost:5173.invasor.com",
            "https://localhost:5173",
            "http://localhost:5174",
            "http://sub.localhost:5173",
            "null");

    for (String origem : parecidas) {
      HttpResponse<String> resposta = preflight("/auth/login", origem, "POST");
      assertThat(resposta.statusCode()).as(origem).isEqualTo(403);
      semCabecalhoDeCors(resposta);
    }
  }
}
