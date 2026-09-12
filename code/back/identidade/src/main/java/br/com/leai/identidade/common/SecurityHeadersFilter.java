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
 * <p>Um filtro, e não {@code spring-boot-starter-security}: Spring Security não está na lista
 * de starters de P0-INFRA e, ao entrar, protege tudo por padrão ({@code /health} e
 * {@code /docs} passariam a devolver 401). Ele chega com F-AUT, no período-1, e então estes
 * cabeçalhos migram para {@code HttpSecurity#headers}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
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
