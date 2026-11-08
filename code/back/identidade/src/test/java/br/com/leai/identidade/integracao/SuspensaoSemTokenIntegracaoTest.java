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
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** F-MOD-OPC sem {@code MODERACAO_TOKEN}: o serviço sobe e as rotas internas respondem 503. */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
@ExtendWith(OutputCaptureExtension.class)
class SuspensaoSemTokenIntegracaoTest extends IntegracaoComPostgres {

  @DynamicPropertySource
  static void semToken(DynamicPropertyRegistry registro) {
    // O .env local pode ter o segredo; aqui ele precisa estar vazio.
    registro.add("leai.moderacao-token", () -> "");
  }

  @Autowired private JwtEncoder jwtEncoder;

  @Test
  @DisplayName("sem MODERACAO_TOKEN configurado, o admin recebe 503, logado como WARN sem stack")
  void semTokenConfigurado(CapturedOutput saida) {
    Instant agora = Instant.now();
    String admin =
        jwtEncoder
            .encode(
                JwtEncoderParameters.from(
                    JwsHeader.with(MacAlgorithm.HS256).build(),
                    JwtClaimsSet.builder()
                        .issuer("identidade")
                        .subject(UUID.randomUUID().toString())
                        .issuedAt(agora)
                        .expiresAt(agora.plus(Duration.ofMinutes(15)))
                        .claim("papel", "admin")
                        .build()))
            .getTokenValue();

    HttpResponse<String> resposta =
        enviar(
            HttpRequest.newBuilder(
                    uri("/internal/moderacao/usuarios/" + UUID.randomUUID() + "/suspensao"))
                .header("Authorization", "Bearer " + admin)
                .header("X-Moderacao-Token", "qualquer-token-com-32-caracteres!!!")
                .header("X-Comando-Id", UUID.randomUUID().toString())
                .POST(HttpRequest.BodyPublishers.noBody())
                .build());

    assertThat(resposta.statusCode()).isEqualTo(503);
    // Estado de configuração conhecido, com WARN na partida: não é "erro não tratado".
    assertThat(saida.getOut()).doesNotContain("Erro não tratado");
    assertThat(saida.getOut()).contains("SERVICO_INDISPONIVEL (503)");
  }
}
