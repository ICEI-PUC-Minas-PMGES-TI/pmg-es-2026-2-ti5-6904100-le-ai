package br.com.leai.social.config;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.CorrelationIdFilter;
import br.com.leai.social.common.ErroResposta;
import java.io.IOException;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.DefaultCorsProcessor;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * CORS restrito às origens conhecidas, sem curinga (RNF-SEC-21).
 *
 * <p>Um {@link CorsFilter} e não {@code WebMvcConfigurer#addCorsMappings}: o filtro também cobre
 * o despacho para {@code /error} e qualquer resposta produzida antes do
 * {@code DispatcherServlet}.
 */
@Configuration
public class CorsConfig {

  @Bean
  public CorsFilter corsFilter(AppProperties propriedades, ObjectMapper objectMapper) {
    List<String> origens = propriedades.originsPermitidas();

    CorsConfiguration configuracao = new CorsConfiguration();
    configuracao.setAllowedOrigins(origens);
    configuracao.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuracao.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Correlation-Id"));
    configuracao.setExposedHeaders(List.of("X-Correlation-Id"));
    configuracao.setAllowCredentials(!origens.isEmpty());
    configuracao.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource fonte = new UrlBasedCorsConfigurationSource();
    fonte.registerCorsConfiguration("/**", configuracao);

    CorsFilter filtro = new CorsFilter(fonte);
    filtro.setCorsProcessor(new CorsProcessorPadrao(objectMapper));
    return filtro;
  }

  /**
   * Recusa de CORS também no corpo de erro padrão (RNF-ERR-01). O processador padrão do Spring
   * responde {@code 403 Invalid CORS request} em texto puro, fora do formato único de erro —
   * e antes do {@code DispatcherServlet}, onde o {@code @RestControllerAdvice} não alcança.
   */
  static class CorsProcessorPadrao extends DefaultCorsProcessor {

    private final ObjectMapper objectMapper;

    CorsProcessorPadrao(ObjectMapper objectMapper) {
      this.objectMapper = objectMapper;
    }

    @Override
    protected void rejectRequest(ServerHttpResponse resposta) throws IOException {
      resposta.setStatusCode(HttpStatus.FORBIDDEN);
      resposta.getHeaders().setContentType(MediaType.APPLICATION_JSON);
      ErroResposta corpo =
          ErroResposta.de(CodigoErro.ACESSO_NEGADO, CorrelationIdFilter.atual());
      resposta.getBody().write(objectMapper.writeValueAsBytes(corpo));
      resposta.flush();
    }
  }
}
