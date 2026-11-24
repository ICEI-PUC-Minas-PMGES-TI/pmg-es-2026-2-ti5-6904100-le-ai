package br.com.leai.social.conta.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.leai.social.integracao.IntegracaoComPostgres;
import br.com.leai.social.messaging.AmqpConnectionService;
import br.com.leai.social.messaging.AmqpConsumerService;
import br.com.leai.social.messaging.MessageValidator;
import br.com.leai.social.messaging.MessagingConstants;
import br.com.leai.social.messaging.MessagingProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.AMQP.BasicProperties;
import com.rabbitmq.client.CancelCallback;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.DeliverCallback;
import com.rabbitmq.client.Delivery;
import com.rabbitmq.client.Envelope;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * {@code conta.excluida} pelo caminho de verdade (L-17, F-CONTA-2): {@link AmqpConsumerService} com
 * o {@link MessageValidator} real, o recibo em {@code social.mensagem_processada} e a transação do
 * Postgres de teste, só com o canal AMQP simulado. É o padrão de {@code
 * ConsumidorDeNotificacaoBrokerTest} e {@code ConsumidorDeLivroNaEstanteBrokerTest}, com banco real
 * no lugar do {@code JdbcTemplate} simulado, para o recibo e a remoção serem os gravados.
 *
 * <p>A matriz completa de remoção continua em {@link ConsumidorDeContaExcluidaIntegracaoTest}
 * (handler chamado direto); aqui a massa é a mínima para provar ACK, recibo, entrega duplicada e
 * DLQ.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class ConsumoDeContaExcluidaPeloBrokerIntegracaoTest extends IntegracaoComPostgres {

  private static final String FILA = MessagingConstants.CONTA_QUEUE;
  private static final String RECIBOS =
      "SELECT count(*) FROM mensagem_processada WHERE consumidor = ? AND event_id = ?";

  private final ObjectMapper json = new ObjectMapper();
  private final Channel canal = mock(Channel.class);
  private DeliverCallback entrega;
  private long proximaTag = 1;

  @Autowired private JdbcTemplate jdbc;
  @Autowired private PlatformTransactionManager transacoes;

  @BeforeEach
  void registraConsumidor() throws Exception {
    AmqpConnectionService conexao = mock(AmqpConnectionService.class);
    when(conexao.isReady()).thenReturn(true);
    when(conexao.consumerChannel()).thenReturn(canal);
    AmqpConsumerService consumidor =
        new AmqpConsumerService(
            new MessagingProperties(true, "amqp://teste", "social"),
            conexao,
            new MessageValidator(),
            jdbc,
            transacoes);

    new ConsumidorDeContaExcluida(consumidor, jdbc);

    ArgumentCaptor<DeliverCallback> captor = ArgumentCaptor.forClass(DeliverCallback.class);
    verify(canal).basicConsume(eq(FILA), captor.capture(), any(CancelCallback.class));
    entrega = captor.getValue();
  }

  @Test
  @DisplayName("a fila leai.social.conta recebe conta.excluida do identidade, com DLQ")
  void topologia() throws Exception {
    verify(canal)
        .queueBind(
            FILA, MessagingConstants.IDENTIDADE_EXCHANGE, MessagingConstants.EVENTO_CONTA_EXCLUIDA);
    verify(canal).queueDeclare(eq(FILA), eq(true), eq(false), eq(false), any());
    verify(canal).queueDeclare(eq(FILA + ".dlq"), eq(true), eq(false), eq(false), any());
    verify(canal).queueBind(FILA + ".dlq", MessagingConstants.DEAD_LETTER_EXCHANGE, FILA);
  }

  @Test
  @DisplayName("entrega válida pelo consumidor AMQP: ACK, recibo do evento e só o da conta some")
  void entregaValida() throws Exception {
    UUID excluida = UUID.randomUUID();
    UUID outra = UUID.randomUUID();
    lista(excluida);
    lista(outra);
    UUID eventId = UUID.randomUUID();
    long tag = proximaTag++;

    entrega.handle("tag", delivery(tag, eventId, Map.of("usuarioId", excluida.toString())));

    verify(canal).basicAck(tag, false);
    verify(canal, never()).basicNack(anyLong(), anyBoolean(), anyBoolean());
    assertThat(contar(RECIBOS, MessagingConstants.CONTA_CONSUMER_NAME, eventId)).isEqualTo(1);
    assertThat(contar("SELECT count(*) FROM lista WHERE usuario_id = ?", excluida)).isZero();
    assertThat(contar("SELECT count(*) FROM lista WHERE usuario_id = ?", outra)).isEqualTo(1);
  }

  @Test
  @DisplayName("mesmo eventId entregue de novo: dois ACK, um recibo e o handler não roda na segunda")
  void entregaDuplicada() throws Exception {
    UUID excluida = UUID.randomUUID();
    lista(excluida);
    UUID eventId = UUID.randomUUID();
    Map<String, Object> dados = Map.of("usuarioId", excluida.toString());
    long primeira = proximaTag++;
    long segunda = proximaTag++;

    entrega.handle("tag", delivery(primeira, eventId, dados));
    // Uma linha nova da conta entre as duas entregas: se o handler rodasse de novo, ela sumiria.
    lista(excluida);
    entrega.handle("tag", delivery(segunda, eventId, dados));

    verify(canal).basicAck(primeira, false);
    verify(canal).basicAck(segunda, false);
    assertThat(contar(RECIBOS, MessagingConstants.CONTA_CONSUMER_NAME, eventId)).isEqualTo(1);
    assertThat(contar("SELECT count(*) FROM lista WHERE usuario_id = ?", excluida)).isEqualTo(1);
  }

  @Test
  @DisplayName("data fora do schema (e-mail a mais ou sem usuarioId) vai para a DLQ sem recibo e sem apagar nada")
  void schemaInvalidoVaiParaDlq() throws Exception {
    UUID excluida = UUID.randomUUID();
    lista(excluida);
    Map<String, Object> comEmail = new LinkedHashMap<>();
    comEmail.put("usuarioId", excluida.toString());
    comEmail.put("email", "vazou@exemplo.com");

    for (Map<String, Object> dados : java.util.List.of(comEmail, Map.<String, Object>of())) {
      UUID eventId = UUID.randomUUID();
      long tag = proximaTag++;

      entrega.handle("tag", delivery(tag, eventId, dados));

      verify(canal).basicNack(tag, false, false);
      verify(canal, never()).basicAck(tag, false);
      assertThat(contar(RECIBOS, MessagingConstants.CONTA_CONSUMER_NAME, eventId)).isZero();
    }
    assertThat(contar("SELECT count(*) FROM lista WHERE usuario_id = ?", excluida)).isEqualTo(1);
  }

  private void lista(UUID dono) {
    jdbc.update("INSERT INTO lista (usuario_id, titulo) VALUES (?, 'Lista')", dono);
  }

  private long contar(String sql, Object... argumentos) {
    return jdbc.queryForObject(sql, Long.class, argumentos);
  }

  /** Envelope como o despachante do {@code identidade} publica, com os headers que o validador confere. */
  private Delivery delivery(long tag, UUID eventId, Map<String, Object> dados) throws Exception {
    UUID correlationId = UUID.randomUUID();
    String tipo = MessagingConstants.EVENTO_CONTA_EXCLUIDA;
    String chave = "conta:" + dados.getOrDefault("usuarioId", UUID.randomUUID());
    Map<String, Object> corpo = new LinkedHashMap<>();
    corpo.put("eventId", eventId.toString());
    corpo.put("type", tipo);
    corpo.put("version", 1);
    corpo.put("occurredAt", "2026-11-20T06:00:00Z");
    corpo.put("correlationId", correlationId.toString());
    corpo.put("businessKey", chave);
    corpo.put("data", dados);
    BasicProperties propriedades =
        new BasicProperties.Builder()
            .messageId(eventId.toString())
            .correlationId(correlationId.toString())
            .type(tipo)
            .contentType("application/json")
            .deliveryMode(2)
            .headers(Map.of("x-event-version", 1, "x-business-key", chave))
            .build();
    return new Delivery(
        new Envelope(tag, false, MessagingConstants.IDENTIDADE_EXCHANGE, tipo),
        propriedades,
        json.writeValueAsBytes(corpo));
  }
}
