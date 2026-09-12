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

  @Test
  @DisplayName("não sobe sem DATABASE_URL")
  void naoSobeSemDatabaseUrl() {
    runner
        .withPropertyValues(
            "leai.service-name=identidade",
            "leai.db-schema=identidade",
            "leai.database-url=",
            "leai.cors-allowed-origins=http://localhost:5173")
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
            "leai.cors-allowed-origins=http://localhost:5173")
        .run(
            contexto -> {
              assertThat(contexto).hasNotFailed();
              assertThat(contexto.getBean(AppProperties.class).serviceName())
                  .isEqualTo("identidade");
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
            null);

    assertThat(propriedades.originsPermitidas())
        .isEqualTo(List.of("http://localhost:5173", "https://leai-web.onrender.com"));
  }
}
