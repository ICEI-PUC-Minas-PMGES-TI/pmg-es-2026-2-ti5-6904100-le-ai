package br.com.leai.social.push.service;

import br.com.leai.social.push.model.MensagemDePush;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.core.IntervalFunction;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryConfig;
import java.time.Duration;

public class EnviadorResiliente implements EnviadorDePush {

  static final int TENTATIVAS = 3;
  static final Duration ESPERA_INICIAL = Duration.ofMillis(500);
  static final double FATOR_DO_BACKOFF = 2.0;
  static final int JANELA_DO_CIRCUITO = 10;
  static final int CHAMADAS_MINIMAS = 5;
  static final float LIMIAR_DE_FALHA = 50f;
  static final Duration TEMPO_ABERTO = Duration.ofSeconds(30);
  static final int CHAMADAS_DE_TESTE = 2;

  private final EnviadorDePush delegado;
  private final Retry retentativa;
  private final CircuitBreaker circuito;

  public EnviadorResiliente(EnviadorDePush delegado) {
    this(delegado, ESPERA_INICIAL, TEMPO_ABERTO);
  }

  EnviadorResiliente(EnviadorDePush delegado, Duration esperaInicial, Duration tempoAberto) {
    this.delegado = delegado;
    this.retentativa =
        Retry.of(
            "push-fcm",
            RetryConfig.custom()
                .maxAttempts(TENTATIVAS)
                .intervalFunction(
                    IntervalFunction.ofExponentialBackoff(esperaInicial, FATOR_DO_BACKOFF))
                .retryExceptions(PushIndisponivelException.class)
                .build());
    this.circuito =
        CircuitBreaker.of(
            "push-fcm",
            CircuitBreakerConfig.custom()
                .slidingWindowSize(JANELA_DO_CIRCUITO)
                .minimumNumberOfCalls(CHAMADAS_MINIMAS)
                .failureRateThreshold(LIMIAR_DE_FALHA)
                .waitDurationInOpenState(tempoAberto)
                .permittedNumberOfCallsInHalfOpenState(CHAMADAS_DE_TESTE)
                .recordExceptions(PushIndisponivelException.class)
                .build());
  }

  @Override
  public boolean ativo() {
    return delegado.ativo();
  }

  @Override
  public void enviar(MensagemDePush mensagem) {
    Runnable chamada =
        Retry.decorateRunnable(
            retentativa,
            CircuitBreaker.decorateRunnable(circuito, () -> delegado.enviar(mensagem)));
    try {
      chamada.run();
    } catch (CallNotPermittedException circuitoAberto) {
      throw new PushIndisponivelException(circuitoAberto);
    }
  }
}
