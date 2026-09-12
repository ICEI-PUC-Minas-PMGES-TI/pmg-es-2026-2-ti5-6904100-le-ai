package br.com.leai.social.common;

import java.util.Arrays;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

/**
 * Mapa status HTTP &rarr; c&oacute;digo interno + mensagem exib&iacute;vel em pt-BR (RNF-USA-05).
 *
 * <p>As mensagens NUNCA exp&otilde;em stack trace, framework, estrutura de banco ou caminho de
 * arquivo (RNF-SEC-22). Espelha {@code src/common/error-codes.ts} dos servi&ccedil;os NestJS: o corpo
 * de erro &eacute; contrato de sa&iacute;da, id&ecirc;ntico nas duas stacks (arquitetura &sect;2.1).
 */
public enum CodigoErro {
  REQUISICAO_INVALIDA(HttpStatus.BAD_REQUEST, "Os dados enviados são inválidos."),
  NAO_AUTENTICADO(HttpStatus.UNAUTHORIZED, "É necessário autenticar-se para continuar."),
  ACESSO_NEGADO(HttpStatus.FORBIDDEN, "Você não tem permissão para esta ação."),
  RECURSO_NAO_ENCONTRADO(HttpStatus.NOT_FOUND, "Não encontramos o que você procura."),
  CONFLITO(HttpStatus.CONFLICT, "Este recurso conflita com um já existente."),
  ENTIDADE_NAO_PROCESSAVEL(
      HttpStatus.UNPROCESSABLE_ENTITY, "Não foi possível processar os dados enviados."),
  MUITAS_REQUISICOES(
      HttpStatus.TOO_MANY_REQUESTS,
      "Muitas requisições em pouco tempo. Tente novamente em instantes."),
  SERVICO_INDISPONIVEL(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Serviço temporariamente indisponível. Tente novamente em instantes."),
  TEMPO_ESGOTADO(
      HttpStatus.GATEWAY_TIMEOUT, "A operação demorou mais que o esperado. Tente novamente."),

  /** Fallback para status HTTP fora do mapa acima. */
  ERRO_HTTP(HttpStatus.INTERNAL_SERVER_ERROR, "Não foi possível concluir a operação."),

  /** Fallback para exce&ccedil;&atilde;o n&atilde;o tratada &mdash; sempre 500. */
  ERRO_INTERNO(
      HttpStatus.INTERNAL_SERVER_ERROR, "Ocorreu um erro inesperado. Tente novamente mais tarde.");

  private final HttpStatus status;
  private final String mensagem;

  CodigoErro(HttpStatus status, String mensagem) {
    this.status = status;
    this.mensagem = mensagem;
  }

  public HttpStatus status() {
    return status;
  }

  public String mensagem() {
    return mensagem;
  }

  /**
   * Traduz um status HTTP no c&oacute;digo interno correspondente. Status fora do mapa vira
   * {@code ERRO_HTTP}, como no lado Nest &mdash; {@code ERRO_INTERNO} fica reservado para exce&ccedil;&atilde;o
   * n&atilde;o tratada, e por isso os dois fallbacks nunca s&atilde;o resultado desta busca.
   */
  public static CodigoErro deStatus(HttpStatusCode status) {
    return Arrays.stream(values())
        .filter(codigo -> codigo != ERRO_HTTP && codigo != ERRO_INTERNO)
        .filter(codigo -> codigo.status.value() == status.value())
        .findFirst()
        .orElse(ERRO_HTTP);
  }
}
