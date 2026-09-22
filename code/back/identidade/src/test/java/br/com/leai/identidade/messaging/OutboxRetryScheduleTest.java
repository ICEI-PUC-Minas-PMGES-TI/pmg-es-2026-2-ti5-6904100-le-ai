package br.com.leai.identidade.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OutboxRetryScheduleTest {

  @Test
  @DisplayName("calcula proxima tentativa a partir do estado persistido")
  void calculaBackoffPersistente() {
    Instant createdAt = Instant.parse("2026-09-16T12:00:00Z");
    OutboxDispatcherService.OutboxRow row =
        new OutboxDispatcherService.OutboxRow(
            UUID.randomUUID(),
            "ping.teste",
            1,
            "ping:1",
            UUID.randomUUID(),
            Map.of("mensagem", "ping"),
            2,
            createdAt,
            null);

    assertThat(OutboxDispatcherService.retryDelayMillis(row.attempts() + 1))
        .isEqualTo(15_000L);
  }
}
