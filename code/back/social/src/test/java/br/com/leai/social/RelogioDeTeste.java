package br.com.leai.social;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Relógio manual para os testes de janela de tempo. Sem ele, verificar que um limite expira
 * exigiria dormir de verdade. Porte de {@code identidade.RelogioDeTeste}.
 */
public final class RelogioDeTeste extends Clock {

  private Instant agora = Instant.parse("2026-09-25T12:00:00Z");

  public void avancar(Duration duracao) {
    agora = agora.plus(duracao);
  }

  @Override
  public Instant instant() {
    return agora;
  }

  @Override
  public ZoneId getZone() {
    return ZoneOffset.UTC;
  }

  @Override
  public Clock withZone(ZoneId zona) {
    return this;
  }
}
