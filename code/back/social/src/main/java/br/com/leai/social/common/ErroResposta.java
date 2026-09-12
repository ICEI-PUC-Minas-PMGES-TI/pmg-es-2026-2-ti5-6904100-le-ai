package br.com.leai.social.common;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Corpo de erro padronizado (RNF-ERR-01): c&oacute;digo interno, mensagem exib&iacute;vel em pt-BR e o
 * id de correla&ccedil;&atilde;o da requisi&ccedil;&atilde;o. Mesma forma dos servi&ccedil;os NestJS.
 */
@Schema(
    name = "Erro",
    description = "Corpo de erro padronizado (RNF-ERR-01) — pt-BR, sem detalhe técnico.")
public record ErroResposta(
    @Schema(example = "RECURSO_NAO_ENCONTRADO") String codigo,
    @Schema(example = "Não encontramos o que você procura.") String mensagem,
    @Schema(format = "uuid") String correlationId) {

  public static ErroResposta de(CodigoErro codigo, String correlationId) {
    return new ErroResposta(codigo.name(), codigo.mensagem(), correlationId);
  }
}
