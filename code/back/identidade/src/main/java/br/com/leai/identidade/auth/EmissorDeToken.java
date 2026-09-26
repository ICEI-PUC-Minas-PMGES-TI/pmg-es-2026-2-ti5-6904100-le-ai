package br.com.leai.identidade.auth;

import br.com.leai.identidade.config.JwtConfig;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

/**
 * Emite o token de acesso do login (RF-AUT-03, subconjunto).
 *
 * <p>O cabeçalho JWS é passado explicitamente: sem ele o {@code NimbusJwtEncoder} assume RS256 e
 * falha, porque a chave é simétrica.
 *
 * <p>O {@code subject} é o id do usuário, não o username: username é mutável e o token não pode
 * depender de algo que o leitor pode trocar no perfil (F-PERFIL).
 */
@Component
public class EmissorDeToken {

  private final JwtEncoder jwtEncoder;

  public EmissorDeToken(JwtEncoder jwtEncoder) {
    this.jwtEncoder = jwtEncoder;
  }

  public String emitir(UUID usuarioId, String username) {
    return emitir(usuarioId, username, Papel.LEITOR);
  }

  /** A claim {@code papel} vai sempre, inclusive para leitor: ausência não é papel. */
  public String emitir(UUID usuarioId, String username, Papel papel) {
    Instant agora = Instant.now().truncatedTo(ChronoUnit.SECONDS);

    JwtClaimsSet reivindicacoes =
        JwtClaimsSet.builder()
            .issuer("identidade")
            .subject(usuarioId.toString())
            .issuedAt(agora)
            .expiresAt(agora.plus(JwtConfig.VALIDADE_DO_ACESSO))
            .claim("username", username)
            .claim(Papel.CLAIM, papel.valor())
            .build();

    JwsHeader cabecalho = JwsHeader.with(JwtConfig.ALGORITMO).build();
    return jwtEncoder.encode(JwtEncoderParameters.from(cabecalho, reivindicacoes)).getTokenValue();
  }

  /** Segundos de validade do token emitido, para o corpo da resposta de login. */
  public long validadeEmSegundos() {
    return JwtConfig.VALIDADE_DO_ACESSO.toSeconds();
  }
}
