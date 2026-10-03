package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Schema {@code NotificacaoTempoReal}: dado do evento SSE {@code notificacao}. */
@Schema(name = "NotificacaoTempoReal")
public record NotificacaoTempoRealResposta(NotificacaoResposta notificacao, long totalNaoLidas) {}
