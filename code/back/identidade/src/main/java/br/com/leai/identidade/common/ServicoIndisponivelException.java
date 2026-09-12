package br.com.leai.identidade.common;

/**
 * Dependência externa essencial fora do ar (hoje, o banco). Sem {@code @ResponseStatus}
 * de propósito: quem define o status e o corpo é o {@link GlobalExceptionHandler}, para que
 * a resposta carregue o {@code correlationId} como qualquer outro erro (RNF-ERR-01).
 */
public class ServicoIndisponivelException extends RuntimeException {

  public ServicoIndisponivelException(String mensagem, Throwable causa) {
    super(mensagem, causa);
  }
}
