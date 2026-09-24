package br.com.leai.identidade.integracao;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Set;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Base dos testes de integração contra Postgres real (RNF-TST-02): o serviço inteiro de pé, com
 * Flyway, cadeia do Spring Security, filtros e HTTP de verdade.
 *
 * <p>Roda só com {@code DATABASE_URL_TESTE} definida (no CI, o serviço Postgres do job). Sem ela
 * os testes são ignorados e {@code ./mvnw verify} continua rodando sem banco. <b>Cada subclasse
 * declara {@code @EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")}</b>:
 * condição do JUnit não é herdada, e na base ela seria ignorada.
 *
 * <p><b>O schema é apagado e recriado a cada contexto</b> ({@code flyway.clean()}). Por isso a
 * URL precisa apontar para host local: o {@code .env} do serviço aponta para o Neon, e um clean
 * lá apagaria DES. A trava abaixo recusa qualquer outro host antes de o contexto subir.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(IntegracaoComPostgres.SchemaLimpo.class)
public abstract class IntegracaoComPostgres {

  private static final Set<String> HOSTS_LOCAIS = Set.of("localhost", "127.0.0.1");

  protected static final String ORIGEM_WEB = "http://localhost:5173";

  protected static final HttpClient HTTP = HttpClient.newHttpClient();

  @LocalServerPort private int porta;

  @DynamicPropertySource
  static void banco(DynamicPropertyRegistry registro) {
    String url = System.getenv("DATABASE_URL_TESTE");
    exigirHostLocal(url);

    registro.add("spring.datasource.url", () -> url);
    registro.add("spring.datasource.username", () -> ambiente("DATABASE_USERNAME_TESTE", "postgres"));
    registro.add("spring.datasource.password", () -> ambiente("DATABASE_PASSWORD_TESTE", ""));
    registro.add("spring.flyway.clean-disabled", () -> "false");
    registro.add("leai.database-url", () -> url);
    registro.add("leai.cors-allowed-origins", () -> ORIGEM_WEB);
    registro.add("leai.jwt-secret", () -> "segredo-de-integracao-com-32-caracteres");
    // O .env local é lido pelo spring.config.import e pode ligar a mensageria contra o
    // CloudAMQP. Os testes deste pacote não dependem do broker.
    registro.add("leai.amqp-enabled", () -> "false");
    registro.add("leai.p0-ping-enabled", () -> "false");
    // O .env local pode ter a chave real do Brevo: sem isto, a suíte mandaria e-mail de verdade.
    registro.add("leai.brevo-api-key", () -> "");
    registro.add("leai.web-base-url", () -> ORIGEM_WEB);
    // Sem admin por padrão; AdminIntegracaoTest define o seu.
    registro.add("leai.admin-email", () -> "");
    registro.add("leai.admin-password", () -> "");
    // Tudo sai de 127.0.0.1: com o limite de produção (60/min em /auth/**), a suíte bateria no
    // 429 no meio. O limite em si é coberto pelo RateLimitFilterTest.
    registro.add("leai.rate-limit.auth-por-minuto", () -> "100000");
  }

  private static void exigirHostLocal(String url) {
    // jdbc:postgresql://host:porta/banco
    String semPrefixo = url.replaceFirst("^jdbc:postgresql://", "");
    String host = semPrefixo.split("[:/?]", 2)[0];
    if (!HOSTS_LOCAIS.contains(host)) {
      throw new IllegalStateException(
          "DATABASE_URL_TESTE precisa apontar para Postgres local: o teste apaga o schema.");
    }
  }

  private static String ambiente(String nome, String padrao) {
    String valor = System.getenv(nome);
    return valor == null ? padrao : valor;
  }

  @TestConfiguration
  static class SchemaLimpo {

    /** Cada contexto começa do zero: apaga o schema do serviço e reaplica as migrations. */
    @Bean
    FlywayMigrationStrategy limparEMigrar() {
      return flyway -> {
        flyway.clean();
        flyway.migrate();
      };
    }
  }

  protected URI uri(String caminho) {
    return URI.create("http://localhost:" + porta + caminho);
  }

  protected HttpResponse<String> postJson(String caminho, String corpo, String... cabecalhos) {
    HttpRequest.Builder requisicao =
        HttpRequest.newBuilder(uri(caminho))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(corpo));
    if (cabecalhos.length > 0) {
      requisicao.headers(cabecalhos);
    }
    return enviar(requisicao.build());
  }

  protected static HttpResponse<String> enviar(HttpRequest requisicao) {
    try {
      return HTTP.send(requisicao, HttpResponse.BodyHandlers.ofString());
    } catch (java.io.IOException erro) {
      throw new java.io.UncheckedIOException(erro);
    } catch (InterruptedException erro) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(erro);
    }
  }
}
