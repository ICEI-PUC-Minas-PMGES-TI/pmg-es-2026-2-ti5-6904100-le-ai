package br.com.leai.identidade.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.verify;

import br.com.leai.identidade.email.EmailNotificationService;
import br.com.leai.identidade.integracao.IntegracaoComPostgres;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Conta administradora de ambiente contra Postgres real (RF-AUT-08, RNF-SEC-31). Fica no pacote
 * {@code auth}, e não em {@code integracao}, para chamar o provisionamento direto e simular a
 * rotação da senha sem reiniciar o contexto.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class AdminIntegracaoTest extends IntegracaoComPostgres {

  private static final String EMAIL = "admin@leai.example";
  private static final String SENHA = "frase-longa-do-admin-2026";

  @MockitoBean private EmailNotificationService email;

  @Autowired private ProvisionamentoDoAdmin provisionamento;

  @Autowired private ObjectMapper objectMapper;

  /**
   * A base zera {@code leai.admin-*} e o {@code @DynamicPropertySource} dela vence o de uma
   * subclasse, então o arranque sobe sem admin. O teste chama o mesmo método que o arranque
   * chama; repetir com a mesma senha não muda nada, e isso também é testado.
   */
  @BeforeEach
  void provisionar() {
    provisionamento.provisionar(EMAIL, SENHA);
  }

  private HttpResponse<String> entrar(String identificador, String senha) {
    return postJson(
        "/auth/login",
        """
        {"identificador":"%s","senha":"%s"}
        """
            .formatted(identificador, senha));
  }

  private JsonNode sessao(String identificador, String senha) {
    HttpResponse<String> login = entrar(identificador, senha);
    assertThat(login.statusCode()).isEqualTo(200);
    return objectMapper.readTree(login.body());
  }

  private String papelDo(JsonNode sessao) {
    String carga = sessao.get("accessToken").asString().split("\\.")[1];
    String json = new String(Base64.getUrlDecoder().decode(carga), StandardCharsets.UTF_8);
    return objectMapper.readTree(json).get("papel").asString();
  }

  private HttpResponse<String> renovar(String refreshToken) {
    return postJson(
        "/auth/refresh",
        "{\"refreshToken\":\"" + refreshToken + "\"}",
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  @Test
  @DisplayName("admin entra pelo mesmo login, por e-mail ou username, com papel admin")
  void adminEntraComPapel() {
    assertThat(papelDo(sessao(EMAIL, SENHA))).isEqualTo("admin");
    assertThat(papelDo(sessao("admin", SENHA))).isEqualTo("admin");

    // A renovação mantém o papel: ela emite um token novo pelo mesmo caminho do login.
    HttpResponse<String> renovada = renovar(sessao(EMAIL, SENHA).get("refreshToken").asString());
    assertThat(papelDo(objectMapper.readTree(renovada.body()))).isEqualTo("admin");
  }

  @Test
  @DisplayName("leitor comum recebe papel leitor")
  void leitorTemPapelLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    postJson(
        "/auth/register",
        """
        {"email":"leitor.%1$s@exemplo.com","username":"leitor_%1$s","displayName":"Leitora",
         "dataNascimento":"1990-01-01","senha":"senha-bem-comprida"}
        """
            .formatted(s));

    assertThat(papelDo(sessao("leitor_" + s, "senha-bem-comprida"))).isEqualTo("leitor");
  }

  @Test
  @DisplayName("admin não troca senha pela API: 403")
  void adminNaoTrocaSenha() {
    String accessToken = sessao(EMAIL, SENHA).get("accessToken").asString();

    HttpResponse<String> resposta =
        postJson(
            "/auth/password/change",
            """
            {"senhaAtual":"%s","novaSenha":"outra-frase-bem-longa"}
            """
                .formatted(SENHA),
            "Authorization",
            "Bearer " + accessToken,
            "Idempotency-Key",
            UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(403);
    assertThat(entrar(EMAIL, SENHA).statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("recuperação para o e-mail do admin responde 202 e não envia link")
  void adminNaoRecebeLink() {
    HttpResponse<String> resposta =
        postJson(
            "/auth/password/forgot",
            "{\"email\":\"" + EMAIL + "\"}",
            "Idempotency-Key",
            UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(202);
    verify(email, after(1500).never()).enviarRecuperacaoSenha(anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("trocar a senha do ambiente troca o hash e derruba as renovações; repetir não muda nada")
  void rotacaoPeloAmbiente() {
    String refresh = sessao(EMAIL, SENHA).get("refreshToken").asString();
    String novaSenha = "nova-frase-longa-do-admin";
    try {
      provisionamento.provisionar(EMAIL, novaSenha);

      assertThat(entrar(EMAIL, SENHA).statusCode()).isEqualTo(401);
      assertThat(renovar(refresh).statusCode()).isEqualTo(401);
      String outroRefresh = sessao(EMAIL, novaSenha).get("refreshToken").asString();

      // Mesma senha de novo, como num reinício sem mudança: a sessão ativa continua.
      provisionamento.provisionar(EMAIL, novaSenha);
      assertThat(renovar(outroRefresh).statusCode()).isEqualTo(200);
    } finally {
      provisionamento.provisionar(EMAIL, SENHA);
    }
  }

  @Test
  @DisplayName("configuração pela metade não sobe")
  void configuracaoPelaMetade() {
    assertThatThrownBy(() -> provisionamento.provisionar(EMAIL, ""))
        .isInstanceOf(IllegalStateException.class);
    assertThatThrownBy(() -> provisionamento.provisionar("", SENHA))
        .isInstanceOf(IllegalStateException.class);
  }
}
