package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Motivo do admin para suspender ou reativar a conta (F-MOD-OPC). Obrigatório nas duas ações, com
 * até 500 code points depois de tirar os espaços das pontas; o limite é conferido no serviço, como
 * na denúncia. Vai só para o registro de auditoria (RNF-SEC-36).
 */
@Schema(name = "MotivoDaModeracaoDeConta")
public record MotivoDaContaRequisicao(String motivo) {

  public static final int MOTIVO_MAXIMO = 500;
}
