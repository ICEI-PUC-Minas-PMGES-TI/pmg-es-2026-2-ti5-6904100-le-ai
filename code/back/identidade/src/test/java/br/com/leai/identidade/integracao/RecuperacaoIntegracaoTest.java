package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

import br.com.leai.identidade.email.EmailNotificationService;
import br.com.leai.identidade.email.ResultadoDeEnvio;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.ObjectMapper;

/**
 * Recuperação de senha contra Postgres real (RF-AUT-04, RNF-SEC-10/28/30). O Brevo é trocado por
 * um mock: o que está em teste é o link que chega a ele, não o provedor.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class RecuperacaoIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";
  private static final String NOVA_SENHA = "outra-senha-comprida";
  private static final String PREFIXO_DO_LINK = ORIGEM_WEB + "/redefinir-senha#token=";

  @MockitoBean private EmailNotificationService email;

  @Autowired private JdbcTemplate jdbc;

  @Autowired private ObjectMapper objectMapper;

  @BeforeEach
  void provedorAceita() {
    Mockito.reset(email);
    given(email.enviarRecuperacaoSenha(anyString(), anyString(), anyString()))
        .willReturn(ResultadoDeEnvio.ACEITO);
  }

  private record Leitor(String username, String email) {}

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    String emailDoLeitor = "recupera." + s + "@exemplo.com";
    HttpResponse<String> cadastro =
        postJson(
            "/auth/register",
            """
            {"email":"%s","username":"recupera_%s","displayName":"Leitora",
             "dataNascimento":"1990-01-01","senha":"%s"}
            """
                .formatted(emailDoLeitor, s, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(cadastro.statusCode()).isEqualTo(201);
    return new Leitor("recupera_" + s, emailDoLeitor);
  }

  private HttpResponse<String> pedir(String emailPedido, String chave) {
    return postJson(
        "/auth/password/forgot",
        "{\"email\":\"" + emailPedido + "\"}",
        "Idempotency-Key",
        chave);
  }

  private HttpResponse<String> pedir(String emailPedido) {
    return pedir(emailPedido, UUID.randomUUID().toString());
  }

  private HttpResponse<String> redefinir(String token, String novaSenha, String chave) {
    return postJson(
        "/auth/password/reset",
        """
        {"token":"%s","novaSenha":"%s"}
        """
            .formatted(token, novaSenha),
        "Idempotency-Key",
        chave);
  }

  private HttpResponse<String> redefinir(String token) {
    return redefinir(token, NOVA_SENHA, UUID.randomUUID().toString());
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

  /** Espera o trabalho em segundo plano chegar ao Brevo e devolve o token do link. */
  private String tokenEnviadoPara(String destinatario) {
    ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
    verify(email, timeout(5000))
        .enviarRecuperacaoSenha(eq(destinatario), anyString(), link.capture());
    assertThat(link.getValue()).startsWith(PREFIXO_DO_LINK);
    return link.getValue().substring(PREFIXO_DO_LINK.length());
  }

  private static String sha256(String texto) throws Exception {
    return HexFormat.of()
        .formatHex(
            MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8)));
  }

  @Test
  @DisplayName("conta existente e inexistente recebem o mesmo 202 com o mesmo corpo")
  void respostaNaoRevelaConta() {
    Leitor leitor = novoLeitor();

    HttpResponse<String> existente = pedir(leitor.email());
    HttpResponse<String> inexistente = pedir("ninguem." + UUID.randomUUID() + "@exemplo.com");

    assertThat(existente.statusCode()).isEqualTo(202);
    assertThat(inexistente.statusCode()).isEqualTo(202);
    assertThat(existente.body())
        .isEqualTo(inexistente.body())
        .contains("Se o e-mail estiver cadastrado");
    tokenEnviadoPara(leitor.email());
  }

  @Test
  @DisplayName("e-mail sem conta não chega ao Brevo nem grava token")
  void semContaNaoEnvia() {
    String ninguem = "ninguem." + UUID.randomUUID() + "@exemplo.com";

    assertThat(pedir(ninguem).statusCode()).isEqualTo(202);

    verify(email, after(1500).never()).enviarRecuperacaoSenha(eq(ninguem), anyString(), anyString());
  }

  @Test
  @DisplayName("o link redefine a senha, vale uma vez, e o banco guarda só o hash de 1 hora")
  void linkRedefineUmaVez() throws Exception {
    Leitor leitor = novoLeitor();
    String refresh =
        objectMapper.readTree(entrar(leitor.username(), SENHA).body()).get("refreshToken").asString();

    pedir(leitor.email());
    String token = tokenEnviadoPara(leitor.email());

    assertThat(token).hasSize(43);
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM reset_token WHERE token_hash = ?"
                    + " AND expira_em <= now() + interval '1 hour'",
                Integer.class,
                sha256(token)))
        .isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM reset_token WHERE token_hash = ?", Integer.class, token))
        .isZero();

    HttpResponse<String> resposta = redefinir(token);
    assertThat(resposta.statusCode()).isEqualTo(204);
    assertThat(entrar(leitor.username(), SENHA).statusCode()).isEqualTo(401);
    assertThat(entrar(leitor.username(), NOVA_SENHA).statusCode()).isEqualTo(200);
    assertThat(
            postJson(
                    "/auth/refresh",
                    "{\"refreshToken\":\"" + refresh + "\"}",
                    "Idempotency-Key",
                    UUID.randomUUID().toString())
                .statusCode())
        .isEqualTo(401);

    HttpResponse<String> deNovo = redefinir(token, "terceira-senha-longa", UUID.randomUUID().toString());
    assertThat(deNovo.statusCode()).isEqualTo(410);
  }

  @Test
  @DisplayName("link vencido, desconhecido e já usado são o mesmo 410 com a mesma mensagem")
  void linkInvalidoEhSempreIgual() throws Exception {
    Leitor leitor = novoLeitor();
    UUID usuarioId =
        jdbc.queryForObject(
            "SELECT id FROM usuario WHERE username = ?", UUID.class, leitor.username());
    String vencido = "token-vencido-" + UUID.randomUUID();
    jdbc.update(
        "INSERT INTO reset_token (usuario_id, token_hash, criado_em, expira_em)"
            + " VALUES (?, ?, now() - interval '2 hours', now() - interval '1 hour')",
        usuarioId,
        sha256(vencido));

    HttpResponse<String> respostaVencido = redefinir(vencido);
    HttpResponse<String> respostaDesconhecido = redefinir("token-que-nunca-existiu");

    assertThat(respostaVencido.statusCode()).isEqualTo(410);
    assertThat(respostaDesconhecido.statusCode()).isEqualTo(410);
    String mensagem = objectMapper.readTree(respostaVencido.body()).get("mensagem").asString();
    assertThat(objectMapper.readTree(respostaDesconhecido.body()).get("mensagem").asString())
        .isEqualTo(mensagem)
        .contains("vale por 1 hora");
    assertThat(entrar(leitor.username(), SENHA).statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("redefinir com um link consome os outros links ainda válidos da conta")
  void redefinirConsomeOsOutrosLinks() {
    Leitor leitor = novoLeitor();
    pedir(leitor.email());
    String primeiro = tokenEnviadoPara(leitor.email());
    Mockito.clearInvocations(email);
    pedir(leitor.email());
    String segundo = tokenEnviadoPara(leitor.email());

    assertThat(redefinir(segundo).statusCode()).isEqualTo(204);
    assertThat(redefinir(primeiro).statusCode()).isEqualTo(410);
  }

  @Test
  @DisplayName("mesmo link em paralelo, com chaves diferentes: só uma redefinição passa")
  void corridaDoMesmoLink() throws Exception {
    Leitor leitor = novoLeitor();
    pedir(leitor.email());
    String token = tokenEnviadoPara(leitor.email());
    int concorrentes = 5;
    CountDownLatch largada = new CountDownLatch(1);

    List<Integer> status = new ArrayList<>();
    try (ExecutorService executor = Executors.newFixedThreadPool(concorrentes)) {
      List<Future<HttpResponse<String>>> futuros = new ArrayList<>();
      for (int i = 0; i < concorrentes; i++) {
        futuros.add(
            executor.submit(
                () -> {
                  largada.await();
                  return redefinir(token);
                }));
      }
      largada.countDown();
      for (Future<HttpResponse<String>> futuro : futuros) {
        status.add(futuro.get().statusCode());
      }
    }

    assertThat(status).containsOnlyOnce(204);
    assertThat(status.stream().filter(s -> s == 410)).hasSize(concorrentes - 1);
  }

  @Test
  @DisplayName("a mesma Idempotency-Key não reenvia o e-mail")
  void replayNaoReenvia() {
    Leitor leitor = novoLeitor();
    String chave = UUID.randomUUID().toString();

    assertThat(pedir(leitor.email(), chave).statusCode()).isEqualTo(202);
    tokenEnviadoPara(leitor.email());
    Mockito.clearInvocations(email);

    assertThat(pedir(leitor.email(), chave).statusCode()).isEqualTo(202);
    verify(email, after(1500).never())
        .enviarRecuperacaoSenha(eq(leitor.email()), anyString(), anyString());
  }

  @Test
  @DisplayName("acima de 5 links na hora, o pedido responde 202 e não envia")
  void tetoDeLinksPorHora() {
    Leitor leitor = novoLeitor();
    for (int i = 0; i < 5; i++) {
      pedir(leitor.email());
    }
    verify(email, timeout(5000).times(5))
        .enviarRecuperacaoSenha(eq(leitor.email()), anyString(), anyString());
    Mockito.clearInvocations(email);

    assertThat(pedir(leitor.email()).statusCode()).isEqualTo(202);
    verify(email, after(1500).never())
        .enviarRecuperacaoSenha(eq(leitor.email()), anyString(), anyString());
  }

  @Test
  @DisplayName("senha nova comum é 400 e não consome o link")
  void senhaComumNaoConsome() {
    Leitor leitor = novoLeitor();
    pedir(leitor.email());
    String token = tokenEnviadoPara(leitor.email());

    HttpResponse<String> comum = redefinir(token, "senha123", UUID.randomUUID().toString());
    assertThat(comum.statusCode()).isEqualTo(400);
    assertThat(comum.body()).contains("Essa senha é muito comum.");

    assertThat(redefinir(token).statusCode()).isEqualTo(204);
  }

  @Test
  @DisplayName("forgot e reset são públicos: sem Authorization não viram 401")
  void rotasPublicas() {
    assertThat(pedir("ninguem@exemplo.com").statusCode()).isEqualTo(202);
    assertThat(redefinir("token-que-nunca-existiu").statusCode()).isEqualTo(410);
    verify(email, never()).enviarRecuperacaoSenha(eq("ninguem@exemplo.com"), anyString(), anyString());
  }
}
