package br.com.leai.social.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Lê o {@code X-Correlation-Id} recebido (ou gera um), coloca no contexto de log (MDC) e o
 * devolve no header da resposta (RNF-OBS-01/03). Equivale ao middleware + AsyncLocalStorage
 * dos serviços NestJS.
 *
 * <p>Registrado com a maior precedência possível para envolver o resto da requisição. Todo
 * log emitido dentro dela carrega o id automaticamente — inclusive no JSON estruturado do
 * perfil {@code prod}, que serializa o MDC inteiro.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

  public static final String HEADER = "X-Correlation-Id";
  public static final String MDC_KEY = "correlationId";

  /** Fallback usado quando não há requisição em curso — mesmo valor do lado Nest. */
  public static final String DESCONHECIDO = "desconhecido";

  private static final int TAMANHO_MAXIMO = 128;

  @Override
  protected void doFilterInternal(
      HttpServletRequest requisicao, HttpServletResponse resposta, FilterChain cadeia)
      throws ServletException, IOException {

    String correlationId = sanitizar(requisicao.getHeader(HEADER));
    if (correlationId == null) {
      correlationId = UUID.randomUUID().toString();
    }

    MDC.put(MDC_KEY, correlationId);
    // Antes da cadeia: depois que a resposta é confirmada não dá mais para add header.
    resposta.setHeader(HEADER, correlationId);
    try {
      cadeia.doFilter(requisicao, resposta);
    } finally {
      // Obrigatório: o Tomcat reaproveita threads e um MDC vazado faria a requisição
      // seguinte logar o id da anterior.
      MDC.remove(MDC_KEY);
    }
  }

  /**
   * O valor vem do cliente e vai direto para o log: corta caractere de controle (evita
   * injeção de linha no log) e limita o tamanho.
   */
  static String sanitizar(String valor) {
    if (valor == null) {
      return null;
    }
    String limpo = valor.replaceAll("\\p{Cntrl}", "").trim();
    if (limpo.isEmpty()) {
      return null;
    }
    return limpo.length() > TAMANHO_MAXIMO ? limpo.substring(0, TAMANHO_MAXIMO) : limpo;
  }

  /** Id da requisição em curso, ou {@code "desconhecido"} fora de uma requisição. */
  public static String atual() {
    String id = MDC.get(MDC_KEY);
    return id != null ? id : DESCONHECIDO;
  }
}
