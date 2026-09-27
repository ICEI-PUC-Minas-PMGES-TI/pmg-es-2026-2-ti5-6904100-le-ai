package br.com.leai.social.common;

/**
 * Falha esperada de regra de negócio, com mensagem própria em pt-BR. Porte de {@code
 * identidade.common.ErroDeNegocioException} — mesmo racional.
 *
 * <p>As mensagens genéricas do {@link CodigoErro} não servem para todo caso: a idempotência
 * (RNF-ERR-04) precisa dizer "chave já usada com outros dados" no conflito, e o rate limiting
 * (RNF-SEC-18) precisa de uma frase de tela, não o "Muitas requisições" genérico da API.
 *
 * <p>O formato do corpo <b>não</b> muda: continua {@code { codigo, mensagem, correlationId }}
 * (RNF-ERR-01). Só a mensagem fica mais útil.
 *
 * <p><b>A mensagem é pública.</b> Ela vai inteira para o cliente, então nunca pode conter stack
 * trace, nome de tabela, SQL ou caminho de arquivo (RNF-SEC-22). Para erro técnico, use as
 * exceções que o {@link MapeadorErro} já traduz.
 */
public class ErroDeNegocioException extends RuntimeException {

  private final transient CodigoErro codigo;

  public ErroDeNegocioException(CodigoErro codigo, String mensagemPublica) {
    super(mensagemPublica);
    this.codigo = codigo;
  }

  public CodigoErro codigo() {
    return codigo;
  }
}
