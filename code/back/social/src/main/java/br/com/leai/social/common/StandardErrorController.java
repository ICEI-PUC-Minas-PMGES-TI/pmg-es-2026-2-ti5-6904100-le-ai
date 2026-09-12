package br.com.leai.social.common;

import io.swagger.v3.oas.annotations.Hidden;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Corpo padrão também no despacho para {@code /error}.
 *
 * <p>O {@code @RestControllerAdvice} não enxerga o que acontece fora do {@code DispatcherServlet}
 * — exceção lançada num filtro, ou erro produzido pelo próprio contêiner, cai aqui. Sem esta
 * classe, o Spring devolveria o corpo "whitelabel" ({@code timestamp}, {@code status},
 * {@code error}, {@code path}), que viola o formato único de erro (RNF-ERR-01) e vaza o caminho
 * requisitado.
 *
 * <p>Implementar {@link ErrorController} substitui o {@code BasicErrorController} do Boot.
 * {@code @Hidden} mantém a rota fora do contrato OpenAPI.
 */
@Hidden
@RestController
public class StandardErrorController implements ErrorController {

  @RequestMapping("/error")
  public ResponseEntity<ErroResposta> tratar(HttpServletRequest requisicao) {
    HttpStatus status = statusDe(requisicao);
    CodigoErro codigo =
        status == HttpStatus.INTERNAL_SERVER_ERROR
            ? CodigoErro.ERRO_INTERNO
            : CodigoErro.deStatus(status);

    return ResponseEntity.status(status)
        .body(ErroResposta.de(codigo, CorrelationIdFilter.atual()));
  }

  private static HttpStatus statusDe(HttpServletRequest requisicao) {
    Object atributo = requisicao.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
    if (atributo instanceof Integer valor) {
      HttpStatus status = HttpStatus.resolve(valor);
      if (status != null) {
        return status;
      }
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
