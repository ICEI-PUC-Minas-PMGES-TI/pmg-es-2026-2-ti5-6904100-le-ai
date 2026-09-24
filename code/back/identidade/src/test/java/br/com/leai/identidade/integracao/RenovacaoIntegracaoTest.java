package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Token de renovação contra Postgres real (RF-AUT-03, RNF-SEC-30): rotação atômica, detecção de
 * reuso, expiração e a fronteira entre reuso e repetição da mesma requisição.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class RenovacaoIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";

  @Autowired private JdbcTemplate jdbc;

  @Autowired private ObjectMapper objectMapper;

  /** Cadastra um leitor novo e devolve o username. */
  private String novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    HttpResponse<String> cadastro =
        postJson(
            "/auth/register",
            """
            {"email":"renova.%1$s@exemplo.com","username":"renova_%1$s","displayName":"Leitora",
             "dataNascimento":"1990-01-01","senha":"%2$s"}
            """
                .formatted(s, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(cadastro.statusCode()).isEqualTo(201);
    return "renova_" + s;
  }

  private JsonNode entrar(String username) {
    HttpResponse<String> login =
        postJson(
            "/auth/login",
            """
            {"identificador":"%s","senha":"%s"}
            """
                .formatted(username, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(login.statusCode()).isEqualTo(200);
    return objectMapper.readTree(login.body());
  }

  /** Cadastra um leitor novo e devolve a sessão do primeiro login. */
  private JsonNode leitorComSessao() {
    return entrar(novoLeitor());
  }

  private HttpResponse<String> renovar(String refreshToken, String chave) {
    return postJson(
        "/auth/refresh",
        "{\"refreshToken\":\"" + refreshToken + "\"}",
        "Idempotency-Key",
        chave);
  }

  private HttpResponse<String> renovar(String refreshToken) {
    return renovar(refreshToken, UUID.randomUUID().toString());
  }

  private String refreshDe(HttpResponse<String> resposta) {
    return objectMapper.readTree(resposta.body()).get("refreshToken").asString();
  }

  private static String sha256(String texto) throws Exception {
    return HexFormat.of()
        .formatHex(
            MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8)));
  }

  @Test
  @DisplayName("login devolve refresh e o banco guarda só o SHA-256 dele")
  void loginEmiteRefreshGuardadoComoHash() throws Exception {
    JsonNode sessao = leitorComSessao();
    String refresh = sessao.get("refreshToken").asString();

    assertThat(refresh).hasSize(43);
    assertThat(sessao.get("accessToken").asString()).isNotBlank();
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM refresh_token WHERE token_hash = ? AND revogado = false"
                    + " AND expira_em > now() + interval '29 days'",
                Integer.class,
                sha256(refresh)))
        .isEqualTo(1);
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM refresh_token WHERE token_hash = ?", Integer.class, refresh))
        .isZero();
  }

  @Test
  @DisplayName("renovar emite par novo e a cadeia continua: cada token novo renova de novo")
  void rotacaoEmCadeia() {
    String primeiro = leitorComSessao().get("refreshToken").asString();

    HttpResponse<String> r1 = renovar(primeiro);
    assertThat(r1.statusCode()).isEqualTo(200);
    String segundo = refreshDe(r1);
    assertThat(segundo).isNotEqualTo(primeiro);

    HttpResponse<String> r2 = renovar(segundo);
    assertThat(r2.statusCode()).isEqualTo(200);
    assertThat(refreshDe(r2)).isNotEqualTo(segundo);
  }

  @Test
  @DisplayName("token já rotacionado reapresentado é 401 e derruba todas as renovações do usuário")
  void reusoRevogaTudo() {
    String primeiro = leitorComSessao().get("refreshToken").asString();
    String segundo = refreshDe(renovar(primeiro));

    HttpResponse<String> reuso = renovar(primeiro);
    assertThat(reuso.statusCode()).isEqualTo(401);
    assertThat(reuso.body()).contains("Sua sessão expirou. Entre novamente.");

    // O legítimo também caiu: não há como saber quem é o dono e quem roubou.
    assertThat(renovar(segundo).statusCode()).isEqualTo(401);
  }

  @Test
  @DisplayName("token desconhecido é 401 e não afeta a sessão de ninguém")
  void tokenDesconhecido() {
    String valido = leitorComSessao().get("refreshToken").asString();

    assertThat(renovar("token-que-nunca-existiu").statusCode()).isEqualTo(401);
    assertThat(renovar(valido).statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("token expirado é 401 com a mesma mensagem")
  void tokenExpirado() throws Exception {
    JsonNode sessao = leitorComSessao();
    UUID usuarioId =
        jdbc.queryForObject(
            "SELECT usuario_id FROM refresh_token WHERE token_hash = ?",
            UUID.class,
            sha256(sessao.get("refreshToken").asString()));
    String expirado = "token-expirado-" + UUID.randomUUID();
    jdbc.update(
        "INSERT INTO refresh_token (usuario_id, token_hash, criado_em, expira_em)"
            + " VALUES (?, ?, now() - interval '31 days', now() - interval '1 day')",
        usuarioId,
        sha256(expirado));

    HttpResponse<String> resposta = renovar(expirado);

    assertThat(resposta.statusCode()).isEqualTo(401);
    assertThat(resposta.body()).contains("Sua sessão expirou. Entre novamente.");
  }

  @Test
  @DisplayName("repetir a mesma Idempotency-Key devolve a mesma sessão e não conta como reuso")
  void replayNaoEhReuso() {
    String refresh = leitorComSessao().get("refreshToken").asString();
    String chave = UUID.randomUUID().toString();

    HttpResponse<String> primeira = renovar(refresh, chave);
    HttpResponse<String> repetida = renovar(refresh, chave);

    assertThat(repetida.statusCode()).isEqualTo(200);
    assertThat(repetida.body()).isEqualTo(primeira.body());
    assertThat(renovar(refreshDe(primeira)).statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("mesma chave em paralelo: uma rotação, todas recebem a mesma sessão, nada é revogado")
  void corridaComMesmaChave() throws Exception {
    String refresh = leitorComSessao().get("refreshToken").asString();
    String chave = UUID.randomUUID().toString();
    int concorrentes = 5;
    CountDownLatch largada = new CountDownLatch(1);

    List<HttpResponse<String>> respostas = new ArrayList<>();
    try (ExecutorService executor = Executors.newFixedThreadPool(concorrentes)) {
      List<Future<HttpResponse<String>>> futuros = new ArrayList<>();
      for (int i = 0; i < concorrentes; i++) {
        futuros.add(
            executor.submit(
                () -> {
                  largada.await();
                  return renovar(refresh, chave);
                }));
      }
      largada.countDown();
      for (Future<HttpResponse<String>> futuro : futuros) {
        respostas.add(futuro.get());
      }
    }

    assertThat(respostas).allSatisfy(r -> assertThat(r.statusCode()).isEqualTo(200));
    assertThat(respostas.stream().map(HttpResponse::body).distinct()).hasSize(1);
    assertThat(renovar(refreshDe(respostas.getFirst())).statusCode()).isEqualTo(200);
  }

  private HttpResponse<String> sair(String refreshToken, String chave) {
    return postJson(
        "/auth/logout",
        "{\"refreshToken\":\"" + refreshToken + "\"}",
        "Idempotency-Key",
        chave);
  }

  @Test
  @DisplayName("logout responde 204 e o token deixa de renovar")
  void logoutRevogaOToken() {
    String refresh = leitorComSessao().get("refreshToken").asString();

    HttpResponse<String> resposta = sair(refresh, UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(204);
    assertThat(resposta.body()).isEmpty();
    assertThat(renovar(refresh).statusCode()).isEqualTo(401);
  }

  @Test
  @DisplayName("logout repetido, com a mesma chave ou outra, e de token desconhecido é sempre 204")
  void logoutEhIdempotenteENaoRevelaEstado() {
    String refresh = leitorComSessao().get("refreshToken").asString();
    String chave = UUID.randomUUID().toString();

    assertThat(sair(refresh, chave).statusCode()).isEqualTo(204);
    assertThat(sair(refresh, chave).statusCode()).isEqualTo(204);
    assertThat(sair(refresh, UUID.randomUUID().toString()).statusCode()).isEqualTo(204);
    assertThat(sair("token-que-nunca-existiu", UUID.randomUUID().toString()).statusCode())
        .isEqualTo(204);
  }

  @Test
  @DisplayName("logout encerra só a sessão do token: o outro aparelho do mesmo usuário continua")
  void logoutNaoDerrubaOutrasSessoes() {
    String username = novoLeitor();
    String celular = entrar(username).get("refreshToken").asString();
    String navegador = entrar(username).get("refreshToken").asString();

    assertThat(sair(celular, UUID.randomUUID().toString()).statusCode()).isEqualTo(204);
    // Logout de token já revogado não conta como reuso e não derruba o navegador.
    assertThat(sair(celular, UUID.randomUUID().toString()).statusCode()).isEqualTo(204);

    assertThat(renovar(navegador).statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("o recibo da renovação guarda a sessão cifrada, sem token em claro")
  void reciboCifrado() {
    String refresh = leitorComSessao().get("refreshToken").asString();
    String chave = UUID.randomUUID().toString();

    HttpResponse<String> resposta = renovar(refresh, chave);
    JsonNode sessao = objectMapper.readTree(resposta.body());

    String recibo =
        jdbc.queryForObject(
            "SELECT resposta::text FROM idempotencia_identidade WHERE chave = ?",
            String.class,
            chave);
    assertThat(recibo)
        .contains("\"cifrado\"")
        .doesNotContain(sessao.get("refreshToken").asString())
        .doesNotContain(sessao.get("accessToken").asString());
  }
}
