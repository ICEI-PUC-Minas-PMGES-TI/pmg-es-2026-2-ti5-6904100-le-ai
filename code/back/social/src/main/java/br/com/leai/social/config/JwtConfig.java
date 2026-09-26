package br.com.leai.social.config;

import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Validação do token de acesso emitido por {@code identidade}. Porte de {@code
 * identidade.config.JwtConfig}, sem o {@code JwtEncoder}: {@code social} nunca emite token, só
 * valida o que chega em {@code Authorization: Bearer}.
 *
 * <p>HS256 com segredo compartilhado, e não um par de chaves: os dois serviços conhecem o mesmo
 * {@code JWT_SECRET} (RNF-SEC-11), então não há terceiro precisando verificar assinatura sem
 * conhecer o segredo.
 */
@Configuration
public class JwtConfig {

  public static final MacAlgorithm ALGORITMO = MacAlgorithm.HS256;

  /** Nome JCA do HMAC-SHA256. Não confundir com {@code HS256}, que é o nome do algoritmo no JWS. */
  private static final String ALGORITMO_JCA = "HmacSHA256";

  @Bean
  public SecretKey chaveDeAssinatura(AppProperties propriedades) {
    return new SecretKeySpec(
        propriedades.jwtSecret().getBytes(StandardCharsets.UTF_8), ALGORITMO_JCA);
  }

  @Bean
  public JwtDecoder jwtDecoder(SecretKey chaveDeAssinatura) {
    return NimbusJwtDecoder.withSecretKey(chaveDeAssinatura).macAlgorithm(ALGORITMO).build();
  }
}
