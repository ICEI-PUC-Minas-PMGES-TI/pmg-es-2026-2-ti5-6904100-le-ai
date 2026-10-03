package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code SincronizacaoTempoReal}: dado do evento SSE {@code sincronizacao}, o primeiro de
 * todo canal aberto. O total de não lidas reconcilia o badge depois de uma reconexão.
 */
@Schema(name = "SincronizacaoTempoReal")
public record SincronizacaoTempoRealResposta(long totalNaoLidas) {}
