package br.com.leai.social.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Handler global de exceções. Toda resposta de erro tem a mesma forma (RNF-ERR-01):
 * {@code { codigo, mensagem, correlationId }}, com código HTTP semântico e mensagem em pt-BR
 * sem detalhe técnico (RNF-SEC-22). Porte do {@code AllExceptionsFilter} dos serviços NestJS.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(Throwable.class)
  public ResponseEntity<ErroResposta> tratar(Throwable erro) {
    MapeadorErro.ErroMapeado mapeado = MapeadorErro.mapear(erro);
    String correlationId = CorrelationIdFilter.atual();

    if (mapeado.status().is5xxServerError()) {
      // 5xx: registra o erro real (com stack) no log; nunca na resposta.
      log.error("Erro não tratado", erro);
    } else {
      log.warn(
          "{} ({}): {}",
          mapeado.codigo().name(),
          mapeado.status().value(),
          mapeado.codigo().mensagem());
    }

    return ResponseEntity.status(mapeado.status())
        .body(new ErroResposta(mapeado.codigo().name(), mapeado.mensagem(), correlationId));
  }
}
