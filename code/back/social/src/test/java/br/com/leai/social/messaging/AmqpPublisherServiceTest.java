package br.com.leai.social.messaging;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rabbitmq.client.AMQP.BasicProperties;
import com.rabbitmq.client.Channel;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AmqpPublisherServiceTest {

  @Test
  @DisplayName("publica mensagem persistente e aguarda publisher confirm")
  void publicaComConfirm() throws Exception {
    Channel channel = mock(Channel.class);
    AmqpConnectionService connection = mock(AmqpConnectionService.class);
    when(connection.publisherChannel()).thenReturn(channel);
    MessageValidator validator = mock(MessageValidator.class);
    AmqpPublisherService publisher =
        new AmqpPublisherService(
            new MessagingProperties(true, "amqp://broker", "social"),
            connection,
            validator);

    publisher.publish(envelope());

    verify(channel)
        .basicPublish(
            eq(MessagingConstants.SOCIAL_EXCHANGE),
            eq("ping.teste"),
            any(BasicProperties.class),
            any(byte[].class));
    verify(channel).waitForConfirmsOrDie(5_000L);
  }

  @Test
  @DisplayName("falha quando o broker rejeita o publisher confirm")
  void rejeitaSemConfirm() throws Exception {
    Channel channel = mock(Channel.class);
    AmqpConnectionService connection = mock(AmqpConnectionService.class);
    when(connection.publisherChannel()).thenReturn(channel);
    doThrow(new RuntimeException("nack"))
        .when(channel)
        .waitForConfirmsOrDie(5_000L);
    AmqpPublisherService publisher =
        new AmqpPublisherService(
            new MessagingProperties(true, "amqp://broker", "social"),
            connection,
            mock(MessageValidator.class));

    assertThatThrownBy(() -> publisher.publish(envelope()))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("confirm");
  }

  private static MessageEnvelope envelope() {
    UUID eventId = UUID.fromString("01994c25-83cd-7d41-a9b4-1d9b71f34560");
    return new MessageEnvelope(
        eventId,
        "ping.teste",
        1,
        OffsetDateTime.parse("2026-09-16T12:00:00Z"),
        UUID.fromString("16aa3308-daee-4638-b220-c306484f6a9c"),
        "ping:" + eventId,
        Map.of("mensagem", "ping"));
  }
}
