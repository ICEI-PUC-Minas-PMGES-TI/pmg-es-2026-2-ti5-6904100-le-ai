package br.com.leai.social.common.idempotencia;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import java.util.UUID;

/**
 * Validação do header {@code Idempotency-Key}. Porte de {@code
 * identidade.common.idempotencia.ChaveDeIdempotencia}, com uma diferença: {@code
 * docs/api/social.yaml} define a chave como {@code type: string, format: uuid} (diferente de
 * {@code identidade}, que aceita texto opaco de até 128 caracteres) — aqui a chave precisa ser um
 * UUID válido, não só não-vazia.
 */
public final class ChaveDeIdempotencia {

  public static final String CABECALHO = "Idempotency-Key";

  private ChaveDeIdempotencia() {}

  /**
   * Devolve a chave sem espaços nas pontas. Ausente, vazia ou fora do formato UUID é {@code 400}:
   * toda escrita do serviço exige a chave.
   */
  public static String exigir(String bruta) {
    String chave = bruta == null ? "" : bruta.trim();
    if (chave.isEmpty() || !uuidValido(chave)) {
      throw invalida();
    }
    return chave;
  }

  private static boolean uuidValido(String valor) {
    try {
      UUID.fromString(valor);
      return true;
    } catch (IllegalArgumentException erro) {
      return false;
    }
  }

  private static ErroDeNegocioException invalida() {
    return new ErroDeNegocioException(
        CodigoErro.REQUISICAO_INVALIDA,
        "Informe uma chave de idempotência (Idempotency-Key) no formato UUID.");
  }
}
