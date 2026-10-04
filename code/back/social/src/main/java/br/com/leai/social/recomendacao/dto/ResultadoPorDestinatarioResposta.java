package br.com.leai.social.recomendacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code ResultadoPorDestinatario}: {@code recomendacaoId} só em {@code CRIADA}, {@code
 * motivo} só em {@code BLOQUEADA}.
 */
@Schema(name = "ResultadoPorDestinatario")
public record ResultadoPorDestinatarioResposta(
    String destinatarioId, String status, String recomendacaoId, String motivo) {

  public static ResultadoPorDestinatarioResposta criada(String destinatarioId, String recomendacaoId) {
    return new ResultadoPorDestinatarioResposta(destinatarioId, "CRIADA", recomendacaoId, null);
  }

  public static ResultadoPorDestinatarioResposta bloqueada(String destinatarioId, String motivo) {
    return new ResultadoPorDestinatarioResposta(destinatarioId, "BLOQUEADA", null, motivo);
  }
}
