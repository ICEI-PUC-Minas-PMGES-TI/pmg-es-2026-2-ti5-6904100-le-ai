package br.com.leai.identidade;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Relógio manual para os testes de janela de tempo. Sem ele, verificar que um limite expira
 * exigiria dormir de verdade, e um teste que dorme um minuto não entra em pipeline.
 */
public final class RelogioDeTeste extends Clock {

  private Instant agora = Instant.parse("2026-09-14T12:00:00Z");

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
