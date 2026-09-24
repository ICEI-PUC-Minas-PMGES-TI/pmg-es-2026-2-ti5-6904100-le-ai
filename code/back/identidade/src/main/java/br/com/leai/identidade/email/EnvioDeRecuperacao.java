package br.com.leai.identidade.email;

import jakarta.annotation.PreDestroy;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Trabalho em segundo plano da recuperação de senha: fora da requisição, com retentativa e
 * disjuntor (F-AUT, decisão de 24/09/2026 sobre o envio assíncrono em processo).
 *
 * <p><b>Por que fora da requisição.</b> Se o {@code POST /auth/password/forgot} esperasse o
 * Brevo, o tempo de resposta diria se a conta existe (RNF-SEC-28): conta inexistente voltaria na
 * hora, conta existente depois da ida ao provedor. Aqui a requisição só agenda.
 *
 * <p><b>Retentativa.</b> Até três tentativas, com espera de 2 s e 8 s entre elas, só para falha
 * temporária (rede, tempo esgotado, 5xx, 429). Os tempos-limite de cada chamada são os do {@code
 * BrevoConfig}.
 *
 * <p><b>Disjuntor.</b> Cinco falhas temporárias seguidas abrem o circuito por um minuto: nesse
 * intervalo nenhum envio sai e o pedido é descartado com WARN. Sem isso, um Brevo fora do ar
 * acumularia tarefas com retentativa na fila.
 *
 * <p><b>Não é durável.</b> Reinício do processo perde o que estava na fila; a pessoa pede de novo.
 * Outbox com worker fica como evolução.
 */
@Component
public class EnvioDeRecuperacao {

  private static final Logger log = LoggerFactory.getLogger(EnvioDeRecuperacao.class);

  static final List<Duration> ESPERAS = List.of(Duration.ofSeconds(2), Duration.ofSeconds(8));
  static final int FALHAS_PARA_ABRIR = 5;
  static final Duration CIRCUITO_ABERTO = Duration.ofMinutes(1);

  /** Onde as tarefas rodam. Existe para o teste trocar a fila real por execução imediata. */
  interface Agendador {
    void agendar(Runnable tarefa, Duration espera);

    default void encerrar() {}
  }

  private final EmailNotificationService email;
  private final Agendador agendador;
  private final Clock relogio;
  private final List<Duration> esperas;

  private int falhasSeguidas;
  private Instant abertoAte = Instant.MIN;

  @Autowired
  public EnvioDeRecuperacao(EmailNotificationService email) {
    this(email, filaReal(), Clock.systemUTC(), ESPERAS);
  }

  EnvioDeRecuperacao(
      EmailNotificationService email, Agendador agendador, Clock relogio, List<Duration> esperas) {
    this.email = email;
    this.agendador = agendador;
    this.relogio = relogio;
    this.esperas = esperas;
  }

  /** Roda a tarefa fora da thread da requisição, com o correlationId de quem pediu. */
  public void emSegundoPlano(Runnable tarefa) {
    agendador.agendar(comContexto(tarefa), Duration.ZERO);
  }

  /** Envia o link, com retentativa. Chamar já em segundo plano. */
  public void enviar(String destinatario, String nome, String link) {
    tentar(destinatario, nome, link, 0);
  }

  private void tentar(String destinatario, String nome, String link, int tentativa) {
    if (circuitoAberto()) {
      log.warn("Envio de recuperação de senha descartado: circuito do Brevo aberto");
      return;
    }
    ResultadoDeEnvio resultado = email.enviarRecuperacaoSenha(destinatario, nome, link);
    registrar(resultado);
    if (!resultado.valeRepetir()) {
      return;
    }
    if (tentativa >= esperas.size()) {
      log.error("Envio de recuperação de senha abandonado após {} tentativas", tentativa + 1);
      return;
    }
    agendador.agendar(
        comContexto(() -> tentar(destinatario, nome, link, tentativa + 1)),
        esperas.get(tentativa));
  }

  private synchronized boolean circuitoAberto() {
    return relogio.instant().isBefore(abertoAte);
  }

  private synchronized void registrar(ResultadoDeEnvio resultado) {
    if (resultado != ResultadoDeEnvio.FALHA_TEMPORARIA) {
      falhasSeguidas = 0;
      return;
    }
    falhasSeguidas++;
    if (falhasSeguidas >= FALHAS_PARA_ABRIR) {
      abertoAte = relogio.instant().plus(CIRCUITO_ABERTO);
      falhasSeguidas = 0;
      log.warn("Circuito do Brevo aberto por {} s após falhas seguidas", CIRCUITO_ABERTO.toSeconds());
    }
  }

  private static Runnable comContexto(Runnable tarefa) {
    Map<String, String> contexto = MDC.getCopyOfContextMap();
    return () -> {
      if (contexto != null) {
        MDC.setContextMap(contexto);
      }
      try {
        tarefa.run();
      } catch (RuntimeException erro) {
        // Tarefa em segundo plano não tem a quem devolver o erro: sem este log ele sumiria.
        log.error("Falha na recuperação de senha em segundo plano", erro);
      } finally {
        MDC.clear();
      }
    };
  }

  private static Agendador filaReal() {
    ScheduledExecutorService fila =
        Executors.newScheduledThreadPool(
            2, Thread.ofPlatform().name("recuperacao-", 0).daemon().factory());
    return new Agendador() {
      @Override
      public void agendar(Runnable tarefa, Duration espera) {
        try {
          fila.schedule(tarefa, espera.toMillis(), TimeUnit.MILLISECONDS);
        } catch (RejectedExecutionException encerrando) {
          log.warn("Recuperação de senha descartada: serviço encerrando");
        }
      }

      @Override
      public void encerrar() {
        fila.shutdown();
      }
    };
  }

  @PreDestroy
  void encerrar() {
    agendador.encerrar();
  }
}
