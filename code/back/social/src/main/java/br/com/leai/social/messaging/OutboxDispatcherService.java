package br.com.leai.social.messaging;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.SmartLifecycle;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Polls the local outbox and keeps retry timing in durable outbox columns. */
public final class OutboxDispatcherService implements SmartLifecycle {

  private static final int BATCH_SIZE = 50;
  private static final String OUTBOX = "social.outbox_social";
  private final Logger logger = LoggerFactory.getLogger(OutboxDispatcherService.class);
  private final MessagingProperties properties;
  private final AmqpConnectionService connection;
  private final AmqpPublisherService publisher;
  private final JdbcTemplate jdbcTemplate;
  private final TransactionTemplate transaction;
  private final ScheduledExecutorService executor =
      Executors.newSingleThreadScheduledExecutor(
          runnable -> {
            Thread thread = new Thread(runnable, "social-outbox-dispatcher");
            thread.setDaemon(true);
            return thread;
          });
  private volatile boolean running;

  public OutboxDispatcherService(
      MessagingProperties properties,
      AmqpConnectionService connection,
      AmqpPublisherService publisher,
      JdbcTemplate jdbcTemplate,
      PlatformTransactionManager transactionManager) {
    this.properties = properties;
    this.connection = connection;
    this.publisher = publisher;
    this.jdbcTemplate = jdbcTemplate;
    this.transaction = new TransactionTemplate(transactionManager);
  }

  @Override
  public void start() {
    if (!properties.amqpEnabled() || running) {
      return;
    }
    running = true;
    executor.scheduleWithFixedDelay(this::dispatchSafely, 0, 1, TimeUnit.SECONDS);
  }

  @Override
  public void stop() {
    running = false;
    executor.shutdownNow();
  }

  @Override
  public boolean isRunning() {
    return running;
  }

  @Override
  public int getPhase() {
    return Integer.MAX_VALUE;
  }

  void dispatchOnce() {
    if (!properties.amqpEnabled() || !connection.isReady()) {
      return;
    }
    transaction.executeWithoutResult(
        status -> {
          List<OutboxRow> rows = jdbcTemplate.query(selectSql(), ROW_MAPPER);
          Instant now = Instant.now();
          for (OutboxRow row : rows) {
            if (row.nextAttemptAt() != null && row.nextAttemptAt().isAfter(now)) {
              continue;
            }
            try {
              withCorrelationId(row.correlationId(), () -> publisher.publish(row.envelope()));
              jdbcTemplate.update(
                  "UPDATE " + OUTBOX + " SET status = 'publicado', publicado_em = now(), "
                      + "proxima_tentativa_em = NULL "
                      + "WHERE event_id = ? AND status = 'pendente'",
                  row.eventId());
            } catch (Exception exception) {
              long delayMillis = retryDelayMillis(row.attempts() + 1);
              jdbcTemplate.update(
                  "UPDATE " + OUTBOX + " SET tentativas = tentativas + 1, "
                      + "proxima_tentativa_em = now() + (? * interval '1 millisecond') "
                      + "WHERE event_id = ? AND status = 'pendente'",
                  delayMillis,
                  row.eventId());
              logger.warn(
                  "Falha ao publicar {}; tentativa {}: {}",
                  row.eventId(),
                  row.attempts() + 1,
                  exception.getMessage());
            }
          }
        });
  }

  static long retryDelayMillis(int attempt) {
    if (attempt <= 1) return 1_000L;
    if (attempt == 2) return 5_000L;
    if (attempt == 3) return 15_000L;
    return 60_000L;
  }

  private String selectSql() {
    return "SELECT event_id, tipo, versao, chave_negocio, correlation_id, payload, tentativas, criado_em, proxima_tentativa_em "
        + "FROM " + OUTBOX + " WHERE status = 'pendente' ORDER BY criado_em LIMIT " + BATCH_SIZE
        + " FOR UPDATE SKIP LOCKED";
  }

  private static final RowMapper<OutboxRow> ROW_MAPPER =
      (ResultSet resultSet, int rowNumber) -> {
        Object payload = resultSet.getObject("payload");
        String payloadJson = payload == null ? "{}" : payload.toString();
        try {
          @SuppressWarnings("unchecked")
          Map<String, Object> data =
              new com.fasterxml.jackson.databind.ObjectMapper().readValue(payloadJson, Map.class);
          return new OutboxRow(
              resultSet.getObject("event_id", UUID.class),
              resultSet.getString("tipo"),
              resultSet.getInt("versao"),
              resultSet.getString("chave_negocio"),
              resultSet.getObject("correlation_id", UUID.class),
              data,
              resultSet.getInt("tentativas"),
               resultSet.getObject("criado_em", java.time.OffsetDateTime.class).toInstant(),
               resultSet.getObject("proxima_tentativa_em", java.time.OffsetDateTime.class) == null
                   ? null
                   : resultSet.getObject("proxima_tentativa_em", java.time.OffsetDateTime.class).toInstant());
        } catch (Exception exception) {
          throw new SQLException("Payload da outbox nao e JSON valido", exception);
        }
      };

  record OutboxRow(
      UUID eventId,
      String type,
      int version,
      String businessKey,
      UUID correlationId,
      Map<String, Object> data,
      int attempts,
      Instant createdAt,
      Instant nextAttemptAt) {

    MessageEnvelope envelope() {
      return new MessageEnvelope(
          eventId,
          type,
          version,
          OffsetDateTime.ofInstant(createdAt, ZoneOffset.UTC),
          correlationId,
          businessKey,
          data);
    }
  }

  private void dispatchSafely() {
    try {
      dispatchOnce();
    } catch (Exception exception) {
      logger.warn("Falha no ciclo da outbox: {}", exception.getMessage());
    }
  }

  private void withCorrelationId(UUID correlationId, Runnable operation) {
    String previous = MDC.get("correlationId");
    MDC.put("correlationId", correlationId.toString());
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
}
