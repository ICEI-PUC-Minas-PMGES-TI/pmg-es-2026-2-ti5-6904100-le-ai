package br.com.leai.identidade.conta.service;

import br.com.leai.identidade.config.AppProperties;
import br.com.leai.identidade.config.JwtConfig;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.proc.SecurityContext;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Component;

/**
 * Acesso de recuperação da conta com exclusão pendente (F-CONTA-2, RN-23.3).
 *
 * <p>Assinado com <b>chave própria</b>, derivada do {@code JWT_SECRET} por HMAC, e não com a do
 * token de acesso. Os demais serviços validam o acesso com o {@code JWT_SECRET} cru, então este
 * token falha na assinatura em qualquer rota deles, e também nas outras rotas deste serviço, sem
 * que nenhum código de lá precise mudar. A derivação evita um segredo novo no ambiente: só quem
 * aplica a mesma derivação valida, e só este serviço a aplica.
 *
 * <p>Encoder e decoder ficam aqui dentro, e não como beans: um segundo {@code JwtDecoder} no
 * contexto quebraria a configuração automática do resource server, que espera um só.
 */
@Component
public class TokenDeRecuperacao {

  public static final String CLAIM_ESCOPO = "escopo";
  public static final String ESCOPO = "recuperacao_exclusao";

  private static final String ALGORITMO_JCA = "HmacSHA256";

  private final NimbusJwtEncoder codificador;
  private final JwtDecoder decodificador;

  public TokenDeRecuperacao(AppProperties propriedades) {
    SecretKey chave = derivar(propriedades.jwtSecret());
    this.codificador = new NimbusJwtEncoder(new ImmutableSecret<SecurityContext>(chave));
    NimbusJwtDecoder decoder =
        NimbusJwtDecoder.withSecretKey(chave).macAlgorithm(JwtConfig.ALGORITMO).build();
    // Defesa em profundidade: além da chave, o escopo tem de estar no token.
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer("identidade"),
            new JwtClaimValidator<String>(CLAIM_ESCOPO, ESCOPO::equals)));
    this.decodificador = decoder;
  }

  public String emitir(UUID usuarioId, String username) {
    Instant agora = Instant.now().truncatedTo(ChronoUnit.SECONDS);
    JwtClaimsSet reivindicacoes =
        JwtClaimsSet.builder()
            .issuer("identidade")
            .subject(usuarioId.toString())
            .issuedAt(agora)
            .expiresAt(agora.plus(JwtConfig.VALIDADE_DO_ACESSO))
            .claim("username", username)
            .claim(CLAIM_ESCOPO, ESCOPO)
            .build();
    JwsHeader cabecalho = JwsHeader.with(JwtConfig.ALGORITMO).build();
    return codificador
        .encode(JwtEncoderParameters.from(cabecalho, reivindicacoes))
        .getTokenValue();
  }

  public long validadeEmSegundos() {
    return JwtConfig.VALIDADE_DO_ACESSO.toSeconds();
  }

  public JwtDecoder decodificador() {
    return decodificador;
  }

  private static SecretKey derivar(String jwtSecret) {
    try {
      Mac mac = Mac.getInstance(ALGORITMO_JCA);
      mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), ALGORITMO_JCA));
      byte[] derivada =
          mac.doFinal("leai-identidade/recuperacao-exclusao/v1".getBytes(StandardCharsets.UTF_8));
      return new SecretKeySpec(derivada, ALGORITMO_JCA);
    } catch (GeneralSecurityException erro) {
      throw new IllegalStateException("HmacSHA256 indisponível na JVM", erro);
    }
  }
}
