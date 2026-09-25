package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/**
 * Critério de aceite da Task 1: o serviço `social` sobe com a cadeia de segurança de pé, `/health`
 * continua pública, uma rota protegida sem token é 401 no corpo de erro padrão, e um JWT HS256
 * assinado com o mesmo {@code jwtSecret} autentica e expõe {@code token.getSubject()}.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class SegurancaIntegracaoTest extends IntegracaoComPostgres {

  private static final String ROTA_PROTEGIDA = "/__teste/protegido";

  private String token(UUID subject, Instant expiraEm) throws Exception {
    JWTClaimsSet claims =
        new JWTClaimsSet.Builder()
            .subject(subject.toString())
            .issueTime(Date.from(Instant.now().minusSeconds(1)))
            .expirationTime(Date.from(expiraEm))
            .build();
    SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
    jwt.sign(new MACSigner(JWT_SECRET_TESTE.getBytes(StandardCharsets.UTF_8)));
    return jwt.serialize();
  }

  private HttpResponse<String> chamar(String caminho, String bearer) {
    HttpRequest.Builder requisicao = HttpRequest.newBuilder(uri(caminho)).GET();
    if (bearer != null) {
      requisicao.header("Authorization", "Bearer " + bearer);
    }
    return enviar(requisicao.build());
  }

  @Test
  @DisplayName("/health continua pública mesmo com o Security ligado")
  void healthContinuaPublica() {
    HttpResponse<String> resposta = chamar("/health", null);

    assertThat(resposta.statusCode()).isEqualTo(200);
  }

  @Test
  @DisplayName("rota protegida sem token é 401 no corpo de erro padrão")
  void semTokenRecusa401() {
    HttpResponse<String> resposta = chamar(ROTA_PROTEGIDA, null);

    assertThat(resposta.statusCode()).isEqualTo(401);
    assertThat(resposta.body()).contains("\"codigo\":\"NAO_AUTENTICADO\"").contains("correlationId");
  }

  @Test
  @DisplayName("JWT HS256 válido autentica e expõe o subject do token")
  void comTokenValidoAutenticaEExpoeSubject() throws Exception {
    UUID subject = UUID.randomUUID();
    String token = token(subject, Instant.now().plusSeconds(900));

    HttpResponse<String> resposta = chamar(ROTA_PROTEGIDA, token);

    assertThat(resposta.statusCode()).isEqualTo(200);
    assertThat(resposta.body()).isEqualTo(subject.toString());
  }

  @Test
  @DisplayName("token expirado é 401, e token assinado com outro segredo também")
  void tokenExpiradoOuAssinadoComOutroSegredoEh401() throws Exception {
    String expirado = token(UUID.randomUUID(), Instant.now().minusSeconds(60));
    assertThat(chamar(ROTA_PROTEGIDA, expirado).statusCode()).isEqualTo(401);

    JWTClaimsSet claims =
        new JWTClaimsSet.Builder()
            .subject(UUID.randomUUID().toString())
            .expirationTime(Date.from(Instant.now().plusSeconds(900)))
            .build();
    SignedJWT outroSegredo = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
    outroSegredo.sign(
        new MACSigner("outro-segredo-completamente-diferente-32".getBytes(StandardCharsets.UTF_8)));
    assertThat(chamar(ROTA_PROTEGIDA, outroSegredo.serialize()).statusCode()).isEqualTo(401);
  }
}
