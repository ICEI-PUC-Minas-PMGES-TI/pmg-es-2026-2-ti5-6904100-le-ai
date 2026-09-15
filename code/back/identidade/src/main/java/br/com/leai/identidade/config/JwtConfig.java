package br.com.leai.identidade.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * Emissão e validação do token de acesso (RF-AUT-03, subconjunto).
 *
 * <p>HS256 com segredo compartilhado, e não um par de chaves: só este serviço emite e só ele
 * valida, então não há terceiro precisando verificar assinatura sem conhecer o segredo. O
 * segredo vem do ambiente (RNF-SEC-11) e é validado no boot pelo {@link AppProperties}.
 *
 * <p>O que <b>não</b> está aqui é o token de renovação rotativo e revogável, que fecha o
 * RF-AUT-03 e pertence a F-AUT. P0-NAV emite apenas o token de acesso curto.
 */
@Configuration
public class JwtConfig {

  /** Validade do token de acesso: curta, como o RF-AUT-03 pede. */
  public static final Duration VALIDADE_DO_ACESSO = Duration.ofMinutes(15);

  public static final MacAlgorithm ALGORITMO = MacAlgorithm.HS256;

  /** Nome JCA do HMAC-SHA256. Não confundir com {@code HS256}, que é o nome do algoritmo no JWS. */
  private static final String ALGORITMO_JCA = "HmacSHA256";

  @Bean
  public SecretKey chaveDeAssinatura(AppProperties propriedades) {
    return new SecretKeySpec(
        propriedades.jwtSecret().getBytes(StandardCharsets.UTF_8), ALGORITMO_JCA);
  }

  @Bean
  public JwtEncoder jwtEncoder(SecretKey chaveDeAssinatura) {
    return new NimbusJwtEncoder(new ImmutableSecret<SecurityContext>(chaveDeAssinatura));
  }

  @Bean
  public JwtDecoder jwtDecoder(SecretKey chaveDeAssinatura) {
    return NimbusJwtDecoder.withSecretKey(chaveDeAssinatura).macAlgorithm(ALGORITMO).build();
  }
}
