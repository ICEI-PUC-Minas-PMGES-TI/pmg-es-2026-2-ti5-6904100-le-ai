package br.com.leai.identidade.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;

/** O serviço não sobe com configuração inválida — equivalente ao schema zod do lado Nest. */
class AppPropertiesTest {

  private final ApplicationContextRunner runner =
      new ApplicationContextRunner()
          .withConfiguration(
              AutoConfigurations.of(
                  ConfigurationPropertiesAutoConfiguration.class,
                  ValidationAutoConfiguration.class))
          .withUserConfiguration(Habilita.class);

  @EnableConfigurationProperties(AppProperties.class)
  static class Habilita {}

  /** 32 caracteres: o mínimo que o HS256 aceita como chave. */
  private static final String SEGREDO_VALIDO = "segredo-de-teste-com-32-caracteres";

  @Test
  @DisplayName("não sobe sem DATABASE_URL")
  void naoSobeSemDatabaseUrl() {
    runner
        .withPropertyValues(
            "leai.service-name=identidade",
            "leai.db-schema=identidade",
            "leai.database-url=",
            "leai.cors-allowed-origins=http://localhost:5173",
            "leai.jwt-secret=" + SEGREDO_VALIDO)
        .run(contexto -> assertThat(contexto).hasFailed());
  }

  @Test
  @DisplayName("não sobe sem JWT_SECRET")
  void naoSobeSemJwtSecret() {
    runner
        .withPropertyValues(
            "leai.service-name=identidade",
            "leai.db-schema=identidade",
            "leai.database-url=jdbc:postgresql://localhost:5432/leai",
            "leai.cors-allowed-origins=http://localhost:5173",
            "leai.jwt-secret=")
        .run(contexto -> assertThat(contexto).hasFailed());
  }

  @Test
  @DisplayName("não sobe com JWT_SECRET curto demais para HS256")
  void naoSobeComJwtSecretCurto() {
    runner
        .withPropertyValues(
            "leai.service-name=identidade",
            "leai.db-schema=identidade",
            "leai.database-url=jdbc:postgresql://localhost:5432/leai",
            "leai.cors-allowed-origins=http://localhost:5173",
            "leai.jwt-secret=curto-demais")
        .run(contexto -> assertThat(contexto).hasFailed());
  }

  @Test
  @DisplayName("sobe com o conjunto mínimo de variáveis")
  void sobeComConjuntoMinimo() {
    runner
        .withPropertyValues(
            "leai.service-name=identidade",
            "leai.db-schema=identidade",
            "leai.database-url=jdbc:postgresql://localhost:5432/leai",
            "leai.cors-allowed-origins=http://localhost:5173",
            "leai.jwt-secret=" + SEGREDO_VALIDO)
        .run(
            contexto -> {
              assertThat(contexto).hasNotFailed();
              assertThat(contexto.getBean(AppProperties.class).serviceName())
                  .isEqualTo("identidade");
            });
  }

  @Test
  @DisplayName("mapeia as configurações opcionais do Brevo")
  void mapeiaConfiguracaoBrevo() {
    runner
        .withPropertyValues(
            "leai.service-name=identidade",
            "leai.db-schema=identidade",
            "leai.database-url=jdbc:postgresql://localhost:5432/leai",
            "leai.cors-allowed-origins=http://localhost:5173",
            "leai.brevo-api-key=api-key-de-teste",
            "leai.brevo-smtp-key=smtp-key-de-teste",
            "leai.brevo-smtp-host=smtp-relay.brevo.com",
            "leai.brevo-smtp-port=587",
            "leai.brevo-sender-email=contato@leai.example",
            "leai.brevo-sender-name=Lê Ai",
            "leai.jwt-secret=" + SEGREDO_VALIDO)
        .run(
            contexto -> {
              AppProperties propriedades = contexto.getBean(AppProperties.class);
              assertThat(propriedades.brevoApiKey()).isEqualTo("api-key-de-teste");
              assertThat(propriedades.brevoSmtpKey()).isEqualTo("smtp-key-de-teste");
              assertThat(propriedades.brevoSmtpHost()).isEqualTo("smtp-relay.brevo.com");
              assertThat(propriedades.brevoSmtpPort()).isEqualTo(587);
              assertThat(propriedades.brevoSenderEmail()).isEqualTo("contato@leai.example");
              assertThat(propriedades.brevoSenderName()).isEqualTo("Lê Ai");
            });
  }

  @Test
  @DisplayName("descarta curinga e espaço em branco na lista de origens do CORS")
  void descartaCuringaNasOrigens() {
    AppProperties propriedades =
        new AppProperties(
            "identidade",
            "identidade",
            "jdbc:postgresql://localhost:5432/leai",
            " http://localhost:5173 , * , https://leai-web.onrender.com ,",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null);

    assertThat(propriedades.originsPermitidas())
        .isEqualTo(List.of("http://localhost:5173", "https://leai-web.onrender.com"));
  }
}
