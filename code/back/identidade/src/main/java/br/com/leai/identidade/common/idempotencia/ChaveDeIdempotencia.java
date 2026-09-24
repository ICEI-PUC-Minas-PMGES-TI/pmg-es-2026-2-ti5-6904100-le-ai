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
   * Devolve a chave sem espaços nas pontas, ou {@code null} quando o header não veio.
   *
   * <p>Ausência não é erro aqui: {@code register} e {@code login} ainda são chamados sem o header
   * pelos clientes de P0-NAV, e a exigência entra quando web e mobile passarem a enviá-lo. Quem
   * exige a chave é a rota, não este método.
   */
  public static String validarOpcional(String bruta) {
    if (bruta == null) {
      return null;
    }
    String chave = bruta.trim();
    if (chave.isEmpty() || chave.length() > TAMANHO_MAXIMO) {
      throw invalida();
    }
    return chave;
  }

  /** Para as rotas que já nascem exigindo a chave, como o contrato pede. */
  public static String exigir(String bruta) {
    String chave = validarOpcional(bruta);
    if (chave == null) {
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
