package br.com.leai.identidade.common;

import jakarta.validation.ConstraintViolationException;
import java.util.concurrent.TimeoutException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.HttpStatus;
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

  /** Resultado da tradução: o status que vai na resposta e o código interno do corpo. */
  public record ErroMapeado(HttpStatus status, CodigoErro codigo) {}

  public static ErroMapeado mapear(Throwable erro) {
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
    if (erro instanceof ErrorResponse resposta) {
      HttpStatus status = HttpStatus.resolve(resposta.getStatusCode().value());
      if (status == null) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
      return new ErroMapeado(status, CodigoErro.deStatus(resposta.getStatusCode()));
    }
    return de(CodigoErro.ERRO_INTERNO);
  }

  private static ErroMapeado de(CodigoErro codigo) {
    return new ErroMapeado(codigo.status(), codigo);
  }
}
