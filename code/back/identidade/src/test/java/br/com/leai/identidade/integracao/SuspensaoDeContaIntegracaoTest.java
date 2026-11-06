package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
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
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Suspensão e reativação de conta contra Postgres real (F-MOD-OPC, RF-MOD-04): autorização em
 * camadas das rotas internas, idempotência pelo estado, bloqueio de login, renovação, recuperação
 * de senha e pedido de exclusão, e a volta de tudo na reativação.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
@ExtendWith(OutputCaptureExtension.class)
class SuspensaoDeContaIntegracaoTest extends IntegracaoComPostgres {

  static final String TOKEN_DE_MODERACAO = "token-de-moderacao-com-32-caracteres!";
  private static final String SENHA = "senha-bem-comprida";
  private static final String NOVA_SENHA = "outra-senha-comprida";

  @DynamicPropertySource
  static void moderacao(DynamicPropertyRegistry registro) {
    registro.add("leai.moderacao-token", () -> TOKEN_DE_MODERACAO);
  }

  @Autowired private ObjectMapper objectMapper;
  @Autowired private JdbcTemplate jdbc;
  @Autowired private JwtEncoder jwtEncoder;

  private record Leitor(String username, UUID id) {}

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    HttpResponse<String> cadastro =
        postJson(
            "/auth/register",
            """
            {"email":"susp.%1$s@exemplo.com","username":"susp_%1$s","displayName":"Leitora",
             "dataNascimento":"1990-01-01","senha":"%2$s"}
            """
                .formatted(s, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(cadastro.statusCode()).isEqualTo(201);
    UUID id =
        jdbc.queryForObject("SELECT id FROM usuario WHERE username = ?", UUID.class, "susp_" + s);
    return new Leitor("susp_" + s, id);
  }

  private HttpResponse<String> entrar(String username, String senha) {
    return postJson(
        "/auth/login",
        "{\"identificador\":\"%s\",\"senha\":\"%s\"}".formatted(username, senha),
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  private JsonNode sessao(Leitor leitor) {
    HttpResponse<String> login = entrar(leitor.username(), SENHA);
    assertThat(login.statusCode()).isEqualTo(200);
    return objectMapper.readTree(login.body());
  }

  private HttpResponse<String> renovar(String refreshToken) {
    return postJson(
        "/auth/refresh",
        "{\"refreshToken\":\"" + refreshToken + "\"}",
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  /** Token assinado pelo próprio serviço, como o que o social repassa. */
  private String token(UUID sujeito, String papel) {
    Instant agora = Instant.now();
    JwtClaimsSet reivindicacoes =
        JwtClaimsSet.builder()
            .issuer("identidade")
            .subject(sujeito.toString())
            .issuedAt(agora)
            .expiresAt(agora.plus(Duration.ofMinutes(15)))
            .claim("username", "quem")
            .claim("papel", papel)
            .build();
    JwsHeader cabecalho = JwsHeader.with(MacAlgorithm.HS256).build();
    return jwtEncoder.encode(JwtEncoderParameters.from(cabecalho, reivindicacoes)).getTokenValue();
  }

  private String tokenDeAdmin() {
    return token(UUID.randomUUID(), "admin");
  }

  private HttpResponse<String> comando(
      String acao, UUID alvo, String bearer, String tokenDeModeracao) {
    HttpRequest.Builder requisicao =
        HttpRequest.newBuilder(uri("/internal/moderacao/usuarios/" + alvo + "/" + acao))
            .POST(HttpRequest.BodyPublishers.noBody());
    if (bearer != null) {
      requisicao.header("Authorization", "Bearer " + bearer);
    }
    if (tokenDeModeracao != null) {
      requisicao.header("X-Moderacao-Token", tokenDeModeracao);
    }
    return enviar(requisicao.build());
  }

  private JsonNode suspender(UUID alvo) {
    HttpResponse<String> resposta = comando("suspensao", alvo, tokenDeAdmin(), TOKEN_DE_MODERACAO);
    assertThat(resposta.statusCode()).isEqualTo(200);
    return objectMapper.readTree(resposta.body());
  }

  private JsonNode reativar(UUID alvo) {
    HttpResponse<String> resposta =
        comando("reativacao", alvo, tokenDeAdmin(), TOKEN_DE_MODERACAO);
    assertThat(resposta.statusCode()).isEqualTo(200);
    return objectMapper.readTree(resposta.body());
  }

  private int renovacoesAtivas(UUID usuarioId) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM refresh_token WHERE usuario_id = ? AND revogado = false",
        Integer.class,
        usuarioId);
  }

  private boolean naView(String view, UUID id) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM " + view + " WHERE id = ?)", Boolean.class, id));
  }

  private String codigo(HttpResponse<String> resposta) {
    return objectMapper.readTree(resposta.body()).get("codigo").asString();
  }

  @Test
  @DisplayName("rota interna: sem JWT 401; admin sem token ou com token errado 401; leitor 403")
  void autorizacaoEmCamadas() {
    Leitor alvo = novoLeitor();

    assertThat(comando("suspensao", alvo.id(), null, TOKEN_DE_MODERACAO).statusCode())
        .isEqualTo(401);
    assertThat(comando("suspensao", alvo.id(), tokenDeAdmin(), null).statusCode()).isEqualTo(401);
    assertThat(
            comando("suspensao", alvo.id(), tokenDeAdmin(), "token-errado-com-32-caracteres!!!")
                .statusCode())
        .isEqualTo(401);
    HttpResponse<String> leitor =
        comando("reativacao", alvo.id(), token(alvo.id(), "leitor"), TOKEN_DE_MODERACAO);
    assertThat(leitor.statusCode()).isEqualTo(403);
    assertThat(codigo(leitor)).isEqualTo("ACESSO_NEGADO");

    assertThat(jdbc.queryForObject("SELECT suspenso FROM usuario WHERE id = ?", Boolean.class, alvo.id()))
        .isFalse();
  }

  @Test
  @DisplayName("admin suspende: revoga as renovações, some das VIEWs públicas e fica na da moderação")
  void suspenderRevogaEOculta() {
    Leitor alvo = novoLeitor();
    sessao(alvo);
    sessao(alvo);
    assertThat(renovacoesAtivas(alvo.id())).isEqualTo(2);

    JsonNode estado = suspender(alvo.id());

    assertThat(estado.get("usuarioId").asString()).isEqualTo(alvo.id().toString());
    assertThat(estado.get("suspenso").asBoolean()).isTrue();
    assertThat(estado.get("alterado").asBoolean()).isTrue();
    assertThat(estado.get("suspensoEm").isNull()).isFalse();
    assertThat(renovacoesAtivas(alvo.id())).isZero();
    assertThat(naView("v_perfil_referencia_v1", alvo.id())).isFalse();
    assertThat(
            jdbc.queryForObject(
                "SELECT suspenso FROM v_conta_moderacao_v1 WHERE id = ?", Boolean.class, alvo.id()))
        .isTrue();
    // O instante da VIEW é o mesmo da resposta: é a chave do log no social.
    Instant naVisao =
        jdbc.queryForObject(
                "SELECT suspenso_em FROM v_conta_moderacao_v1 WHERE id = ?",
                java.sql.Timestamp.class,
                alvo.id())
            .toInstant();
    assertThat(Instant.parse(estado.get("suspensoEm").asString())).isEqualTo(naVisao);
  }

  @Test
  @DisplayName("repetir a suspensão devolve alterado:false e o mesmo suspensoEm")
  void repeticaoEhIdempotente() {
    Leitor alvo = novoLeitor();
    JsonNode primeira = suspender(alvo.id());
    JsonNode segunda = suspender(alvo.id());

    assertThat(segunda.get("alterado").asBoolean()).isFalse();
    assertThat(segunda.get("suspenso").asBoolean()).isTrue();
    assertThat(segunda.get("suspensoEm").asString())
        .isEqualTo(primeira.get("suspensoEm").asString());

    JsonNode reativada = reativar(alvo.id());
    JsonNode deNovo = reativar(alvo.id());
    assertThat(deNovo.get("alterado").asBoolean()).isFalse();
    assertThat(deNovo.get("suspenso").asBoolean()).isFalse();
    assertThat(deNovo.get("reativadoEm").asString())
        .isEqualTo(reativada.get("reativadoEm").asString());
  }

  @Test
  @DisplayName("alvo inexistente ou com exclusão pendente é 404")
  void alvoInexistenteOuEmExclusao() {
    assertThat(
            comando("suspensao", UUID.randomUUID(), tokenDeAdmin(), TOKEN_DE_MODERACAO)
                .statusCode())
        .isEqualTo(404);

    Leitor emExclusao = novoLeitor();
    jdbc.update(
        "UPDATE usuario SET exclusao_solicitada_em = now(),"
            + " exclusao_prevista_em = now() + INTERVAL '30 days' WHERE id = ?",
        emExclusao.id());
    assertThat(
            comando("suspensao", emExclusao.id(), tokenDeAdmin(), TOKEN_DE_MODERACAO)
                .statusCode())
        .isEqualTo(404);
    assertThat(
            jdbc.queryForObject(
                "SELECT suspenso FROM usuario WHERE id = ?", Boolean.class, emExclusao.id()))
        .isFalse();
  }

  @Test
  @DisplayName("login de conta suspensa: senha certa 403 CONTA_SUSPENSA, senha errada o 401 único")
  void loginDeContaSuspensa() {
    Leitor alvo = novoLeitor();
    suspender(alvo.id());

    HttpResponse<String> certa = entrar(alvo.username(), SENHA);
    assertThat(certa.statusCode()).isEqualTo(403);
    assertThat(codigo(certa)).isEqualTo("CONTA_SUSPENSA");
    assertThat(certa.body()).contains("Esta conta está suspensa.");

    HttpResponse<String> errada = entrar(alvo.username(), "senha-que-nao-e-dela");
    assertThat(errada.statusCode()).isEqualTo(401);
    assertThat(errada.body()).contains("E-mail, nome de usuário ou senha incorretos.");
  }

  @Test
  @DisplayName("suspensão prevalece sobre a exclusão pendente no login: 403, sem acesso de recuperação")
  void suspensaoPrevaleceSobreExclusao() {
    Leitor alvo = novoLeitor();
    jdbc.update(
        "UPDATE usuario SET suspenso = true, suspenso_em = now(), exclusao_solicitada_em = now(),"
            + " exclusao_prevista_em = now() + INTERVAL '30 days' WHERE id = ?",
        alvo.id());

    HttpResponse<String> login = entrar(alvo.username(), SENHA);
    assertThat(login.statusCode()).isEqualTo(403);
    assertThat(codigo(login)).isEqualTo("CONTA_SUSPENSA");
    assertThat(login.body()).doesNotContain("recuperacao_exclusao");
  }

  @Test
  @DisplayName("renovar com o token que a suspensão revogou é 403, sem log de reuso")
  void renovacaoDeContaSuspensa(CapturedOutput saida) {
    Leitor alvo = novoLeitor();
    String refresh = sessao(alvo).get("refreshToken").asString();
    suspender(alvo.id());

    HttpResponse<String> renovacao = renovar(refresh);

    assertThat(renovacao.statusCode()).isEqualTo(403);
    assertThat(codigo(renovacao)).isEqualTo("CONTA_SUSPENSA");
    assertThat(saida.getOut()).doesNotContain("Reuso de token de renovação revogado");
  }

  @Test
  @DisplayName("renovação ainda ativa de conta suspensa (segunda barreira) também é 403")
  void renovacaoAtivaDeContaSuspensa() {
    Leitor alvo = novoLeitor();
    String refresh = sessao(alvo).get("refreshToken").asString();
    // Suspensa por SQL, sem revogar: o próprio renovar precisa barrar.
    jdbc.update(
        "UPDATE usuario SET suspenso = true, suspenso_em = now() WHERE id = ?", alvo.id());

    HttpResponse<String> renovacao = renovar(refresh);
    assertThat(renovacao.statusCode()).isEqualTo(403);
    assertThat(codigo(renovacao)).isEqualTo("CONTA_SUSPENSA");
  }

  @Test
  @DisplayName("redefinir a senha não contorna a suspensão: o login seguinte continua 403")
  void recuperacaoDeSenhaNaoContorna() throws Exception {
    Leitor alvo = novoLeitor();
    suspender(alvo.id());
    String link = "token-de-reset-" + UUID.randomUUID();
    jdbc.update(
        "INSERT INTO reset_token (usuario_id, token_hash, criado_em, expira_em)"
            + " VALUES (?, ?, now(), now() + interval '1 hour')",
        alvo.id(),
        HexFormat.of()
            .formatHex(
                MessageDigest.getInstance("SHA-256").digest(link.getBytes(StandardCharsets.UTF_8))));

    HttpResponse<String> reset =
        postJson(
            "/auth/password/reset",
            "{\"token\":\"%s\",\"novaSenha\":\"%s\"}".formatted(link, NOVA_SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(reset.statusCode()).isEqualTo(204);

    HttpResponse<String> login = entrar(alvo.username(), NOVA_SENHA);
    assertThat(login.statusCode()).isEqualTo(403);
    assertThat(codigo(login)).isEqualTo("CONTA_SUSPENSA");
  }

  @Test
  @DisplayName("pedido de exclusão com o token de acesso de conta suspensa é 403")
  void exclusaoDeContaSuspensa() {
    Leitor alvo = novoLeitor();
    String acesso = sessao(alvo).get("accessToken").asString();
    suspender(alvo.id());

    HttpResponse<String> pedido =
        enviar(
            HttpRequest.newBuilder(uri("/me/conta"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + acesso)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .method(
                    "DELETE",
                    HttpRequest.BodyPublishers.ofString(
                        "{\"senha\":\"" + SENHA + "\",\"confirmacao\":true}"))
                .build());

    assertThat(pedido.statusCode()).isEqualTo(403);
    assertThat(codigo(pedido)).isEqualTo("CONTA_SUSPENSA");
    assertThat(
            jdbc.queryForObject(
                "SELECT exclusao_solicitada_em IS NULL FROM usuario WHERE id = ?",
                Boolean.class,
                alvo.id()))
        .isTrue();
  }

  @Test
  @DisplayName("reativar devolve login, renovação e as VIEWs, com privacidade e seguidores de antes")
  void reativacaoRestauraTudo() {
    Leitor alvo = novoLeitor();
    Leitor seguidor = novoLeitor();
    String acessoDoSeguidor = sessao(seguidor).get("accessToken").asString();
    HttpResponse<String> seguir =
        enviar(
            HttpRequest.newBuilder(uri("/perfis/" + alvo.username() + "/seguir"))
                .header("Authorization", "Bearer " + acessoDoSeguidor)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .POST(HttpRequest.BodyPublishers.noBody())
                .build());
    assertThat(seguir.statusCode()).isBetween(200, 201);
    jdbc.update("UPDATE usuario SET privacidade = 'privado' WHERE id = ?", alvo.id());

    suspender(alvo.id());
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM v_seguimento_aceito_v1 WHERE seguido_id = ?",
                Integer.class,
                alvo.id()))
        .isZero();

    JsonNode reativada = reativar(alvo.id());
    assertThat(reativada.get("alterado").asBoolean()).isTrue();
    assertThat(reativada.get("suspenso").asBoolean()).isFalse();
    assertThat(reativada.get("suspensoEm").isNull()).isTrue();
    assertThat(reativada.get("reativadoEm").isNull()).isFalse();

    assertThat(naView("v_perfil_referencia_v1", alvo.id())).isTrue();
    assertThat(
            jdbc.queryForObject(
                "SELECT privacidade FROM v_perfil_referencia_v1 WHERE id = ?",
                String.class,
                alvo.id()))
        .isEqualTo("privado");
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM v_seguimento_aceito_v1 WHERE seguido_id = ?",
                Integer.class,
                alvo.id()))
        .isEqualTo(1);
    String refresh = sessao(alvo).get("refreshToken").asString();
    assertThat(renovar(refresh).statusCode()).isEqualTo(200);
  }
  @Test
  @DisplayName("reativar apaga as renovações revogadas: o token antigo é 401 comum, sem alarme de reuso")
  void tokenAntigoDepoisDaReativacao(CapturedOutput saida) {
    Leitor alvo = novoLeitor();
    String antigo = sessao(alvo).get("refreshToken").asString();
    suspender(alvo.id());
    reativar(alvo.id());
    String novo = sessao(alvo).get("refreshToken").asString();

    HttpResponse<String> reuso = renovar(antigo);

    assertThat(reuso.statusCode()).isEqualTo(401);
    assertThat(saida.getOut()).doesNotContain("Reuso de token de renovação revogado");
    // A sessão aberta depois da reativação não cai.
    assertThat(renovar(novo).statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("contadores do perfil não contam conta suspensa e voltam a contar na reativação")
  void contadoresSemContaSuspensa() {
    Leitor alvo = novoLeitor();
    Leitor seguidor = novoLeitor();
    String acessoDoSeguidor = sessao(seguidor).get("accessToken").asString();
    enviar(
        HttpRequest.newBuilder(uri("/perfis/" + alvo.username() + "/seguir"))
            .header("Authorization", "Bearer " + acessoDoSeguidor)
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .POST(HttpRequest.BodyPublishers.noBody())
            .build());
    String acessoDoAlvo = sessao(alvo).get("accessToken").asString();

    assertThat(seguidores(acessoDoAlvo)).isEqualTo(1);
    suspender(seguidor.id());
    assertThat(seguidores(acessoDoAlvo)).isZero();
    reativar(seguidor.id());
    assertThat(seguidores(acessoDoAlvo)).isEqualTo(1);
  }

  private long seguidores(String acesso) {
    HttpResponse<String> perfil =
        enviar(
            HttpRequest.newBuilder(uri("/me/perfil"))
                .header("Authorization", "Bearer " + acesso)
                .GET()
                .build());
    return objectMapper.readTree(perfil.body()).get("contadores").get("seguidores").asLong();
  }
}
