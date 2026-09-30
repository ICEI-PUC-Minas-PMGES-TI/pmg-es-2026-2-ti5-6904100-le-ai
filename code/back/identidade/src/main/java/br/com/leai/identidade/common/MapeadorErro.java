package br.com.leai.identidade.common;

import jakarta.validation.ConstraintViolationException;
import java.util.concurrent.TimeoutException;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.web.ErrorResponse;

/**
 * Traduz uma exceção no par (status HTTP, código interno). Porte de {@code mapError()} dos
 * serviços NestJS.
 *
 * <p>O equivalente estrutural do {@code instanceof HttpException} do Nest é
 * {@link ErrorResponse}: a interface que o Spring MVC implementa em dezenas de exceções
 * próprias (validação, rota inexistente, método não suportado, mídia não suportada,
 * {@code ResponseStatusException}...) e que já carrega o status correto. Sem esse ramo,
 * um handler abrangente transformaria todo 404 em 500.
 */
public final class MapeadorErro {

  private MapeadorErro() {}

  /**
   * Resultado da tradução: o status da resposta, o código interno e a mensagem que vai no corpo.
   *
   * <p>A mensagem é quase sempre a do próprio código. A exceção é o {@link
   * ErroDeNegocioException}, que traz uma frase específica quando a genérica não serve.
   */
  public record ErroMapeado(HttpStatus status, CodigoErro codigo, String mensagem) {}

  public static ErroMapeado mapear(Throwable erro) {
    // Antes do ramo de ErrorResponse: é uma RuntimeException nossa, e o ramo genérico a
    // transformaria em 500.
    if (erro instanceof ErroDeNegocioException negocio) {
      return new ErroMapeado(negocio.codigo().status(), negocio.codigo(), negocio.getMessage());
    }
    if (erro instanceof ServicoIndisponivelException
        || erro instanceof CannotGetJdbcConnectionException
        || erro instanceof DataAccessResourceFailureException) {
      return de(CodigoErro.SERVICO_INDISPONIVEL);
    }
    if (erro instanceof QueryTimeoutException || erro instanceof TimeoutException) {
      return de(CodigoErro.TEMPO_ESGOTADO);
    }
    if (erro instanceof ConstraintViolationException) {
      return de(CodigoErro.REQUISICAO_INVALIDA);
    }
    // Corpo ilegível: JSON malformado, truncado ou em codificação errada. Não implementa
    // ErrorResponse, então sem este ramo cairia em ERRO_INTERNO e o cliente receberia 500 por
    // ter enviado um corpo ruim — além de sujar o log com stack trace de erro que não é nosso.
    if (erro instanceof HttpMessageNotReadableException) {
      return de(CodigoErro.REQUISICAO_INVALIDA);
    }
    // Parâmetro de caminho ou query que não converte (`page=abc`, UUID malformado): também não
    // implementa ErrorResponse, e o erro é do cliente.
    if (erro instanceof TypeMismatchException) {
      return de(CodigoErro.REQUISICAO_INVALIDA);
    }
    if (erro instanceof ErrorResponse resposta) {
      HttpStatus status = HttpStatus.resolve(resposta.getStatusCode().value());
      if (status == null) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
      CodigoErro codigo = CodigoErro.deStatus(resposta.getStatusCode());
      return new ErroMapeado(status, codigo, codigo.mensagem());
    }
    return de(CodigoErro.ERRO_INTERNO);
  }

  private static ErroMapeado de(CodigoErro codigo) {
    return new ErroMapeado(codigo.status(), codigo, codigo.mensagem());
  }
}
