package br.com.leai.identidade.seguimento.dto;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import java.util.List;

/**
 * Página dos schemas `PaginaSolicitacoes` e `PaginaPerfis`: índice a partir de zero, no máximo 50
 * itens (RNF-DES-02).
 */
public record Pagina<T>(List<T> items, int page, int size, long totalElements, int totalPages) {

  public static final int TAMANHO_PADRAO = 20;
  public static final int TAMANHO_MAXIMO = 50;

  public static <T> Pagina<T> de(List<T> items, int page, int size, long total) {
    int paginas = (int) ((total + size - 1) / size);
    return new Pagina<>(items, page, size, total, paginas);
  }

  /** Resposta `PaginacaoInvalida`: página negativa ou tamanho fora de 1 a 50. */
  public static void validar(int page, int size) {
    if (page < 0 || size < 1 || size > TAMANHO_MAXIMO) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA,
          "Página a partir de 0 e tamanho de 1 a " + TAMANHO_MAXIMO + ".");
    }
  }
}
