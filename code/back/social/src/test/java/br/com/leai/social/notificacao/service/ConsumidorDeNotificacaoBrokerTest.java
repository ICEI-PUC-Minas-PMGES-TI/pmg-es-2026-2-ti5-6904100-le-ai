package br.com.leai.social.notificacao.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.leai.social.messaging.AmqpConnectionService;
import br.com.leai.social.messaging.AmqpConsumerService;
import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.messaging.MessageValidator;
import br.com.leai.social.messaging.MessagingConstants;
import br.com.leai.social.messaging.MessagingProperties;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste;
import br.com.leai.social.notificacao.EventosDeNotificacaoDeTeste.Fato;
import br.com.leai.social.notificacao.model.EventoDeNotificacao;
import br.com.leai.social.notificacao.model.NovaNotificacao;
import br.com.leai.social.notificacao.model.TipoNotificacao;
import br.com.leai.social.notificacao.repository.NotificacaoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
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
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * O consumidor de notificações montado sobre o {@link AmqpConsumerService} de verdade, com o canal
 * AMQP simulado: prova a topologia (uma fila, três exchanges de origem), a rejeição por schema
 * antes de qualquer processamento com envio à DLQ (RNF-SEC-32, RNF-ERR-07) e o ack da mensagem
 * válida. Idempotência e gravação ficam em {@code ConsumidorDeNotificacaoIntegracaoTest}, contra
 * Postgres real.
 */
class ConsumidorDeNotificacaoBrokerTest {

  private static final long TAG = 7L;

  private final ObjectMapper json =
      new ObjectMapper().findAndRegisterModules().disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
  private final Channel canal = mock(Channel.class);
  private final NotificacaoRepository repositorio = mock(NotificacaoRepository.class);
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private DeliverCallback entrega;

  @BeforeEach
  void registraConsumidor() throws Exception {
    AmqpConnectionService conexao = mock(AmqpConnectionService.class);
    when(conexao.isReady()).thenReturn(true);
    when(conexao.consumerChannel()).thenReturn(canal);
    // Recibo novo em mensagem_processada: o handler roda.
    when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
    AmqpConsumerService consumidor =
        new AmqpConsumerService(
            new MessagingProperties(true, "amqp://teste", "social"),
            conexao,
            new MessageValidator(),
            jdbc,
            mock(PlatformTransactionManager.class));

    new ConsumidorDeNotificacao(consumidor, repositorio, evento -> {});

    ArgumentCaptor<DeliverCallback> captor = ArgumentCaptor.forClass(DeliverCallback.class);
    verify(canal)
        .basicConsume(
            eq(MessagingConstants.NOTIFICACOES_QUEUE), captor.capture(), any(CancelCallback.class));
    entrega = captor.getValue();
  }

  @Test
  @DisplayName("a fila de notificacoes recebe os eventos de identidade, leitura e social")
  void amarraAsTresOrigens() throws Exception {
    String fila = MessagingConstants.NOTIFICACOES_QUEUE;
    verify(canal).queueBind(fila, MessagingConstants.IDENTIDADE_EXCHANGE, "seguidor.novo");
    verify(canal).queueBind(fila, MessagingConstants.IDENTIDADE_EXCHANGE, "solicitacao.criada");
    verify(canal).queueBind(fila, MessagingConstants.IDENTIDADE_EXCHANGE, "solicitacao.aceita");
    verify(canal).queueBind(fila, MessagingConstants.SOCIAL_EXCHANGE, "atividade.curtida");
    verify(canal).queueBind(fila, MessagingConstants.SOCIAL_EXCHANGE, "atividade.comentada");
    verify(canal).queueBind(fila, MessagingConstants.SOCIAL_EXCHANGE, "comentario.respondido");
    verify(canal).queueBind(fila, MessagingConstants.LEITURA_EXCHANGE, "leitura.em_risco");
    verify(canal).queueBind(fila, MessagingConstants.LEITURA_EXCHANGE, "leitura.expirada");
    verify(canal).queueDeclare(eq(fila), eq(true), eq(false), eq(false), any());
    verify(canal).queueBind(fila + ".dlq", MessagingConstants.DEAD_LETTER_EXCHANGE, fila);
  }

  @Test
  @DisplayName("mensagem valida grava a notificacao e confirma a entrega")
  void mensagemValidaConfirma() throws Exception {
    UUID destinatario = UUID.randomUUID();
    MessageEnvelope envelope =
        EventosDeNotificacaoDeTeste.envelope(
            EventoDeNotificacao.LEITURA_EM_RISCO, Fato.para(destinatario));

    entrega.handle("tag", delivery(envelope, envelope.data()));

    ArgumentCaptor<NovaNotificacao> gravada = ArgumentCaptor.forClass(NovaNotificacao.class);
    verify(repositorio).inserir(gravada.capture());
    assertThat(gravada.getValue().destinatarioId()).isEqualTo(destinatario);
    assertThat(gravada.getValue().tipo()).isEqualTo(TipoNotificacao.LEITURA_EM_RISCO);
    verify(canal).basicAck(TAG, false);
  }

  @Test
  @DisplayName("limiar fora de 20/30 e rejeitado pelo schema e vai para a DLQ sem processar")
  void schemaInvalidoVaiParaDlq() throws Exception {
    MessageEnvelope envelope =
        EventosDeNotificacaoDeTeste.envelope(
            EventoDeNotificacao.LEITURA_EM_RISCO, Fato.para(UUID.randomUUID()));
    Map<String, Object> invalido = new LinkedHashMap<>(envelope.data());
    invalido.put("limiarDias", 25);

    entrega.handle("tag", delivery(envelope, invalido));

    verify(canal).basicNack(TAG, false, false);
    verify(canal, never()).basicAck(TAG, false);
    verify(repositorio, never()).inserir(any());
  }

  @Test
  @DisplayName("evento sem destinatarioId e rejeitado pelo schema e vai para a DLQ")
  void semDestinatarioVaiParaDlq() throws Exception {
    MessageEnvelope envelope =
        EventosDeNotificacaoDeTeste.envelope(
            EventoDeNotificacao.SEGUIDOR_NOVO, Fato.para(UUID.randomUUID()));
    Map<String, Object> invalido = new LinkedHashMap<>(envelope.data());
    invalido.remove("destinatarioId");

    entrega.handle("tag", delivery(envelope, invalido));

    verify(canal).basicNack(TAG, false, false);
    verify(repositorio, never()).inserir(any());
  }

  private Delivery delivery(MessageEnvelope envelope, Map<String, Object> dados) throws Exception {
    Map<String, Object> corpo = new LinkedHashMap<>();
    corpo.put("eventId", envelope.eventId());
    corpo.put("type", envelope.type());
    corpo.put("version", envelope.version());
    corpo.put("occurredAt", envelope.occurredAt());
    corpo.put("correlationId", envelope.correlationId());
    corpo.put("businessKey", envelope.businessKey());
    corpo.put("data", dados);
    BasicProperties propriedades =
        new BasicProperties.Builder()
            .messageId(envelope.eventId().toString())
            .correlationId(envelope.correlationId().toString())
            .type(envelope.type())
            .contentType("application/json")
            .deliveryMode(2)
            .headers(
                Map.of(
                    "x-event-version", envelope.version(),
                    "x-business-key", envelope.businessKey()))
            .build();
    return new Delivery(
        new Envelope(TAG, false, MessagingConstants.LEITURA_EXCHANGE, envelope.type()),
        propriedades,
        json.writeValueAsBytes(corpo));
  }
}
