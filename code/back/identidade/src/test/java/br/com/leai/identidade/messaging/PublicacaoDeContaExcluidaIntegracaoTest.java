package br.com.leai.identidade.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.leai.identidade.integracao.IntegracaoComPostgres;
import com.rabbitmq.client.AMQP.BasicProperties;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Delivery;
import com.rabbitmq.client.Envelope;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.ObjectMapper;

/**
 * {@code conta.excluida} pelo caminho real de publicação (F-CONTA-2, RNF-TST-03, RNF-ERR-10): o
 * job grava o evento na outbox, o {@link OutboxDispatcherService} de produção lê a linha e o
 * {@link AmqpPublisherService} de produção monta o envelope, valida o schema e publica com
 * confirm. Só o canal AMQP é substituído: não há broker no teste. O que sai no canal é conferido
 * pelo mesmo {@link MessageValidator#parse} que os consumidores usam (envelope, headers e schema
 * de {@code data}).
 *
 * <p>O despachante do contexto continua desligado ({@code leai.amqp-enabled=false}); este teste
 * monta o seu, ligado, sobre o mesmo banco e o mesmo gerenciador de transação.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class PublicacaoDeContaExcluidaIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";
  private static final String TOKEN_DO_AGENDADOR = "token-do-agendador-com-32-caracteres!";

  @DynamicPropertySource
  static void agendador(DynamicPropertyRegistry registro) {
    registro.add("leai.scheduler-token", () -> TOKEN_DO_AGENDADOR);
  }

  @Autowired private ObjectMapper objectMapper;
  @Autowired private JdbcTemplate jdbc;
  @Autowired private PlatformTransactionManager transacoes;

  private final MessageValidator validador = new MessageValidator();
  private Channel canal;
  private OutboxDispatcherService despachante;

  @BeforeEach
  void montarDespachante() {
    // Só o conta.excluida deste teste fica na fila do despachante.
    jdbc.update("DELETE FROM outbox_identidade");
    canal = mock(Channel.class);
    AmqpConnectionService conexao = mock(AmqpConnectionService.class);
    when(conexao.isReady()).thenReturn(true);
    when(conexao.publisherChannel()).thenReturn(canal);
    MessagingProperties propriedades = new MessagingProperties(true, "amqp://teste", "identidade");
    despachante =
        new OutboxDispatcherService(
            propriedades,
            conexao,
            new AmqpPublisherService(propriedades, conexao, validador),
            jdbc,
            transacoes);
  }

  @AfterEach
  void limparOutbox() {
    jdbc.update("DELETE FROM outbox_identidade");
  }

  /** Cadastra, pede a exclusão e vence a janela; devolve o id da conta. */
  private UUID contaVencida() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    String username = "publica_" + s;
    HttpResponse<String> cadastro =
        postJson(
            "/auth/register",
            """
            {"email":"publica.%s@exemplo.com","username":"%s","displayName":"Leitora",
             "dataNascimento":"1990-01-01","senha":"%s"}
            """
                .formatted(s, username, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(cadastro.statusCode()).isEqualTo(201);
    UUID id = UUID.fromString(objectMapper.readTree(cadastro.body()).get("id").asString());
    String token =
        objectMapper
            .readTree(
                postJson(
                        "/auth/login",
                        "{\"identificador\":\"" + username + "\",\"senha\":\"" + SENHA + "\"}",
                        "Idempotency-Key",
                        UUID.randomUUID().toString())
                    .body())
            .get("accessToken")
            .asString();
    HttpResponse<String> pedido =
        enviar(
            HttpRequest.newBuilder(uri("/me/conta"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .method(
                    "DELETE",
                    HttpRequest.BodyPublishers.ofString(
                        "{\"senha\":\"" + SENHA + "\",\"confirmacao\":true}"))
                .build());
    assertThat(pedido.statusCode()).isEqualTo(202);
    jdbc.update(
        "UPDATE usuario SET exclusao_solicitada_em = exclusao_solicitada_em - INTERVAL '31 days',"
            + " exclusao_prevista_em = exclusao_prevista_em - INTERVAL '31 days' WHERE id = ?",
        id);
    jdbc.update(
        "UPDATE exclusao_conta SET criado_em = criado_em - INTERVAL '31 days',"
            + " prevista_em = prevista_em - INTERVAL '31 days'"
            + " WHERE usuario_ref = ? AND status = 'pendente'",
        id);
    return id;
  }

  private void job() {
    HttpResponse<String> resposta =
        postJson(
            "/internal/jobs/exclusao-conta",
            "",
            "X-Scheduler-Token",
            TOKEN_DO_AGENDADOR,
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(resposta.statusCode()).isEqualTo(200);
  }

  private Map<String, Object> linhaDoEvento(UUID usuarioId) {
    return jdbc.queryForMap(
        "SELECT event_id, status, tentativas, proxima_tentativa_em, publicado_em"
            + " FROM outbox_identidade WHERE tipo = 'conta.excluida' AND chave_negocio = ?",
        "conta:" + usuarioId);
  }

  @Test
  @DisplayName("o despachante publica conta.excluida com envelope, headers e schema válidos e marca publicado")
  void publicaPeloDespachante() throws Exception {
    UUID usuarioId = contaVencida();
    job();
    UUID eventId = (UUID) linhaDoEvento(usuarioId).get("event_id");

    despachante.dispatchOnce();

    ArgumentCaptor<BasicProperties> propriedades = ArgumentCaptor.forClass(BasicProperties.class);
    ArgumentCaptor<byte[]> corpo = ArgumentCaptor.forClass(byte[].class);
    verify(canal)
        .basicPublish(
            eq(MessagingConstants.IDENTIDADE_EXCHANGE),
            eq("conta.excluida"),
            propriedades.capture(),
            corpo.capture());
    verify(canal).waitForConfirmsOrDie(5_000L);

    // O que um consumidor receberia: envelope, headers AMQP e data conferidos pelo schema.
    MessageEnvelope recebido =
        validador.parse(
            new Delivery(
                new Envelope(1L, false, MessagingConstants.IDENTIDADE_EXCHANGE, "conta.excluida"),
                propriedades.getValue(),
                corpo.getValue()));
    assertThat(recebido.eventId()).isEqualTo(eventId);
    assertThat(recebido.type()).isEqualTo("conta.excluida");
    assertThat(recebido.version()).isEqualTo(1);
    assertThat(recebido.businessKey()).isEqualTo("conta:" + usuarioId);
    // Só o id: nenhum dado pessoal sai no evento (RN-23.7).
    assertThat(recebido.data()).containsExactly(Map.entry("usuarioId", usuarioId.toString()));

    Map<String, Object> linha = linhaDoEvento(usuarioId);
    assertThat(linha.get("status")).isEqualTo("publicado");
    assertThat(linha.get("publicado_em")).isNotNull();

    // Publicado de verdade, a execução seguinte do job anonimiza o envelope guardado.
    job();
    Map<String, Object> anonimizado =
        jdbc.queryForMap(
            "SELECT chave_negocio, payload, anonimizado_em FROM outbox_identidade"
                + " WHERE event_id = ?",
            eventId);
    assertThat(anonimizado.get("chave_negocio")).isNull();
    assertThat(anonimizado.get("payload")).isNull();
    assertThat(anonimizado.get("anonimizado_em")).isNotNull();
  }

  @Test
  @DisplayName("broker sem confirm deixa conta.excluida pendente na outbox, com nova tentativa agendada")
  void semConfirmFicaPendente() throws Exception {
    UUID usuarioId = contaVencida();
    job();
    doThrow(new java.io.IOException("nack simulado"))
        .when(canal)
        .waitForConfirmsOrDie(anyLong());

    despachante.dispatchOnce();

    verify(canal)
        .basicPublish(anyString(), eq("conta.excluida"), any(BasicProperties.class), any(byte[].class));
    Map<String, Object> linha = linhaDoEvento(usuarioId);
    assertThat(linha.get("status")).isEqualTo("pendente");
    assertThat(linha.get("tentativas")).isEqualTo(1);
    assertThat(linha.get("proxima_tentativa_em")).isNotNull();
    assertThat(linha.get("publicado_em")).isNull();

    // Pendente, o job não anonimiza: o evento ainda precisa sair com o usuarioId.
    job();
    assertThat(
            jdbc.queryForObject(
                "SELECT payload::text FROM outbox_identidade WHERE chave_negocio = ?",
                String.class,
                "conta:" + usuarioId))
        .contains(usuarioId.toString());
  }
}
