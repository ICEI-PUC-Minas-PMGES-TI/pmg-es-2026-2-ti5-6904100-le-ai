package br.com.leai.social.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.rabbitmq.client.AMQP.BasicProperties;
import com.rabbitmq.client.Delivery;
import com.rabbitmq.client.Envelope;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MessageValidatorTest {

  private static final UUID EVENT_ID = UUID.randomUUID();
  private static final UUID CORRELATION_ID = UUID.randomUUID();
  private static final String BUSINESS_KEY = "ping:" + EVENT_ID;

  @Test
  @DisplayName("valida envelope, schema de dados e headers AMQP")
  void validaMensagemCompleta() {
    MessageEnvelope envelope = envelope();

    MessageValidator validator = new MessageValidator();
    validator.validate(envelope);
    MessageEnvelope parsed = validator.parse(delivery(envelope, properties(envelope)));

    assertThat(parsed).isEqualTo(envelope);
  }

  @Test
  @DisplayName("rejeita schema de dados desconhecido")
  void rejeitaSchemaDesconhecido() {
    MessageEnvelope envelope =
        new MessageEnvelope(
            EVENT_ID,
            "evento.futuro",
            1,
            OffsetDateTime.parse("2026-09-16T12:00:00Z"),
            CORRELATION_ID,
            BUSINESS_KEY,
            Map.of());

    assertThatThrownBy(() -> new MessageValidator().parse(delivery(envelope, properties(envelope))))
        .isInstanceOf(InvalidMessageException.class)
        .hasMessageContaining("Schema nao registrado");
  }

  private static MessageEnvelope envelope() {
    return new MessageEnvelope(
        EVENT_ID,
        "ping.teste",
        1,
        OffsetDateTime.parse("2026-09-16T12:00:00Z"),
        CORRELATION_ID,
        BUSINESS_KEY,
        Map.of("mensagem", "ping"));
  }

  private static BasicProperties properties(MessageEnvelope envelope) {
    return new BasicProperties.Builder()
        .messageId(envelope.eventId().toString())
        .correlationId(envelope.correlationId().toString())
        .type(envelope.type())
        .contentType("application/json")
        .deliveryMode(2)
        .headers(Map.of("x-event-version", envelope.version(), "x-business-key", envelope.businessKey()))
        .build();
  }

  private static Delivery delivery(MessageEnvelope envelope, BasicProperties properties) {
    String body =
        "{\"eventId\":\""
            + envelope.eventId()
            + "\",\"type\":\""
            + envelope.type()
            + "\",\"version\":"
            + envelope.version()
            + ",\"occurredAt\":\""
            + envelope.occurredAt()
            + "\",\"correlationId\":\""
            + envelope.correlationId()
            + "\",\"businessKey\":\""
            + envelope.businessKey()
            + "\",\"data\":"
            + (envelope.data().isEmpty() ? "{}" : "{\"mensagem\":\"ping\"}")
            + "}";
    return new Delivery(
        new Envelope(1L, false, MessagingConstants.SOCIAL_EXCHANGE, envelope.type()),
        properties,
        body.getBytes(StandardCharsets.UTF_8));
  }
}
