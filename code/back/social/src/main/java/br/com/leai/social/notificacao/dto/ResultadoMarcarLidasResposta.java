package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Schema {@code ResultadoMarcarLidas}: quantas mudaram nesta operação e o novo total de não lidas. */
@Schema(name = "ResultadoMarcarLidas")
public record ResultadoMarcarLidasResposta(int marcadas, long totalNaoLidas) {}
