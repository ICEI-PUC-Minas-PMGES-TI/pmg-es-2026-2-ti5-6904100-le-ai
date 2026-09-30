package br.com.leai.social.common;

/**
 * Limites da paginação por página/tamanho (RNF-DES-02), comuns a feed, comentários e
 * notificações: o servidor impõe o teto, não o cliente.
 */
public final class Paginacao {

  public static final int TAMANHO_PADRAO = 20;
  public static final int TAMANHO_MAXIMO = 50;

  private Paginacao() {}

  /** Resposta `PaginacaoInvalida`: página negativa ou tamanho fora de 1 a {@link #TAMANHO_MAXIMO}. */
  public static void validar(int page, int size) {
    if (page < 0 || size < 1 || size > TAMANHO_MAXIMO) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA,
          "Página a partir de 0 e tamanho de 1 a " + TAMANHO_MAXIMO + ".");
    }
  }
}
