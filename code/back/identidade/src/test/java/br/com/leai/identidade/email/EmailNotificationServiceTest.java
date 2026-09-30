package br.com.leai.identidade.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withTooManyRequests;

import br.com.leai.identidade.config.AppProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class EmailNotificationServiceTest {
  private static final String URL = "https://api.brevo.com/v3/smtp/email";

  private MockRestServiceServer servidor;
  private EmailNotificationService servico;

  @BeforeEach
  void montar() {
    RestClient.Builder construtor = RestClient.builder().baseUrl("https://api.brevo.com");
    servidor = MockRestServiceServer.bindTo(construtor).build();
    RestClient cliente = construtor.build();
    servico = new EmailNotificationService(propriedades("api-key-teste", "contato@leai.example"), cliente);
  }

  @AfterEach
  void verificarRequisicoes() {
    servidor.verify();
  }

  @Test
  @DisplayName("envia o link de recuperação ao Brevo")
  void enviaLinkDeRecuperacao() {
    servidor
        .expect(requestTo(URL))
        .andExpect(method(POST))
        .andExpect(header("api-key", "api-key-teste"))
        .andExpect(jsonPath("$.sender.email").value("contato@leai.example"))
        .andExpect(jsonPath("$.to[0].email").value("leitor@example.com"))
        .andExpect(jsonPath("$.subject").value("Recuperação de senha | Lê Ai"))
        .andExpect(jsonPath("$.textContent").value(org.hamcrest.Matchers.containsString("token-123")))
        .andRespond(withSuccess("{\"messageId\":\"teste\"}", MediaType.APPLICATION_JSON));

    servico.enviarRecuperacaoSenha(
        "leitor@example.com", "Leitor", "https://leai.example/reset?token=token-123");
  }

  @Test
  @DisplayName("não propaga falha do Brevo para o fluxo de recuperação")
  void naoPropagaFalhaDoProvedor() {
    servidor.expect(requestTo(URL)).andRespond(withServerError());

    assertThatCode(
            () ->
                servico.enviarRecuperacaoSenha(
                    "leitor@example.com", "Leitor", "https://leai.example/reset?token=token-123"))
        .doesNotThrowAnyException();
  }

  @Test
  @DisplayName("classifica o desfecho: 2xx aceito, 5xx e 429 temporários, outro 4xx definitivo")
  void classificaODesfecho() {
    servidor.expect(requestTo(URL)).andRespond(withSuccess());
    servidor.expect(requestTo(URL)).andRespond(withServerError());
    servidor.expect(requestTo(URL)).andRespond(withTooManyRequests());
    servidor.expect(requestTo(URL)).andRespond(withBadRequest());

    String link = "https://leai.example/redefinir-senha#token=token-123";
    assertThat(servico.enviarRecuperacaoSenha("leitor@example.com", "Leitor", link))
        .isEqualTo(ResultadoDeEnvio.ACEITO);
    assertThat(servico.enviarRecuperacaoSenha("leitor@example.com", "Leitor", link))
        .isEqualTo(ResultadoDeEnvio.FALHA_TEMPORARIA);
    assertThat(servico.enviarRecuperacaoSenha("leitor@example.com", "Leitor", link))
        .isEqualTo(ResultadoDeEnvio.FALHA_TEMPORARIA);
    assertThat(servico.enviarRecuperacaoSenha("leitor@example.com", "Leitor", link))
        .isEqualTo(ResultadoDeEnvio.FALHA_DEFINITIVA);
  }

  @Test
  @DisplayName("não chama o Brevo quando as credenciais estão ausentes")
  void naoChamaSemConfiguracao() {
    servico = new EmailNotificationService(propriedades("", "contato@leai.example"), clienteSemServidor());

    servico.enviarRecuperacaoSenha(
        "leitor@example.com", "Leitor", "https://leai.example/reset?token=token-123");
  }

  private RestClient clienteSemServidor() {
    return RestClient.builder().baseUrl("https://api.brevo.com").build();
  }

  private static AppProperties propriedades(String apiKey, String remetente) {
    return new AppProperties(
        "identidade",
        "identidade",
        "jdbc:postgresql://localhost:5432/teste",
        "http://localhost:5173",
        null,
        apiKey,
        null,
        "smtp-relay.brevo.com",
        587,
        remetente,
        "Lê Ai",
        null,
        null,
        null);
  }
}
