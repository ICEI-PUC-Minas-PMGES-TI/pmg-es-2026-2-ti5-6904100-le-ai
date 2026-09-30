package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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

/**
 * {@code Idempotency-Key} no cadastro contra Postgres real (RNF-ERR-04, RNF-TST-02): replay,
 * conflito, corrida entre duas requisições com a mesma chave e o que o recibo guarda.
 *
 * <p>A corrida só se prova com banco de verdade: quem decide o vencedor é o índice único, e é a
 * espera do Postgres pelo commit da vencedora que deixa o recibo visível para a perdedora.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class IdempotenciaCadastroIntegracaoTest extends IntegracaoComPostgres {

  private static final String DATA_NASCIMENTO = "1994-05-20";

  @Autowired private JdbcTemplate jdbc;

  private static String cadastro(String sufixo, String displayName) {
    return """
        {
          "email": "leitor.%1$s@exemplo.com",
          "username": "leitor_%1$s",
          "displayName": "%2$s",
          "dataNascimento": "%3$s",
          "senha": "senha-bem-comprida"
        }
        """
        .formatted(sufixo, displayName, DATA_NASCIMENTO);
  }

  private static String sufixo() {
    return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
  }

  private int usuariosCom(String sufixo) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM usuario WHERE email = ?",
        Integer.class,
        "leitor." + sufixo + "@exemplo.com");
  }

  @Test
  @DisplayName("sem Idempotency-Key o cadastro é 400 e não cria conta (fechamento de F-AUT)")
  void semChaveRecusa() {
    String s = sufixo();

    HttpResponse<String> resposta = postJson("/auth/register", cadastro(s, "Leitora"));

    assertThat(resposta.statusCode()).isEqualTo(400);
    assertThat(resposta.body()).contains("REQUISICAO_INVALIDA");
    assertThat(usuariosCom(s)).isZero();
  }

  @Test
  @DisplayName("mesma chave e mesmo payload devolvem o 201 original sem criar segunda conta")
  void replayDevolveRespostaOriginal() {
    String s = sufixo();
    String chave = UUID.randomUUID().toString();

    HttpResponse<String> primeira =
        postJson("/auth/register", cadastro(s, "Leitora"), "Idempotency-Key", chave);
    HttpResponse<String> repetida =
        postJson("/auth/register", cadastro(s, "Leitora"), "Idempotency-Key", chave);

    assertThat(primeira.statusCode()).isEqualTo(201);
    assertThat(repetida.statusCode()).isEqualTo(201);
    assertThat(repetida.body()).isEqualTo(primeira.body());
    assertThat(usuariosCom(s)).isEqualTo(1);
  }

  @Test
  @DisplayName("mesma chave com payload diferente é 409 e não cadastra de novo")
  void chaveReusadaComOutroPayloadVira409() {
    String s = sufixo();
    String chave = UUID.randomUUID().toString();

    postJson("/auth/register", cadastro(s, "Leitora"), "Idempotency-Key", chave);
    HttpResponse<String> conflito =
        postJson("/auth/register", cadastro(s, "Outro nome"), "Idempotency-Key", chave);

    assertThat(conflito.statusCode()).isEqualTo(409);
    assertThat(conflito.body()).contains("\"codigo\":\"CONFLITO\"").contains("idempotência");
    assertThat(usuariosCom(s)).isEqualTo(1);
  }

  @Test
  @DisplayName("requisições simultâneas com a mesma chave criam uma conta e respondem igual")
  void corridaComMesmaChaveCriaUmaConta() throws Exception {
    String s = sufixo();
    String chave = UUID.randomUUID().toString();
    int concorrentes = 6;
    CountDownLatch largada = new CountDownLatch(1);

    List<Future<HttpResponse<String>>> futuros = new ArrayList<>();
    try (ExecutorService executor = Executors.newFixedThreadPool(concorrentes)) {
      for (int i = 0; i < concorrentes; i++) {
        futuros.add(
            executor.submit(
                () -> {
                  largada.await();
                  return postJson(
                      "/auth/register", cadastro(s, "Leitora"), "Idempotency-Key", chave);
                }));
      }
      largada.countDown();

      List<HttpResponse<String>> respostas = new ArrayList<>();
      for (Future<HttpResponse<String>> futuro : futuros) {
        respostas.add(futuro.get());
      }

      assertThat(respostas).allSatisfy(r -> assertThat(r.statusCode()).isEqualTo(201));
      assertThat(respostas.stream().map(HttpResponse::body).distinct()).hasSize(1);
    }
    assertThat(usuariosCom(s)).isEqualTo(1);
  }

  @Test
  @DisplayName("o recibo guarda HMAC do payload e a resposta pública, nunca a senha")
  void reciboNaoGuardaSenha() {
    String s = sufixo();
    String chave = UUID.randomUUID().toString();

    postJson("/auth/register", cadastro(s, "Leitora"), "Idempotency-Key", chave);

    Map<String, Object> recibo =
        jdbc.queryForMap(
            "SELECT operacao, payload_hash, resposta::text AS resposta, status_http"
                + " FROM idempotencia_identidade WHERE chave = ?",
            chave);
    assertThat(recibo.get("operacao")).isEqualTo("cadastrarUsuario");
    assertThat(recibo.get("status_http")).isEqualTo(201);
    assertThat((String) recibo.get("payload_hash")).startsWith("hmac-sha256:");
    assertThat((String) recibo.get("resposta"))
        .doesNotContain("senha")
        .doesNotContain("senha-bem-comprida")
        .doesNotContain("@exemplo.com");
  }

  @Test
  @DisplayName("preflight de CORS libera Idempotency-Key para a origem da web")
  void preflightLiberaIdempotencyKey() {
    HttpResponse<String> resposta =
        enviar(
            HttpRequest.newBuilder(uri("/auth/register"))
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .header("Origin", ORIGEM_WEB)
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type,idempotency-key")
                .build());

    assertThat(resposta.statusCode()).isEqualTo(200);
    assertThat(resposta.headers().firstValue("Access-Control-Allow-Headers").orElse(""))
        .containsIgnoringCase("idempotency-key");
  }
}
