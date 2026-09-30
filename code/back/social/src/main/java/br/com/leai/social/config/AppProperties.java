package br.com.leai.social.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Contrato das variáveis de ambiente do serviço, validado no boot — o serviço não sobe com
 * config inválida. Equivale ao schema {@code zod} de {@code src/config/env.ts} nos serviços
 * NestJS. Segredos vêm só do ambiente, nunca do repositório (RNF-SEC-11).
 *
 * <p>O {@code application.yml} mapeia cada variável para {@code leai.*} com default vazio de
 * propósito: quem reclama de valor faltando é este validador, que lista todos os campos
 * inválidos de uma vez, e não o resolvedor de placeholder, que aborta no primeiro.
 */
@Validated
@ConfigurationProperties(prefix = "leai")
public record AppProperties(
    @NotBlank(message = "SERVICE_NAME é obrigatório") String serviceName,
    @NotBlank(message = "DB_SCHEMA é obrigatório") String dbSchema,
    @NotBlank(message = "DATABASE_URL é obrigatório") String databaseUrl,
    @NotBlank(message = "CORS_ALLOWED_ORIGINS é obrigatório") String corsAllowedOrigins,
    // Integrações e segredos usados pelas features de domínio (opcionais no P0).
    String amqpUrl,
    // Segredo de assinatura do token de acesso (Task 1). Passou a ser obrigatório com a chegada
    // do Spring Security: sem ele o serviço não valida nenhuma rota protegida, e subir assim só
    // adiaria a falha para a primeira requisição. O mínimo de 32 caracteres é exigência do
    // HS256 (chave de 256 bits) — mesma regra de `identidade`, que assina o mesmo token.
    @NotBlank(message = "JWT_SECRET é obrigatório")
        @Size(min = 32, message = "JWT_SECRET precisa de pelo menos 32 caracteres (HS256)")
        String jwtSecret,
    String adminEmail,
    String adminPassword) {

  /**
   * Origens liberadas para CORS, sem curinga (RNF-SEC-21). Lista vazia significa nenhuma origem
   * liberada — mesmo comportamento do {@code origin: false} no lado Nest.
   */
  public List<String> originsPermitidas() {
    return Arrays.stream(corsAllowedOrigins.split(","))
        .map(String::trim)
        .filter(origem -> !origem.isEmpty() && !"*".equals(origem))
        .toList();
  }
}
