package br.com.leai.identidade.auth;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Sessão emitida pelo login e pela renovação (RF-AUT-03): acesso curto mais renovação rotativa.
 *
 * <p>Estende o {@code Token} de P0-NAV só com {@code refreshToken}; os três campos anteriores
 * não mudaram de nome nem de sentido, então o cliente que só lê o acesso continua funcionando.
 */
@Schema(name = "Sessao")
public record SessaoResposta(
    @Schema(description = "JWT assinado em HS256") String accessToken,
    @Schema(example = "Bearer") String tokenType,
    @Schema(description = "Validade do token de acesso em segundos", example = "900")
        long expiresIn,
    @Schema(description = "Token opaco, rotativo e revogável") String refreshToken) {

  public static final String TIPO = "Bearer";

  public static SessaoResposta de(String accessToken, long expiresIn, String refreshToken) {
    return new SessaoResposta(accessToken, TIPO, expiresIn, refreshToken);
  }
}
