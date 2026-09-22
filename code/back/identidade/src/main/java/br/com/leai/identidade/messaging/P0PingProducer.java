package br.com.leai.identidade.messaging;

import br.com.leai.identidade.common.CorrelationIdFilter;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Internal P0 smoke producer. It has no HTTP endpoint and only exists when explicitly enabled.
 */
@Service
@ConditionalOnProperty(prefix = "leai", name = "p0-ping-enabled", havingValue = "true")
public final class P0PingProducer {

  private final JdbcTemplate jdbcTemplate;
  private final MessagingProperties properties;

  public P0PingProducer(JdbcTemplate jdbcTemplate, MessagingProperties properties) {
    this.jdbcTemplate = jdbcTemplate;
    this.properties = properties;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void publishSmokePing() {
    if (properties.amqpEnabled()) {
      writePingToOutbox();
    }
  }

  public UUID writePingToOutbox() {
    UUID eventId = UUID.randomUUID();
    UUID correlationId = correlationId();
    jdbcTemplate.update(
        "INSERT INTO identidade.outbox_identidade "
            + "(event_id, tipo, versao, chave_negocio, correlation_id, payload) "
            + "VALUES (?, 'ping.teste', 1, ?, ?, ?::jsonb)",
        eventId,
        "ping:" + eventId,
        correlationId,
        "{\"mensagem\":\"ping\"}");
    return eventId;
  }

  private UUID correlationId() {
    try {
      return UUID.fromString(CorrelationIdFilter.atual());
    } catch (IllegalArgumentException exception) {
      return UUID.randomUUID();
    }
  }
}
