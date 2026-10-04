package br.com.leai.social.recomendacao.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.leai.social.messaging.AmqpConnectionService;
import br.com.leai.social.messaging.AmqpConsumerService;
import br.com.leai.social.messaging.MessageValidator;
import br.com.leai.social.messaging.MessagingConstants;
import br.com.leai.social.messaging.MessagingProperties;
import br.com.leai.social.recomendacao.repository.RecomendacaoRepository;
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
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * {@link ConsumidorDeLivroNaEstante} sobre o {@link AmqpConsumerService} de verdade, com o canal
 * AMQP simulado: a fila nova amarrada só a {@code livro.adicionado_a_estante} no exchange de
 * {@code leitura}, com DLQ, o ack da mensagem válida e a rejeição por schema direto para a DLQ sem
 * tocar no banco (RNF-ERR-07). O efeito no banco fica em {@code RemocaoDeRecomendacoesIntegracaoTest}.
 */
class ConsumidorDeLivroNaEstanteBrokerTest {

  private static final long TAG = 11L;
  private static final String FILA = MessagingConstants.RECOMENDACOES_QUEUE;

  private final ObjectMapper json = new ObjectMapper();
  private final Channel canal = mock(Channel.class);
  private final RecomendacaoRepository repositorio = mock(RecomendacaoRepository.class);
  private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
  private DeliverCallback entrega;

  @BeforeEach
  void registraConsumidor() throws Exception {
    AmqpConnectionService conexao = mock(AmqpConnectionService.class);
    when(conexao.isReady()).thenReturn(true);
    when(conexao.consumerChannel()).thenReturn(canal);
    when(jdbc.update(anyString(), any(Object[].class))).thenReturn(1);
    AmqpConsumerService consumidor =
        new AmqpConsumerService(
            new MessagingProperties(true, "amqp://teste", "social"),
            conexao,
            new MessageValidator(),
            jdbc,
            mock(PlatformTransactionManager.class));

    new ConsumidorDeLivroNaEstante(consumidor, repositorio);

    ArgumentCaptor<DeliverCallback> captor = ArgumentCaptor.forClass(DeliverCallback.class);
    verify(canal).basicConsume(eq(FILA), captor.capture(), any(CancelCallback.class));
    entrega = captor.getValue();
  }

  @Test
  @DisplayName("a fila de recomendacoes recebe livro.adicionado_a_estante de leitura, com DLQ")
  void amarraAoEventoDaEstante() throws Exception {
    verify(canal)
        .queueBind(FILA, MessagingConstants.LEITURA_EXCHANGE, "livro.adicionado_a_estante");
    verify(canal).queueDeclare(eq(FILA), eq(true), eq(false), eq(false), any());
    verify(canal).queueBind(FILA + ".dlq", MessagingConstants.DEAD_LETTER_EXCHANGE, FILA);
  }

  @Test
  @DisplayName("mensagem valida remove as recomendacoes do livro e confirma a entrega")
  void mensagemValidaConfirma() throws Exception {
    UUID usuario = UUID.randomUUID();
    UUID livro = UUID.randomUUID();

    entrega.handle(
        "tag", delivery(Map.of("usuarioId", usuario.toString(), "livroId", livro.toString())));

    verify(repositorio).removerDoLivroNaEstante(usuario, livro);
    verify(canal).basicAck(TAG, false);
  }

  @Test
  @DisplayName("evento sem livroId e rejeitado pelo schema e vai para a DLQ sem processar")
  void schemaInvalidoVaiParaDlq() throws Exception {
    entrega.handle("tag", delivery(Map.of("usuarioId", UUID.randomUUID().toString())));

    verify(canal).basicNack(TAG, false, false);
    verify(canal, never()).basicAck(TAG, false);
    verify(repositorio, never()).removerDoLivroNaEstante(any(), any());
  }

  private Delivery delivery(Map<String, Object> dados) throws Exception {
    UUID eventId = UUID.randomUUID();
    UUID correlationId = UUID.randomUUID();
    String tipo = MessagingConstants.EVENTO_LIVRO_ADICIONADO_A_ESTANTE;
    String chave = "estante:" + dados.get("usuarioId") + ":" + dados.get("livroId");
    Map<String, Object> corpo = new LinkedHashMap<>();
    corpo.put("eventId", eventId.toString());
    corpo.put("type", tipo);
    corpo.put("version", 1);
    corpo.put("occurredAt", "2026-10-04T12:00:00Z");
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
        new Envelope(TAG, false, MessagingConstants.LEITURA_EXCHANGE, tipo),
        propriedades,
        json.writeValueAsBytes(corpo));
  }
}
