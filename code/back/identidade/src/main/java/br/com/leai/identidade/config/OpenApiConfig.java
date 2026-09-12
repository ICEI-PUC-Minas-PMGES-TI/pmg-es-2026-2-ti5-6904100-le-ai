package br.com.leai.identidade.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Contrato OpenAPI em runtime (RNF-ARQ-03): spec em {@code /v3/api-docs} e Swagger UI em
 * {@code /docs} — mesmas rotas dos serviços NestJS. O esqueleto commitado vive em
 * {@code docs/api/identidade.yaml}; um spec por serviço, nunca por feature (AGENTS §10).
 */
@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI openApi(AppProperties propriedades) {
    return new OpenAPI()
        .info(
            new Info()
                .title("Lê Ai — " + propriedades.serviceName())
                .description("Contrato do serviço identidade (esqueleto — P0-INFRA).")
                .version("0.0.1"));
  }
}
