package br.com.leai.social.push.service;

import br.com.leai.social.notificacao.model.NotificacaoGravada;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class PushDeNotificacao {

  static final int THREADS = 2;
  static final int CAPACIDADE_DA_FILA = 500;
  static final Duration ESPERA_NO_ENCERRAMENTO = Duration.ofSeconds(10);
  private static final String PREFIXO_DA_THREAD = "push-";

  private static final Logger log = LoggerFactory.getLogger(PushDeNotificacao.class);

  private final EnviadorDePush enviador;
  private final ServicoDeEnvioDePush envio;
  private final ExecutorService executor =
      new ThreadPoolExecutor(
          THREADS,
          THREADS,
          0L,
          TimeUnit.MILLISECONDS,
          new ArrayBlockingQueue<>(CAPACIDADE_DA_FILA),
          Thread.ofPlatform().name(PREFIXO_DA_THREAD, 0).factory());

  public PushDeNotificacao(EnviadorDePush enviador, ServicoDeEnvioDePush envio) {
    this.enviador = enviador;
    this.envio = envio;
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
  public void aoGravar(NotificacaoGravada gravada) {
    if (!enviador.ativo()) {
      return;
    }
    try {
      executor.execute(() -> enviar(gravada));
    } catch (RejectedExecutionException filaCheia) {
      log.atWarn()
          .addKeyValue("notificacaoId", gravada.id())
          .log("Push: fila de envio cheia, a notificação segue só no aplicativo");
    }
  }

  private void enviar(NotificacaoGravada gravada) {
    try {
      envio.enviar(gravada);
    } catch (RuntimeException erro) {
      log.atError()
          .addKeyValue("notificacaoId", gravada.id())
          .setCause(erro)
          .log("Push: falha ao enviar, a notificação segue só no aplicativo");
    }
  }

  @PreDestroy
  void encerrar() {
    executor.shutdown();
    try {
      if (!executor.awaitTermination(ESPERA_NO_ENCERRAMENTO.toMillis(), TimeUnit.MILLISECONDS)) {
        executor.shutdownNow();
      }
    } catch (InterruptedException interrompido) {
      executor.shutdownNow();
      Thread.currentThread().interrupt();
    }
  }
}
