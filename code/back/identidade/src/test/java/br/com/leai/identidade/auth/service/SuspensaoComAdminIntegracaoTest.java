package br.com.leai.identidade.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.identidade.email.EmailNotificationService;
import br.com.leai.identidade.integracao.IntegracaoComPostgres;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * F-MOD-OPC com o admin provisionado. Fica no pacote {@code auth.service}, como o {@code
 * AdminIntegracaoTest}, para chamar o provisionamento direto: com o admin definido, só o {@code
 * sub} dele passa, e a conta administradora não é suspensa (422).
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class SuspensaoComAdminIntegracaoTest extends IntegracaoComPostgres {

  private static final String TOKEN_DE_MODERACAO = "token-de-moderacao-com-32-caracteres!";

  @DynamicPropertySource
  static void moderacao(DynamicPropertyRegistry registro) {
    registro.add("leai.moderacao-token", () -> TOKEN_DE_MODERACAO);
  }

  @MockitoBean private EmailNotificationService email;

  @Autowired private ProvisionamentoDoAdmin provisionamento;
  @Autowired private JdbcTemplate jdbc;
  @Autowired private JwtEncoder jwtEncoder;

  @BeforeEach
  void provisionar() {
    provisionamento.provisionar("admin@leai.example", "frase-longa-do-admin-2026");
  }

  private UUID admin() {
    return jdbc.queryForObject("SELECT id FROM usuario WHERE username = 'admin'", UUID.class);
  }

  private String token(UUID sujeito) {
    Instant agora = Instant.now();
    JwtClaimsSet reivindicacoes =
        JwtClaimsSet.builder()
            .issuer("identidade")
            .subject(sujeito.toString())
            .issuedAt(agora)
            .expiresAt(agora.plus(Duration.ofMinutes(15)))
            .claim("papel", "admin")
            .build();
    return jwtEncoder
        .encode(
            JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), reivindicacoes))
        .getTokenValue();
  }

  private HttpResponse<String> suspender(UUID alvo, String bearer) {
    return enviar(
        HttpRequest.newBuilder(uri("/internal/moderacao/usuarios/" + alvo + "/suspensao"))
            .header("Authorization", "Bearer " + bearer)
            .header("X-Moderacao-Token", TOKEN_DE_MODERACAO)
            .header("X-Comando-Id", UUID.randomUUID().toString())
            .POST(HttpRequest.BodyPublishers.noBody())
            .build());
  }

  @Test
  @DisplayName("com o admin provisionado, papel admin de outro sub é 403")
  void outroSujeitoComPapelAdmin() {
    assertThat(suspender(UUID.randomUUID(), token(UUID.randomUUID())).statusCode())
        .isEqualTo(403);
  }

  @Test
  @DisplayName("a conta administradora não é suspensa: 422")
  void adminNaoEhSuspenso() {
    UUID admin = admin();
    HttpResponse<String> resposta = suspender(admin, token(admin));

    assertThat(resposta.statusCode()).isEqualTo(422);
    assertThat(
            jdbc.queryForObject("SELECT suspenso FROM usuario WHERE id = ?", Boolean.class, admin))
        .isFalse();
  }
}
