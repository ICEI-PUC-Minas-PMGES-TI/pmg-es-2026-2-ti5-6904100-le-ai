package br.com.leai.identidade.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Cabeçalhos de segurança em toda resposta (RNF-SEC-24): HSTS, {@code X-Content-Type-Options},
 * {@code X-Frame-Options} e {@code Referrer-Policy}. É o equivalente ao {@code helmet} usado
 * nos serviços NestJS. HTTPS é terminado pelo Render (RNF-SEC-08).
 *
 * <p>Continua sendo um filtro próprio mesmo depois de o Spring Security entrar em P0-NAV, e o
 * {@code headers()} da cadeia fica desligado para não duplicar cabeçalho. O motivo é cobertura:
 * o {@code HttpSecurity#headers} só alcança o que passa pela cadeia do Security, e deixaria sem
 * cabeçalho justamente as respostas produzidas antes dela — a recusa de origem do
 * {@code CorsFilter} e os erros despachados pelo contêiner. Rodando em
 * {@code HIGHEST_PRECEDENCE + 5}, antes do {@code CorsFilter}, este filtro alcança toda resposta
 * do serviço.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class SecurityHeadersFilter extends OncePerRequestFilter {

  @Override
  protected void doFilterInternal(
      HttpServletRequest requisicao, HttpServletResponse resposta, FilterChain cadeia)
      throws ServletException, IOException {

    resposta.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    resposta.setHeader("X-Content-Type-Options", "nosniff");
    resposta.setHeader("X-Frame-Options", "DENY");
    resposta.setHeader("Referrer-Policy", "no-referrer");
    cadeia.doFilter(requisicao, resposta);
  }
}
