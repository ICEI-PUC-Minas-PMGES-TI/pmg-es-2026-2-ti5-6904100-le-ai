package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import tools.jackson.databind.ObjectMapper;

/**
 * Token vencido no {@code Authorization} (F-AUT): rota pública ignora o cabeçalho, porque é
 * exatamente quando o acesso venceu que o cliente entra de novo ou renova. Rota protegida
 * continua recusando com 401.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class TokenVencidoIntegracaoTest extends IntegracaoComPostgres {

  private static final String SENHA = "senha-bem-comprida";

  @Autowired private ObjectMapper objectMapper;

  @Autowired private JwtEncoder jwtEncoder;

  /**
   * Assinado pelo próprio serviço, mas vencido há 5 minutos: além da tolerância de 60 s de
   * relógio do decoder.
   */
  private String vencido() {
    Instant emitido = Instant.now().minus(Duration.ofMinutes(20));
    JwtClaimsSet reivindicacoes =
        JwtClaimsSet.builder()
            .issuer("identidade")
            .subject(UUID.randomUUID().toString())
            .issuedAt(emitido)
            .expiresAt(emitido.plus(Duration.ofMinutes(15)))
            .build();
    JwsHeader cabecalho = JwsHeader.with(MacAlgorithm.HS256).build();
    return "Bearer "
        + jwtEncoder.encode(JwtEncoderParameters.from(cabecalho, reivindicacoes)).getTokenValue();
  }

  private String novoLeitor() {
    String s = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    HttpResponse<String> cadastro =
        postJson(
            "/auth/register",
            """
            {"email":"vencido.%1$s@exemplo.com","username":"vencido_%1$s","displayName":"Leitora",
             "dataNascimento":"1990-01-01","senha":"%2$s"}
            """
                .formatted(s, SENHA),
            "Idempotency-Key",
            UUID.randomUUID().toString());
    assertThat(cadastro.statusCode()).isEqualTo(201);
    return "vencido_" + s;
  }

  private HttpResponse<String> entrar(String username, String authorization) {
    return postJson(
        "/auth/login",
        "{\"identificador\":\"%s\",\"senha\":\"%s\"}".formatted(username, SENHA),
        "Idempotency-Key",
        UUID.randomUUID().toString(),
        "Authorization",
        authorization);
  }

  @Test
  @DisplayName("login e renovação com token vencido no cabeçalho funcionam normalmente")
  void rotaPublicaIgnoraTokenVencido() {
    String username = novoLeitor();

    HttpResponse<String> login = entrar(username, vencido());
    assertThat(login.statusCode()).isEqualTo(200);

    String refreshToken = objectMapper.readTree(login.body()).get("refreshToken").asString();
    HttpResponse<String> renovacao =
        postJson(
            "/auth/refresh",
            "{\"refreshToken\":\"" + refreshToken + "\"}",
            "Idempotency-Key",
            UUID.randomUUID().toString(),
            "Authorization",
            vencido());
    assertThat(renovacao.statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("rota protegida continua recusando token vencido com 401")
  void rotaProtegidaRecusaTokenVencido() {
    HttpResponse<String> resposta =
        enviar(
            HttpRequest.newBuilder(uri("/me"))
                .header("Authorization", vencido())
                .GET()
                .build());

    assertThat(resposta.statusCode()).isEqualTo(401);
    assertThat(resposta.body()).contains("NAO_AUTENTICADO");
  }
}
