package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Schema {@code SincronizacaoTempoReal}: dado do evento SSE {@code sincronizacao}. */
@Schema(name = "SincronizacaoTempoReal")
public record SincronizacaoTempoRealResposta(long totalNaoLidas) {}
