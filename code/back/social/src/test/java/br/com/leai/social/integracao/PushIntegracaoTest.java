package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste.Fato;
import br.com.leai.social.notificacao.model.EventoDeNotificacao;
import br.com.leai.social.notificacao.model.NotificacaoGravada;
import br.com.leai.social.notificacao.model.TipoNotificacao;
import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.notificacao.service.ConsumidorDeNotificacao;
import br.com.leai.social.push.model.MensagemDePush;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class PushIntegracaoTest extends IntegracaoComPostgres {

  private static final Duration LIMITE = Duration.ofSeconds(10);
  private static final Duration AUSENCIA = Duration.ofMillis(600);

  @TestConfiguration
  static class Configuracao {
    @Bean
    @Primary
    EnviadorSimulado enviadorSimulado() {
      return new EnviadorSimulado();
    }
  }

  @Autowired private EnviadorSimulado fcm;
  @Autowired private ConsumidorDeNotificacao consumidor;
  @Autowired private ApplicationEventPublisher eventos;
  @Autowired private JdbcTemplate jdbc;
  @Autowired private ObjectMapper json;
  private MassaDeModeracao massa;

  @BeforeEach
  void preparar() {
    massa = new MassaDeModeracao(jdbc);
    massa.preparar();
    jdbc.execute("TRUNCATE dispositivo_push, notificacao CASCADE");
    fcm.reiniciar();
  }

  @Test
  @DisplayName("registrar o mesmo token duas vezes nao duplica: 201 e depois 200 com o mesmo id")
  void mesmoTokenNaoDuplica() throws Exception {
    UUID eu = UUID.randomUUID();

    HttpResponse<String> primeira = registrar(eu, "token-a");
    HttpResponse<String> segunda = registrar(eu, "token-a");

    assertThat(primeira.statusCode()).isEqualTo(201);
    assertThat(segunda.statusCode()).isEqualTo(200);
    assertThat(corpo(segunda).get("id").asString()).isEqualTo(corpo(primeira).get("id").asString());
    assertThat(corpo(primeira).get("plataforma").asString()).isEqualTo("android");
    assertThat(corpo(primeira).get("ativo").asBoolean()).isTrue();
    assertThat(totalDeDispositivos()).isEqualTo(1);
  }

  @Test
  @DisplayName("token que muda de conta passa a pertencer a conta atual e reativa o registro")
  void tokenMudaDeConta() throws Exception {
    UUID antiga = UUID.randomUUID();
    UUID atual = UUID.randomUUID();
    String id = corpo(registrar(antiga, "token-b")).get("id").asString();
    revogar(antiga, id);

    HttpResponse<String> resposta = registrar(atual, "token-b");

    assertThat(resposta.statusCode()).isEqualTo(200);
    Map<String, Object> linha =
        jdbc.queryForMap("SELECT usuario_id, ativo, revogado_em FROM dispositivo_push");
    assertThat(linha.get("usuario_id")).isEqualTo(atual);
    assertThat(linha.get("ativo")).isEqualTo(true);
    assertThat(linha.get("revogado_em")).isNull();
    assertThat(totalDeDispositivos()).isEqualTo(1);
  }

  @Test
  @DisplayName("plataforma diferente de android, token vazio e falta da chave respondem 400")
  void entradaInvalida() throws Exception {
    String bearer = token(UUID.randomUUID());

    assertThat(post(bearer, UUID.randomUUID(), "{\"token\":\"t\",\"plataforma\":\"ios\"}").statusCode())
        .isEqualTo(400);
    assertThat(post(bearer, UUID.randomUUID(), "{\"token\":\"\",\"plataforma\":\"android\"}").statusCode())
        .isEqualTo(400);
    assertThat(post(bearer, null, "{\"token\":\"t\",\"plataforma\":\"android\"}").statusCode())
        .isEqualTo(400);
    assertThat(totalDeDispositivos()).isZero();
  }

  @Test
  @DisplayName("mesma Idempotency-Key repete a resposta; com outro token responde 409")
  void idempotenciaDoRegistro() throws Exception {
    String bearer = token(UUID.randomUUID());
    UUID chave = UUID.randomUUID();
    String corpoA = "{\"token\":\"token-c\",\"plataforma\":\"android\"}";

    HttpResponse<String> primeira = post(bearer, chave, corpoA);
    HttpResponse<String> repetida = post(bearer, chave, corpoA);
    HttpResponse<String> outro = post(bearer, chave, "{\"token\":\"token-d\",\"plataforma\":\"android\"}");

    assertThat(primeira.statusCode()).isEqualTo(201);
    assertThat(repetida.statusCode()).isEqualTo(201);
    assertThat(repetida.body()).isEqualTo(primeira.body());
    assertThat(outro.statusCode()).isEqualTo(409);
    assertThat(totalDeDispositivos()).isEqualTo(1);
  }

  @Test
  @DisplayName("so o dono revoga: id alheio e inexistente respondem 404, e revogar de novo responde 204")
  void revogacao() throws Exception {
    UUID dona = UUID.randomUUID();
    UUID intrusa = UUID.randomUUID();
    String id = corpo(registrar(dona, "token-e")).get("id").asString();

    HttpResponse<String> alheio = revogar(intrusa, id);
    HttpResponse<String> inexistente = revogar(dona, UUID.randomUUID().toString());
    assertThat(alheio.statusCode()).isEqualTo(404);
    assertThat(alheio.body()).contains("\"codigo\":\"RECURSO_NAO_ENCONTRADO\"");
    assertThat(inexistente.statusCode()).isEqualTo(404);
    assertThat(corpo(inexistente).get("mensagem")).isEqualTo(corpo(alheio).get("mensagem"));
    assertThat(ativo(id)).isTrue();

    assertThat(revogar(dona, id).statusCode()).isEqualTo(204);
    assertThat(revogar(dona, id).statusCode()).isEqualTo(204);
    assertThat(ativo(id)).isFalse();
    assertThat(jdbc.queryForObject("SELECT revogado_em IS NOT NULL FROM dispositivo_push", Boolean.class))
        .isTrue();
  }

  @Test
  @DisplayName("notificacao gravada gera um push por dispositivo ativo, com titulo, corpo e data do contrato")
  void umPushPorDispositivoAtivo() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID ator = massa.leitor("caio");
    registrar(eu, "token-1");
    registrar(eu, "token-2");
    registrar(UUID.randomUUID(), "token-de-outro");

    UUID id = notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu).comAtor(ator));

    await().atMost(LIMITE).until(() -> fcm.enviadas().size() == 2);
    assertThat(fcm.enviadas()).extracting(MensagemDePush::token).containsExactlyInAnyOrder("token-1", "token-2");
    MensagemDePush mensagem = fcm.enviadas().getFirst();
    assertThat(mensagem.titulo()).isEqualTo("Lê Ai");
    assertThat(mensagem.corpo()).isEqualTo(EventosDeNotificacaoDeTeste.NOME_ATOR + " começou a seguir você.");
    assertThat(mensagem.dados())
        .containsOnly(
            Map.entry("notificacaoId", id.toString()), Map.entry("tipo", TipoNotificacao.NOVO_SEGUIDOR.name()));
  }

  @Test
  @DisplayName("reentrega do mesmo evento, ou do mesmo fato gravado, nao gera segundo push")
  void reentregaNaoDuplica() throws Exception {
    UUID eu = UUID.randomUUID();
    registrar(eu, "token-3");
    MessageEnvelope envelope =
        EventosDeNotificacaoDeTeste.envelope(EventoDeNotificacao.ATIVIDADE_CURTIDA, Fato.para(eu));

    consumidor.handle(envelope);
    await().atMost(LIMITE).until(() -> fcm.enviadas().size() == 1);
    UUID id = jdbc.queryForObject("SELECT id FROM notificacao WHERE event_id = ?", UUID.class, envelope.eventId());
    consumidor.handle(envelope);
    eventos.publishEvent(new NotificacaoGravada(id, eu));

    await().during(AUSENCIA).atMost(LIMITE).until(() -> fcm.enviadas().size() == 1);
    assertThat(jdbc.queryForObject("SELECT count(*) FROM envio_push", Integer.class)).isEqualTo(1);
  }

  @Test
  @DisplayName("dispositivo revogado deixa de receber push")
  void revogadoNaoRecebe() throws Exception {
    UUID eu = UUID.randomUUID();
    String id = corpo(registrar(eu, "token-4")).get("id").asString();
    revogar(eu, id);

    notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu));

    await().during(AUSENCIA).atMost(LIMITE).until(() -> fcm.enviadas().isEmpty());
  }

  @Test
  @DisplayName("token recusado pelo FCM inativa o dispositivo e nao e usado de novo")
  void tokenInvalidoInativa() throws Exception {
    UUID eu = UUID.randomUUID();
    String id = corpo(registrar(eu, "token-5")).get("id").asString();
    fcm.modo(EnviadorSimulado.Modo.TOKEN_INVALIDO);

    notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu));

    await().atMost(LIMITE).until(() -> !ativo(id));
    assertThat(jdbc.queryForObject("SELECT revogado_em IS NOT NULL FROM dispositivo_push", Boolean.class))
        .isTrue();
    fcm.modo(EnviadorSimulado.Modo.ENVIA);
    notificar(EventoDeNotificacao.ATIVIDADE_CURTIDA, Fato.para(eu));
    await().during(AUSENCIA).atMost(LIMITE).until(() -> fcm.enviadas().isEmpty());
  }

  @Test
  @DisplayName("FCM fora do ar nao desfaz a notificacao in-app e libera o envio para nova tentativa")
  void fcmForaDoArPreservaANotificacao() throws Exception {
    UUID eu = UUID.randomUUID();
    registrar(eu, "token-6");
    fcm.modo(EnviadorSimulado.Modo.INDISPONIVEL);

    UUID id = notificar(EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(eu));

    await()
        .during(AUSENCIA)
        .atMost(LIMITE)
        .until(() -> jdbc.queryForObject("SELECT count(*) FROM envio_push", Integer.class) == 0);
    JsonNode lista = listar(eu);
    assertThat(lista.get("totalItens").asLong()).isEqualTo(1);
    assertThat(lista.get("itens").get(0).get("id").asString()).isEqualTo(id.toString());
    assertThat(ativoDoUsuario(eu)).isTrue();

    fcm.modo(EnviadorSimulado.Modo.ENVIA);
    eventos.publishEvent(new NotificacaoGravada(id, eu));
    await().atMost(LIMITE).until(() -> fcm.enviadas().size() == 1);
  }

  @Test
  @DisplayName("ator suspenso e mensagem livre da recomendacao nao vazam no push")
  void conteudoOcultoNaoVaza() throws Exception {
    UUID eu = UUID.randomUUID();
    UUID suspenso = massa.leitor("suspenso");
    jdbc.update("UPDATE identidade.usuario SET suspenso = true WHERE id = ?", suspenso);
    registrar(eu, "token-7");

    UUID id = notificar(EventoDeNotificacao.RECOMENDACAO_RECEBIDA, Fato.para(eu).comAtor(suspenso));

    await().atMost(LIMITE).until(() -> fcm.enviadas().size() == 1);
    MensagemDePush mensagem = fcm.enviadas().getFirst();
    assertThat(mensagem.corpo())
        .isEqualTo("Um leitor te recomendou " + EventosDeNotificacaoDeTeste.TITULO_LIVRO + ".")
        .doesNotContain(EventosDeNotificacaoDeTeste.NOME_ATOR)
        .doesNotContain(EventosDeNotificacaoDeTeste.MENSAGEM_RECOMENDACAO);
    assertThat(mensagem.dados()).containsOnlyKeys("notificacaoId", "tipo");
    assertThat(mensagem.dados().get("notificacaoId")).isEqualTo(id.toString());
  }

  private UUID notificar(EventoDeNotificacao evento, Fato fato) {
    MessageEnvelope envelope = EventosDeNotificacaoDeTeste.envelope(evento, fato);
    consumidor.handle(envelope);
    return jdbc.queryForObject("SELECT id FROM notificacao WHERE event_id = ?", UUID.class, envelope.eventId());
  }

  private HttpResponse<String> registrar(UUID usuario, String tokenFcm) throws Exception {
    return post(
        token(usuario),
        UUID.randomUUID(),
        "{\"token\":\"" + tokenFcm + "\",\"plataforma\":\"android\"}");
  }

  private HttpResponse<String> post(String bearer, UUID chave, String corpo) {
    HttpRequest.Builder requisicao =
        HttpRequest.newBuilder(uri("/me/dispositivos-push"))
            .header("Authorization", "Bearer " + bearer)
            .header("Content-Type", "application/json");
    if (chave != null) {
      requisicao.header("Idempotency-Key", chave.toString());
    }
    return enviar(requisicao.POST(HttpRequest.BodyPublishers.ofString(corpo)).build());
  }

  private HttpResponse<String> revogar(UUID usuario, String id) throws Exception {
    return enviar(
        HttpRequest.newBuilder(uri("/me/dispositivos-push/" + id))
            .header("Authorization", "Bearer " + token(usuario))
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .DELETE()
            .build());
  }

  private JsonNode listar(UUID usuario) throws Exception {
    return corpo(
        enviar(
            HttpRequest.newBuilder(uri("/notificacoes"))
                .header("Authorization", "Bearer " + token(usuario))
                .GET()
                .build()));
  }

  private JsonNode corpo(HttpResponse<String> resposta) {
    return json.readTree(resposta.body());
  }

  private int totalDeDispositivos() {
    return jdbc.queryForObject("SELECT count(*) FROM dispositivo_push", Integer.class);
  }

  private boolean ativo(String id) {
    return jdbc.queryForObject("SELECT ativo FROM dispositivo_push WHERE id = ?::uuid", Boolean.class, id);
  }

  private boolean ativoDoUsuario(UUID usuario) {
    return jdbc.queryForObject("SELECT ativo FROM dispositivo_push WHERE usuario_id = ?", Boolean.class, usuario);
  }
}
