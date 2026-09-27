package br.com.leai.social.messaging;

import com.rabbitmq.client.BuiltinExchangeType;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Delivery;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.MDC;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Reusable consumer wiring: validation, idempotent receipt, retry and DLQ. */
public final class AmqpConsumerService {

  private static final long[] RETRY_DELAYS_MILLIS = {1_000L, 5_000L, 15_000L};
  private final Logger logger = LoggerFactory.getLogger(AmqpConsumerService.class);
  private final MessagingProperties properties;
  private final AmqpConnectionService connection;
  private final MessageValidator validator;
  private final JdbcTemplate jdbcTemplate;
  private final TransactionTemplate transaction;
  private final List<Registration> registrations = new CopyOnWriteArrayList<>();
  private final Map<Channel, Set<Registration>> startedRegistrations =
      new ConcurrentHashMap<>();

  public AmqpConsumerService(
      MessagingProperties properties,
      AmqpConnectionService connection,
      MessageValidator validator,
      JdbcTemplate jdbcTemplate,
      PlatformTransactionManager transactionManager) {
    this.properties = properties;
    this.connection = connection;
    this.validator = validator;
    this.jdbcTemplate = jdbcTemplate;
    this.transaction = new TransactionTemplate(transactionManager);
    connection.onConsumerReady(this::startOnChannel);
  }

  public void register(ConsumerDefinition definition, MessageHandler handler) {
    Registration registration = new Registration(definition, handler);
    registrations.add(registration);
    if (connection.isReady()) {
      startOnChannel(connection.consumerChannel());
    }
  }

  private void startOnChannel(Channel channel) {
    if (!properties.amqpEnabled()) {
      return;
    }
    Set<Registration> started =
        startedRegistrations.computeIfAbsent(channel, ignored -> ConcurrentHashMap.newKeySet());
    registrations.forEach(
        registration -> {
          if (started.add(registration)) {
            try {
              startRegistration(channel, registration);
            } catch (RuntimeException exception) {
              started.remove(registration);
              throw exception;
            }
          }
        });
  }

  private void startRegistration(Channel channel, Registration registration) {
    try {
      ConsumerDefinition definition = registration.definition();
      channel.exchangeDeclare(
          MessagingConstants.DEAD_LETTER_EXCHANGE, BuiltinExchangeType.DIRECT, true, false, null);
      String dlq = definition.queue() + ".dlq";
      channel.queueDeclare(dlq, true, false, false, null);
      channel.queueBind(dlq, MessagingConstants.DEAD_LETTER_EXCHANGE, definition.queue());
      channel.queueDeclare(
          definition.queue(), true, false, false, MessagingConstants.deadLetterArguments(definition.queue()));
      for (Map.Entry<String, List<String>> binding :
          definition.routingKeysByExchange().entrySet()) {
        channel.exchangeDeclare(binding.getKey(), BuiltinExchangeType.TOPIC, true, false, null);
        for (String routingKey : binding.getValue()) {
          channel.queueBind(definition.queue(), binding.getKey(), routingKey);
        }
      }
      channel.basicQos(1);
      channel.basicConsume(
          definition.queue(),
          (consumerTag, delivery) ->
              handle(channel, definition, registration.handler(), delivery),
          consumerTag -> logger.warn("Consumidor cancelado: {}", consumerTag));
    } catch (IOException exception) {
      throw new IllegalStateException(
          "Nao foi possivel declarar consumidor " + registration.definition().queue(), exception);
    }
  }

  private void handle(
      Channel channel, ConsumerDefinition definition, MessageHandler handler, Delivery delivery) {
    try {
      MessageEnvelope envelope = validator.parse(delivery);
      withCorrelationId(
          envelope,
          () -> {
            processOnce(definition.consumerName(), envelope, handler);
            channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
          });
    } catch (InvalidMessageException exception) {
      nackToDlq(channel, delivery);
    } catch (Exception exception) {
      retry(channel, definition, handler, delivery, exception);
    }
  }

  private void retry(
      Channel channel,
      ConsumerDefinition definition,
      MessageHandler handler,
      Delivery delivery,
      Exception firstFailure) {
    Exception failure = firstFailure;
    for (long delay : RETRY_DELAYS_MILLIS) {
      try {
        Thread.sleep(delay);
        MessageEnvelope envelope = validator.parse(delivery);
        withCorrelationId(
            envelope,
            () -> {
              processOnce(definition.consumerName(), envelope, handler);
              channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
            });
        return;
      } catch (InvalidMessageException exception) {
        nackToDlq(channel, delivery);
        return;
      } catch (Exception exception) {
        failure = exception;
      }
    }
    logger.error("Mensagem enviada a DLQ apos retry: {}", failure.getMessage());
    nackToDlq(channel, delivery);
  }

  private void processOnce(String consumerName, MessageEnvelope envelope, MessageHandler handler) {
    transaction.executeWithoutResult(
        status -> {
          int inserted =
              jdbcTemplate.update(
                  "INSERT INTO social.mensagem_processada (consumidor, event_id, processado_em) "
                      + "VALUES (?, ?, now()) ON CONFLICT (consumidor, event_id) DO NOTHING",
                  consumerName,
                  envelope.eventId());
          if (inserted == 1) {
            try {
              handler.handle(envelope);
            } catch (Exception exception) {
              throw new ConsumerProcessingException(exception);
            }
          }
        });
  }

  private void nackToDlq(Channel channel, Delivery delivery) {
    try {
      channel.basicNack(delivery.getEnvelope().getDeliveryTag(), false, false);
    } catch (IOException exception) {
      logger.error("Nao foi possivel confirmar envio para DLQ", exception);
    }
  }

  private void withCorrelationId(MessageEnvelope envelope, CorrelatedOperation operation)
      throws Exception {
    String previous = MDC.get("correlationId");
    MDC.put("correlationId", envelope.correlationId().toString());
    try {
      operation.run();
    } finally {
      if (previous == null) {
        MDC.remove("correlationId");
      } else {
        MDC.put("correlationId", previous);
      }
    }
  }

  @FunctionalInterface
  private interface CorrelatedOperation {
    void run() throws Exception;
  }

  private record Registration(ConsumerDefinition definition, MessageHandler handler) {}

  private static final class ConsumerProcessingException extends RuntimeException {
    private ConsumerProcessingException(Exception cause) {
      super(cause);
    }
  }
}
