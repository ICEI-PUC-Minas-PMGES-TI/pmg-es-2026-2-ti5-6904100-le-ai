package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Exclusão e recuperação de conta contra Postgres real (F-CONTA-2, RF-AUT-07, RN-23): janela de
 * 30 dias, login restrito, cancelamento, job diário e anonimização dos registros técnicos.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
@ExtendWith(OutputCaptureExtension.class)
class ExclusaoDeContaIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";
  private static final String TOKEN_DO_AGENDADOR = "token-do-agendador-com-32-caracteres!";

  @DynamicPropertySource
  static void agendador(DynamicPropertyRegistry registro) {
    registro.add("leai.scheduler-token", () -> TOKEN_DO_AGENDADOR);
  }

  @Autowired private ObjectMapper objectMapper;
  @Autowired private JdbcTemplate jdbc;

  /**
   * Esta classe tem contexto próprio (o token do agendador), e o banco é o mesmo das outras: o
   * {@code SeedIntegracaoTest} conta a outbox inteira e não pode achar o que o job gravou aqui.
   */
  @AfterEach
  void limparOutbox() {
    jdbc.update("DELETE FROM outbox_identidade");
  }

  private record Leitor(String username, UUID id) {}

  private Leitor novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    HttpResponse<String> cadastro =
        postJson(
            "/auth/register",
            """
            {"email":"exclui.%1$s@exemplo.com","username":"exclui_%1$s","displayName":"Leitora",
             "dataNascimento":"1990-01-01","senha":"%2$s"}
            """
                .formatted(s, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(cadastro.statusCode()).isEqualTo(201);
    UUID id = UUID.fromString(objectMapper.readTree(cadastro.body()).get("id").asString());
    return new Leitor("exclui_" + s, id);
  }

  private HttpResponse<String> entrar(String username) {
    return postJson(
        "/auth/login",
        "{\"identificador\":\"" + username + "\",\"senha\":\"" + SENHA + "\"}",
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  private JsonNode login(String username) {
    HttpResponse<String> resposta = entrar(username);
    assertThat(resposta.statusCode()).isEqualTo(200);
    return objectMapper.readTree(resposta.body());
  }

  private HttpResponse<String> solicitar(String accessToken, String senha, String chave) {
    return enviar(
        HttpRequest.newBuilder(uri("/me/conta"))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + accessToken)
            .header("Idempotency-Key", chave)
            .method(
                "DELETE",
                HttpRequest.BodyPublishers.ofString(
                    "{\"senha\":\"" + senha + "\",\"confirmacao\":true}"))
            .build());
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

  private HttpResponse<String> job(String token) {
    return postJson(
        "/internal/jobs/exclusao-conta",
        "",
        "X-Scheduler-Token",
        token,
        "Idempotency-Key",
        UUID.randomUUID().toString());
  }

  private HttpResponse<String> me(String accessToken) {
    return enviar(
        HttpRequest.newBuilder(uri("/me"))
            .header("Authorization", "Bearer " + accessToken)
            .GET()
            .build());
  }

  /** Pede a exclusão e devolve a sessão usada no pedido. */
  private JsonNode pedirExclusao(Leitor leitor) {
    JsonNode sessao = login(leitor.username());
    HttpResponse<String> resposta =
        solicitar(sessao.get("accessToken").asString(), SENHA, UUID.randomUUID().toString());
    assertThat(resposta.statusCode()).isEqualTo(202);
    return sessao;
  }

  /** Antecipa a janela em 31 dias, respeitando os CHECKs de +30 dias exatos. */
  private void vencerPrazo(UUID usuarioId) {
    jdbc.update(
        "UPDATE usuario SET exclusao_solicitada_em = exclusao_solicitada_em - INTERVAL '31 days',"
            + " exclusao_prevista_em = exclusao_prevista_em - INTERVAL '31 days' WHERE id = ?",
        usuarioId);
    jdbc.update(
        "UPDATE exclusao_conta SET criado_em = criado_em - INTERVAL '31 days',"
            + " prevista_em = prevista_em - INTERVAL '31 days'"
            + " WHERE usuario_ref = ? AND status = 'pendente'",
        usuarioId);
  }

  private int visivelNaView(UUID usuarioId) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM v_perfil_referencia_v1 WHERE id = ?", Integer.class, usuarioId);
  }

  @Test
  @DisplayName("pedir responde 202 com 30 dias, oculta a conta e revoga as renovações")
  void pedirAbreJanela(CapturedOutput saida) {
    Leitor leitor = novoLeitor();
    JsonNode sessao = login(leitor.username());

    HttpResponse<String> resposta =
        solicitar(sessao.get("accessToken").asString(), SENHA, UUID.randomUUID().toString());

    assertThat(resposta.statusCode()).isEqualTo(202);
    JsonNode corpo = objectMapper.readTree(resposta.body());
    Instant solicitada = Instant.parse(corpo.get("exclusaoSolicitadaEm").asString());
    Instant prevista = Instant.parse(corpo.get("exclusaoPrevistaEm").asString());
    assertThat(Duration.between(solicitada, prevista)).isEqualTo(Duration.ofDays(30));

    assertThat(visivelNaView(leitor.id())).isZero();
    HttpResponse<String> renovar =
        postJson(
            "/auth/refresh",
            "{\"refreshToken\":\"" + sessao.get("refreshToken").asString() + "\"}",
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(renovar.statusCode()).isEqualTo(401);

    Map<String, Object> recibo =
        jdbc.queryForMap(
            "SELECT status, prevista_em FROM exclusao_conta WHERE usuario_ref = ?", leitor.id());
    assertThat(recibo.get("status")).isEqualTo("pendente");
    assertThat(saida.getOut()).contains("Exclusão de conta solicitada pelo usuário");
    assertThat(saida.getOut()).doesNotContain(SENHA);
  }

  @Test
  @DisplayName("senha errada é 422 sem mudar nada; a sexta tentativa depois de 5 erros é 429")
  void senhaErradaELimite() {
    Leitor leitor = novoLeitor();
    String token = login(leitor.username()).get("accessToken").asString();

    for (int i = 0; i < 5; i++) {
      HttpResponse<String> errada = solicitar(token, "outra-senha", UUID.randomUUID().toString());
      assertThat(errada.statusCode()).isEqualTo(422);
      assertThat(errada.body()).contains("Senha incorreta. Sua conta continua como estava.");
    }
    assertThat(visivelNaView(leitor.id())).isEqualTo(1);

    HttpResponse<String> bloqueada = solicitar(token, SENHA, UUID.randomUUID().toString());
    assertThat(bloqueada.statusCode()).isEqualTo(429);
    assertThat(visivelNaView(leitor.id())).isEqualTo(1);
  }

  @Test
  @DisplayName("sem confirmação explícita é 400")
  void semConfirmacao() {
    Leitor leitor = novoLeitor();
    String token = login(leitor.username()).get("accessToken").asString();

    HttpResponse<String> resposta =
        enviar(
            HttpRequest.newBuilder(uri("/me/conta"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .method(
                    "DELETE",
                    HttpRequest.BodyPublishers.ofString(
                        "{\"senha\":\"" + SENHA + "\",\"confirmacao\":false}"))
                .build());

    assertThat(resposta.statusCode()).isEqualTo(400);
    assertThat(visivelNaView(leitor.id())).isEqualTo(1);
  }

  @Test
  @DisplayName("repetir a chave devolve a mesma janela, sem abrir outra")
  void idempotencia() {
    Leitor leitor = novoLeitor();
    String token = login(leitor.username()).get("accessToken").asString();
    String chave = UUID.randomUUID().toString();

    HttpResponse<String> primeira = solicitar(token, SENHA, chave);
    HttpResponse<String> segunda = solicitar(token, SENHA, chave);

    assertThat(segunda.statusCode()).isEqualTo(202);
    assertThat(segunda.body()).isEqualTo(primeira.body());
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM exclusao_conta WHERE usuario_ref = ?",
                Integer.class,
                leitor.id()))
        .isEqualTo(1);
  }

  @Test
  @DisplayName("login de conta pendente dá acesso de recuperação, sem refresh e só para cancelar")
  void loginRestrito() {
    Leitor leitor = novoLeitor();
    String tokenNormal = pedirExclusao(leitor).get("accessToken").asString();

    JsonNode acesso = login(leitor.username());

    assertThat(acesso.get("tipo").asString()).isEqualTo("recuperacao_exclusao");
    assertThat(acesso.has("refreshToken")).isFalse();
    assertThat(acesso.get("username").asString()).isEqualTo(leitor.username());
    assertThat(acesso.get("nomeExibicao").asString()).isEqualTo("Leitora");
    assertThat(acesso.get("exclusaoPrevistaEm").asString()).isNotBlank();

    String recuperacao = acesso.get("accessToken").asString();
    // O token de recuperação não abre nenhuma outra rota.
    assertThat(me(recuperacao).statusCode()).isEqualTo(401);
    // E o token normal não cancela.
    assertThat(cancelar(tokenNormal).statusCode()).isEqualTo(401);
  }

  @Test
  @DisplayName("cancelar no prazo restaura a conta e o login volta a dar sessão normal")
  void cancelarRestaura() {
    Leitor leitor = novoLeitor();
    pedirExclusao(leitor);
    String recuperacao = login(leitor.username()).get("accessToken").asString();

    HttpResponse<String> resposta = cancelar(recuperacao);

    assertThat(resposta.statusCode()).isEqualTo(204);
    assertThat(visivelNaView(leitor.id())).isEqualTo(1);
    JsonNode sessao = login(leitor.username());
    assertThat(sessao.get("tipo").asString()).isEqualTo("sessao");
    assertThat(sessao.get("refreshToken").asString()).isNotBlank();
    assertThat(
            jdbc.queryForObject(
                "SELECT status FROM exclusao_conta WHERE usuario_ref = ?",
                String.class,
                leitor.id()))
        .isEqualTo("cancelada");
    // Cancelar de novo, com a conta já normal, não é erro.
    assertThat(cancelar(recuperacao).statusCode()).isEqualTo(204);
  }

  @Test
  @DisplayName("cancelar com o prazo vencido e a conta ainda não finalizada é 410")
  void cancelarVencido() {
    Leitor leitor = novoLeitor();
    pedirExclusao(leitor);
    String recuperacao = login(leitor.username()).get("accessToken").asString();
    vencerPrazo(leitor.id());

    HttpResponse<String> resposta = cancelar(recuperacao);

    assertThat(resposta.statusCode()).isEqualTo(410);
    assertThat(resposta.body()).contains("RECURSO_EXPIRADO");
    assertThat(visivelNaView(leitor.id())).isZero();
  }

  @Test
  @DisplayName("username e e-mail continuam reservados durante a janela")
  void identificadoresReservados() {
    Leitor leitor = novoLeitor();
    pedirExclusao(leitor);

    HttpResponse<String> cadastro =
        postJson(
            "/auth/register",
            """
            {"email":"outra.%s@exemplo.com","username":"%s","displayName":"Outra",
             "dataNascimento":"1990-01-01","senha":"%s"}
            """
                .formatted(UUID.randomUUID().toString().substring(0, 8), leitor.username(), SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());

    assertThat(cadastro.statusCode()).isEqualTo(409);
  }

  @Test
  @DisplayName("o job exige o token do agendador")
  void jobSemToken() {
    assertThat(job("token-errado").statusCode()).isEqualTo(401);
    HttpResponse<String> semCabecalho =
        postJson(
            "/internal/jobs/exclusao-conta", "", "Idempotency-Key", UUID.randomUUID().toString());
    assertThat(semCabecalho.statusCode()).isEqualTo(401);
  }

  @Test
  @DisplayName("o job finaliza só as vencidas, anonimiza o recibo e grava conta.excluida")
  void jobFinalizaVencidas() {
    Leitor vencida = novoLeitor();
    Leitor noPrazo = novoLeitor();
    Leitor seguidora = novoLeitor();
    pedirExclusao(vencida);
    pedirExclusao(noPrazo);
    vencerPrazo(vencida.id());
    // Um seguimento para provar que o CASCADE leva o grafo social.
    jdbc.update(
        "INSERT INTO seguidor (seguidor_id, seguido_id) VALUES (?, ?)",
        seguidora.id(),
        vencida.id());

    HttpResponse<String> resposta = job(TOKEN_DO_AGENDADOR);

    assertThat(resposta.statusCode()).isEqualTo(200);
    // Pelo menos esta: outro teste da classe pode ter deixado conta vencida no mesmo banco.
    assertThat(objectMapper.readTree(resposta.body()).get("finalizadas").asInt())
        .isGreaterThanOrEqualTo(1);

    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM usuario WHERE id = ?", Integer.class, vencida.id()))
        .isZero();
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM seguidor WHERE seguido_id = ?", Integer.class, vencida.id()))
        .isZero();
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM usuario WHERE id = ?", Integer.class, noPrazo.id()))
        .isEqualTo(1);

    // Nenhum recibo guarda mais a referência à conta, e os concluídos estão anonimizados.
    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM exclusao_conta WHERE usuario_ref = ?",
                Integer.class,
                vencida.id()))
        .isZero();
    List<Map<String, Object>> recibos =
        jdbc.queryForList(
            "SELECT usuario_ref, chave_idempotencia, anonimizado_em FROM exclusao_conta"
                + " WHERE status = 'concluida'");
    assertThat(recibos)
        .isNotEmpty()
        .allSatisfy(
            recibo -> {
              assertThat(recibo.get("usuario_ref")).isNull();
              assertThat(recibo.get("chave_idempotencia")).isNull();
              assertThat(recibo.get("anonimizado_em")).isNotNull();
            });

    assertThat(
            jdbc.queryForObject(
                "SELECT count(*) FROM idempotencia_identidade WHERE subject_ref = ?",
                Integer.class,
                vencida.id()))
        .isZero();

    String payload =
        jdbc.queryForObject(
            "SELECT payload::text FROM outbox_identidade"
                + " WHERE tipo = 'conta.excluida' AND chave_negocio = ?",
            String.class,
            "conta:" + vencida.id());
    assertThat(payload).contains(vencida.id().toString());

    // A conta excluída deixa de existir: o login falha como credencial inválida.
    assertThat(entrar(vencida.username()).statusCode()).isEqualTo(401);
    // Repetir o job não finaliza mais nada.
    assertThat(objectMapper.readTree(job(TOKEN_DO_AGENDADOR).body()).get("finalizadas").asInt())
        .isZero();
  }

  @Test
  @DisplayName("depois de publicado, o envelope de conta.excluida é anonimizado na execução seguinte")
  void jobAnonimizaEnvelopePublicado() {
    Leitor leitor = novoLeitor();
    pedirExclusao(leitor);
    vencerPrazo(leitor.id());
    job(TOKEN_DO_AGENDADOR);
    UUID eventId =
        jdbc.queryForObject(
            "SELECT event_id FROM outbox_identidade WHERE chave_negocio = ?",
            UUID.class,
            "conta:" + leitor.id());
    // O dispatcher está desligado nos testes; a publicação é simulada.
    jdbc.update(
        "UPDATE outbox_identidade SET status = 'publicado', publicado_em = now()"
            + " WHERE event_id = ?",
        eventId);

    job(TOKEN_DO_AGENDADOR);

    Map<String, Object> evento =
        jdbc.queryForMap(
            "SELECT chave_negocio, payload, anonimizado_em FROM outbox_identidade"
                + " WHERE event_id = ?",
            eventId);
    assertThat(evento.get("chave_negocio")).isNull();
    assertThat(evento.get("payload")).isNull();
    assertThat(evento.get("anonimizado_em")).isNotNull();
  }
}
