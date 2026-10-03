package br.com.leai.social.notificacao.service;

import br.com.leai.social.notificacao.dto.NotificacaoTempoRealResposta;
import br.com.leai.social.notificacao.dto.SincronizacaoTempoRealResposta;
import br.com.leai.social.notificacao.model.NotificacaoGravada;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Canais SSE abertos por destinatário (RF-NOT-06). A notificação vive no banco (RNF-ARQ-04); o
 * canal só antecipa a entrega. Depois do commit da gravação, a notificação e o novo total de não
 * lidas vão a toda conexão ativa do destinatário, e só dele (RNF-SEC-02).
 *
 * <p><b>Registro em memória, de propósito:</b> o serviço roda em instância única no Render. Com
 * mais de uma instância o fan-out exigiria um backplane (pub/sub), registrado em F-NOT-2.
 *
 * <p>O canal não sobrevive ao token: o timeout do emitter é a expiração do JWT, e o app renova
 * pelo fluxo de F-AUT antes de reconectar.
 */
@Component
public class CanaisDeNotificacao {

  public static final String EVENTO_SINCRONIZACAO = "sincronizacao";
  public static final String EVENTO_NOTIFICACAO = "notificacao";

  /** Abaixo do corte de conexão ociosa do proxy do Render, para o canal não cair em silêncio. */
  static final long INTERVALO_HEARTBEAT_MS = 25_000;

  private static final String COMENTARIO_HEARTBEAT = "heartbeat";

  private static final Logger log = LoggerFactory.getLogger(CanaisDeNotificacao.class);

  private final Map<UUID, Set<SseEmitter>> canais = new ConcurrentHashMap<>();
  private final ServicoDeNotificacao servico;

  public CanaisDeNotificacao(ServicoDeNotificacao servico) {
    this.servico = servico;
  }

  /** Abre o canal do destinatário até {@code expiraEm} e já envia a sincronização inicial. */
  public SseEmitter abrir(UUID destinatarioId, Instant expiraEm) {
    long restante = Duration.between(Instant.now(), expiraEm).toMillis();
    SseEmitter emitter = new SseEmitter(Math.max(restante, 1));
    Set<SseEmitter> doDestinatario =
        canais.computeIfAbsent(destinatarioId, id -> ConcurrentHashMap.newKeySet());
    doDestinatario.add(emitter);
    emitter.onCompletion(() -> remover(destinatarioId, emitter));
    emitter.onTimeout(
        () -> {
          remover(destinatarioId, emitter);
          emitter.complete();
        });
    emitter.onError(erro -> remover(destinatarioId, emitter));

    enviar(
        destinatarioId,
        emitter,
        SseEmitter.event()
            .name(EVENTO_SINCRONIZACAO)
            .data(new SincronizacaoTempoRealResposta(servico.contarNaoLidas(destinatarioId))));
    return emitter;
  }

  /**
   * Depois do commit, para o cliente nunca receber o que ainda pode ser desfeito. {@code
   * fallbackExecution} cobre a gravação fora de transação.
   */
  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
  public void aoGravar(NotificacaoGravada gravada) {
    Set<SseEmitter> doDestinatario = canais.get(gravada.destinatarioId());
    if (doDestinatario == null || doDestinatario.isEmpty()) {
      return;
    }
    servico
        .buscar(gravada.destinatarioId(), gravada.id())
        .ifPresent(
            notificacao -> {
              NotificacaoTempoRealResposta dado =
                  new NotificacaoTempoRealResposta(
                      notificacao, servico.contarNaoLidas(gravada.destinatarioId()));
              for (SseEmitter emitter : doDestinatario) {
                enviar(
                    gravada.destinatarioId(),
                    emitter,
                    SseEmitter.event()
                        .name(EVENTO_NOTIFICACAO)
                        .id(notificacao.id())
                        .data(dado));
              }
            });
  }

  @Scheduled(fixedRate = INTERVALO_HEARTBEAT_MS)
  public void heartbeat() {
    canais.forEach(
        (destinatarioId, doDestinatario) ->
            doDestinatario.forEach(
                emitter ->
                    enviar(
                        destinatarioId,
                        emitter,
                        SseEmitter.event().comment(COMENTARIO_HEARTBEAT))));
  }

  /**
   * O shutdown gracioso espera as requisições em andamento terminarem, e um canal SSE só termina
   * pelo token. Fechar antes do servidor parar evita segurar o deploy; o app reconecta sozinho.
   */
  @EventListener(ContextClosedEvent.class)
  public void encerrarTodos() {
    canais.values().forEach(doDestinatario -> doDestinatario.forEach(SseEmitter::complete));
    canais.clear();
  }

  /** Conexão que já caiu do lado do cliente sai do registro; a notificação continua no banco. */
  private void enviar(UUID destinatarioId, SseEmitter emitter, SseEmitter.SseEventBuilder evento) {
    try {
      emitter.send(evento);
    } catch (IOException | IllegalStateException erro) {
      log.debug("Canal de notificacoes encerrado pelo cliente: {}", erro.getMessage());
      remover(destinatarioId, emitter);
      emitter.completeWithError(erro);
    }
  }

  private void remover(UUID destinatarioId, SseEmitter emitter) {
    canais.computeIfPresent(
        destinatarioId,
        (id, doDestinatario) -> {
          doDestinatario.remove(emitter);
          return doDestinatario.isEmpty() ? null : doDestinatario;
        });
  }
}
