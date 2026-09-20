package br.com.leai.identidade.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.rabbitmq.client.AMQP.BasicProperties;
import com.rabbitmq.client.Channel;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/** Publishes durable messages to the owning domain exchange and waits for confirm. */
public final class AmqpPublisherService {

  private final MessagingProperties properties;
  private final AmqpConnectionService connection;
  private final MessageValidator validator;
  private final ObjectMapper mapper =
      new ObjectMapper()
          .findAndRegisterModules()
          .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

  public AmqpPublisherService(
      MessagingProperties properties, AmqpConnectionService connection, MessageValidator validator) {
    this.properties = properties;
    this.connection = connection;
    this.validator = validator;
  }

  public void publish(MessageEnvelope envelope) {
    validator.validate(envelope);
    try {
      BasicProperties messageProperties =
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
      Channel channel = connection.publisherChannel();
      channel.basicPublish(
          MessagingConstants.exchangeFor(properties.serviceName()),
          envelope.type(),
          messageProperties,
          mapper.writeValueAsString(envelope).getBytes(StandardCharsets.UTF_8));
      channel.waitForConfirmsOrDie(5_000L);
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Publicacao AMQP interrompida", exception);
    } catch (Exception exception) {
      throw new IllegalStateException("Falha no confirm da publicacao AMQP", exception);
    }
  }
}
