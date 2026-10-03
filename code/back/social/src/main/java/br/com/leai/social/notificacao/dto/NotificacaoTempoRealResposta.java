package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code NotificacaoTempoReal}: dado do evento SSE {@code notificacao} — a notificação recém
 * gravada, no mesmo formato da lista, e o novo total de não lidas para o badge (RF-NOT-06).
 */
@Schema(name = "NotificacaoTempoReal")
public record NotificacaoTempoRealResposta(NotificacaoResposta notificacao, long totalNaoLidas) {}
