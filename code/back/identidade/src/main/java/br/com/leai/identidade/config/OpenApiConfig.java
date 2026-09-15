package br.com.leai.identidade.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
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
                .description("Contrato do serviço identidade (P0-NAV: esqueleto de auth).")
                .version("0.0.1"))
        // O MeController usa @SecurityRequirement(name = "bearerAuth"), mas isso é só a
        // referência: sem declarar o esquema aqui, o /v3/api-docs sai com um "security" apontando
        // para nada em components.securitySchemes — um $ref pendurado que o Swagger UI não
        // consegue desenhar (o botão "Authorize" não aparece) e que violaria o spec OpenAPI se
        // fosse commitado assim.
        .components(
            new Components()
                .addSecuritySchemes(
                    "bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Token de acesso emitido por POST /auth/login.")));
  }
}
