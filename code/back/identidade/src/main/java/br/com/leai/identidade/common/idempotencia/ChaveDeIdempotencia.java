package br.com.leai.identidade.common.idempotencia;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;

/**
 * Validação do header {@code Idempotency-Key}.
 *
 * <p>O contrato de {@code identidade} define a chave como texto opaco de 1 a 128 caracteres, não
 * como UUID (diferente do {@code acervo}). Recusar antes de tocar o banco evita gravar recibo com
 * chave inútil.
 */
public final class ChaveDeIdempotencia {

  public static final String CABECALHO = "Idempotency-Key";

  static final int TAMANHO_MAXIMO = 128;

  private ChaveDeIdempotencia() {}

  /**
   * Devolve a chave sem espaços nas pontas. Ausente, vazia ou longa demais é {@code 400}: desde o
   * fechamento de F-AUT toda escrita do serviço exige a chave, inclusive {@code register} e
   * {@code login}, que aceitavam ausência enquanto os clientes de P0-NAV não a mandavam.
   */
  public static String exigir(String bruta) {
    String chave = bruta == null ? "" : bruta.trim();
    if (chave.isEmpty() || chave.length() > TAMANHO_MAXIMO) {
      throw invalida();
    }
    return chave;
  }

  private static ErroDeNegocioException invalida() {
    return new ErroDeNegocioException(
        CodigoErro.REQUISICAO_INVALIDA,
        "Informe uma chave de idempotência (Idempotency-Key) com até 128 caracteres.");
  }
}
