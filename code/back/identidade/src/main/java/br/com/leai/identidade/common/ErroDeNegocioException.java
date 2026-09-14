package br.com.leai.identidade.common;

/**
 * Falha esperada de regra de negócio, com mensagem própria em pt-BR.
 *
 * <p>Existe porque as mensagens genéricas do {@link CodigoErro} não servem para todo caso: o
 * protótipo pede "Esse nome de usuário já está em uso. Escolha outro." no conflito de cadastro e
 * "E-mail, nome de usuário ou senha incorretos." no login, e nenhuma das duas é a frase padrão do
 * código correspondente.
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
