package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * A janela de recuperação de 30 dias (F-CONTA-2, RN-23.2 a 23.4 e 23.6), no que o {@code
 * ExclusaoDeContaIntegracaoTest} não confere: o e-mail reservado, a validade do acesso de
 * recuperação, a auditoria e a outbox do cancelamento, a busca e o 401 e o 400 próprios das duas
 * rotas da conta (RNF-SEC-01).
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
@ExtendWith(OutputCaptureExtension.class)
class JanelaDeExclusaoIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";

  /** O mesmo {@code leai.jwt-secret} que a base registra. */
  private static final String JWT_SECRET = "segredo-de-integracao-com-32-caracteres";

  @Autowired private ObjectMapper objectMapper;
  @Autowired private JdbcTemplate jdbc;

  private record Leitor(String email, String username, UUID id) {}

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    String email = "janela." + s + "@exemplo.com";
    String username = "janela_" + s;
    HttpResponse<String> cadastro = cadastrar(email, username);
    assertThat(cadastro.statusCode()).isEqualTo(201);
    UUID id = UUID.fromString(objectMapper.readTree(cadastro.body()).get("id").asString());
    return new Leitor(email, username, id);
  }

  private HttpResponse<String> cadastrar(String email, String username) {
    return postJson(
        "/auth/register",
        """
        {"email":"%s","username":"%s","displayName":"Leitora",
         "dataNascimento":"1990-01-01","senha":"%s"}
        """
            .formatted(email, username, SENHA),
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  private JsonNode login(String username) {
    HttpResponse<String> resposta =
        postJson(
            "/auth/login",
            "{\"identificador\":\"" + username + "\",\"senha\":\"" + SENHA + "\"}",
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(resposta.statusCode()).isEqualTo(200);
    return objectMapper.readTree(resposta.body());
  }

  private HttpRequest.Builder pedidoDeExclusao() {
    return HttpRequest.newBuilder(uri("/me/conta"))
        .header("Content-Type", "application/json")
        .method(
            "DELETE",
            HttpRequest.BodyPublishers.ofString(
                "{\"senha\":\"" + SENHA + "\",\"confirmacao\":true}"));
  }

  /** Pede a exclusão e devolve o acesso de recuperação do login seguinte. */
  private String pedirExclusao(Leitor leitor) {
    String sessao = login(leitor.username()).get("accessToken").asString();
    HttpResponse<String> resposta =
        enviar(
            pedidoDeExclusao()
                .header("Authorization", "Bearer " + sessao)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .build());
    assertThat(resposta.statusCode()).isEqualTo(202);
    JsonNode acesso = login(leitor.username());
    assertThat(acesso.get("tipo").asString()).isEqualTo("recuperacao_exclusao");
    return acesso.get("accessToken").asString();
  }

  private HttpResponse<String> cancelar(String token) {
    return postJson(
        "/me/conta/cancelar-exclusao",
        "",
        "Authorization",
        "Bearer " + token,
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  private boolean pendente(UUID usuarioId) {
    return jdbc.queryForObject(
        "SELECT exclusao_solicitada_em IS NOT NULL FROM usuario WHERE id = ?",
        Boolean.class,
        usuarioId);
  }

  private int eventosNaOutbox() {
    return jdbc.queryForObject("SELECT count(*) FROM outbox_identidade", Integer.class);
  }

  /** A mesma derivação do {@code TokenDeRecuperacao}: HMAC do JWT_SECRET sobre o rótulo v1. */
  private static SecretKey chaveDeRecuperacao() throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(JWT_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    byte[] derivada =
        mac.doFinal("leai-identidade/recuperacao-exclusao/v1".getBytes(StandardCharsets.UTF_8));
    return new SecretKeySpec(derivada, "HmacSHA256");
  }

  private static String acessoDeRecuperacao(Leitor leitor, Instant emitidoEm) throws Exception {
    JwtClaimsSet reivindicacoes =
        JwtClaimsSet.builder()
            .issuer("identidade")
            .subject(leitor.id().toString())
            .issuedAt(emitidoEm)
            .expiresAt(emitidoEm.plus(Duration.ofMinutes(15)))
            .claim("username", leitor.username())
            .claim("escopo", "recuperacao_exclusao")
            .build();
    return new NimbusJwtEncoder(new ImmutableSecret<SecurityContext>(chaveDeRecuperacao()))
        .encode(
            JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), reivindicacoes))
        .getTokenValue();
  }

  @Test
  @DisplayName("o e-mail de conta com exclusão pendente continua reservado, mesmo com outro username")
  void emailReservado() {
    Leitor leitor = novoLeitor();
    pedirExclusao(leitor);

    HttpResponse<String> cadastro =
        cadastrar(
            leitor.email().toUpperCase(),
            "outra_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));

    assertThat(cadastro.statusCode()).isEqualTo(409);
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM usuario WHERE lower(email::text) = lower(?)",
                Integer.class,
                leitor.email()))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("o acesso de recuperação vale 15 minutos; vencido, não cancela e a exclusão segue")
  void acessoDeRecuperacaoVence() throws Exception {
    Leitor leitor = novoLeitor();
    String emitido = pedirExclusao(leitor);

    // O token emitido pelo serviço dura exatamente 15 minutos.
    JsonNode reivindicacoes =
        objectMapper.readTree(Base64.getUrlDecoder().decode(emitido.split("\\.")[1]));
    assertThat(reivindicacoes.get("exp").asLong() - reivindicacoes.get("iat").asLong())
        .isEqualTo(Duration.ofMinutes(15).toSeconds());
    // E a chave derivada aqui é a mesma do serviço: a assinatura dele confere com ela.
    NimbusJwtDecoder.withSecretKey(chaveDeRecuperacao())
        .macAlgorithm(MacAlgorithm.HS256)
        .build()
        .decode(emitido);

    // Emitido há 20 minutos: vencido há 5, além da tolerância de 60 s do decoder.
    Instant antigo = Instant.now().truncatedTo(ChronoUnit.SECONDS).minus(Duration.ofMinutes(20));
    HttpResponse<String> vencido = cancelar(acessoDeRecuperacao(leitor, antigo));

    assertThat(vencido.statusCode()).isEqualTo(401);
    assertThat(vencido.body()).contains("NAO_AUTENTICADO");
    assertThat(pendente(leitor.id())).isTrue();

    // Controle: o mesmo token, emitido agora, cancela. O 401 acima foi só pela validade.
    Instant agora = Instant.now().truncatedTo(ChronoUnit.SECONDS);
    assertThat(cancelar(acessoDeRecuperacao(leitor, agora)).statusCode()).isEqualTo(204);
    assertThat(pendente(leitor.id())).isFalse();
  }

  @Test
  @DisplayName("cancelar fica na auditoria só com o id da conta, sem e-mail, username, senha ou token")
  void auditoriaDoCancelamento(CapturedOutput saida) {
    Leitor leitor = novoLeitor();
    String recuperacao = pedirExclusao(leitor);
    int inicio = saida.getOut().length();

    assertThat(cancelar(recuperacao).statusCode()).isEqualTo(204);

    String log = saida.getOut().substring(inicio);
    assertThat(log).contains("Exclusão de conta cancelada pelo usuário " + leitor.id());
    assertThat(log)
        .doesNotContain(leitor.email())
        .doesNotContain(leitor.username())
        .doesNotContain(SENHA)
        .doesNotContain(recuperacao);
  }

  @Test
  @DisplayName("cancelar não grava evento na outbox: não existe evento de restauração")
  void cancelarSemEvento() {
    Leitor leitor = novoLeitor();
    String recuperacao = pedirExclusao(leitor);
    int antes = eventosNaOutbox();

    assertThat(cancelar(recuperacao).statusCode()).isEqualTo(204);

    assertThat(pendente(leitor.id())).isFalse();
    assertThat(eventosNaOutbox()).isEqualTo(antes);
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM outbox_identidade"
                    + " WHERE payload::text LIKE ? OR chave_negocio LIKE ?",
                Integer.class,
                "%" + leitor.id() + "%",
                "%" + leitor.id() + "%"))
        .isZero();
  }

  @Test
  @DisplayName("conta com exclusão pendente não aparece na busca de leitores; cancelada, volta")
  void foraDaBusca() {
    Leitor alvo = novoLeitor();
    Leitor quemBusca = novoLeitor();
    String token = login(quemBusca.username()).get("accessToken").asString();
    HttpRequest busca =
        HttpRequest.newBuilder(uri("/perfis?username=" + alvo.username()))
            .header("Authorization", "Bearer " + token)
            .GET()
            .build();
    assertThat(objectMapper.readTree(enviar(busca).body()).size()).isEqualTo(1);

    String recuperacao = pedirExclusao(alvo);

    HttpResponse<String> durante = enviar(busca);
    assertThat(durante.statusCode()).isEqualTo(200);
    assertThat(durante.body()).isEqualTo("[]");

    cancelar(recuperacao);
    assertThat(objectMapper.readTree(enviar(busca).body()).size()).isEqualTo(1);
  }

  @Test
  @DisplayName("DELETE /me/conta sem token é 401 no corpo de erro padrão e não abre a janela")
  void solicitarSemToken() {
    Leitor leitor = novoLeitor();

    HttpResponse<String> resposta =
        enviar(pedidoDeExclusao().header("Idempotency-Key", UUID.randomUUID().toString()).build());

    assertThat(resposta.statusCode()).isEqualTo(401);
    assertThat(resposta.body()).contains("\"codigo\":\"NAO_AUTENTICADO\"").contains("correlationId");
    assertThat(pendente(leitor.id())).isFalse();
  }

  @Test
  @DisplayName("DELETE /me/conta sem Idempotency-Key é 400 e não abre a janela")
  void solicitarSemChave() {
    Leitor leitor = novoLeitor();
    String sessao = login(leitor.username()).get("accessToken").asString();

    HttpResponse<String> resposta =
        enviar(pedidoDeExclusao().header("Authorization", "Bearer " + sessao).build());

    assertThat(resposta.statusCode()).isEqualTo(400);
    assertThat(resposta.body()).contains("correlationId");
    assertThat(pendente(leitor.id())).isFalse();
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM exclusao_conta WHERE usuario_ref = ?",
                Integer.class,
                leitor.id()))
        .isZero();
  }

  @Test
  @DisplayName("POST /me/conta/cancelar-exclusao sem token é 401 e a exclusão continua pendente")
  void cancelarSemToken() {
    Leitor leitor = novoLeitor();
    pedirExclusao(leitor);

    HttpResponse<String> resposta =
        postJson("/me/conta/cancelar-exclusao", "", "Idempotency-Key", UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(401);
    assertThat(resposta.body()).contains("\"codigo\":\"NAO_AUTENTICADO\"").contains("correlationId");
    assertThat(pendente(leitor.id())).isTrue();
  }

  @Test
  @DisplayName("POST /me/conta/cancelar-exclusao sem Idempotency-Key é 400 e a exclusão continua")
  void cancelarSemChave() {
    Leitor leitor = novoLeitor();
    String recuperacao = pedirExclusao(leitor);

    HttpResponse<String> resposta =
        postJson("/me/conta/cancelar-exclusao", "", "Authorization", "Bearer " + recuperacao);

    assertThat(resposta.statusCode()).isEqualTo(400);
    assertThat(pendente(leitor.id())).isTrue();
  }
}
