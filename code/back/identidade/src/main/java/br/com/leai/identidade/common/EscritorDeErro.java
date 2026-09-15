package br.com.leai.identidade.common;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Escreve o corpo de erro padrão (RNF-ERR-01) direto na resposta do servlet.
 *
 * <p>Existe porque os pontos de recusa do Spring Security ({@code AuthenticationEntryPoint} e
 * {@code AccessDeniedHandler}) rodam na cadeia de filtros, antes do {@code DispatcherServlet},
 * onde o {@code @RestControllerAdvice} não alcança. Sem isto, um 401 sairia com corpo vazio e
 * quebraria o contrato de erro que P0-INFRA fixou para as duas stacks. O mesmo vale para o
 * {@link RateLimitFilter}, que recusa antes de qualquer controller existir.
 */
@Component
public class EscritorDeErro {

  private final ObjectMapper objectMapper;

  public EscritorDeErro(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public void escrever(HttpServletResponse resposta, CodigoErro codigo) throws IOException {
    escrever(resposta, codigo, codigo.mensagem());
  }

  /**
   * Mesma coisa com mensagem própria, para o caso em que a frase genérica do código não é a que
   * a tela espera. A mensagem vai inteira para o cliente: nunca pode conter detalhe técnico
   * (RNF-SEC-22), como no {@link ErroDeNegocioException}.
   */
  public void escrever(HttpServletResponse resposta, CodigoErro codigo, String mensagem)
      throws IOException {
    if (resposta.isCommitted()) {
      return;
    }
    resposta.setStatus(codigo.status().value());
    resposta.setContentType(MediaType.APPLICATION_JSON_VALUE);
    resposta.setCharacterEncoding(StandardCharsets.UTF_8.name());
    objectMapper.writeValue(
        resposta.getOutputStream(),
        new ErroResposta(codigo.name(), mensagem, CorrelationIdFilter.atual()));
  }
}
