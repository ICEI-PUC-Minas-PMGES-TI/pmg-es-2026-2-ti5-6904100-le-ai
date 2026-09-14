package br.com.leai.identidade.auth;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Resposta do login (RF-AUT-03, subconjunto).
 *
 * <p>Só o token de acesso. O token de renovação rotativo e revogável, que fecha o RF-AUT-03,
 * pertence a F-AUT: enquanto ele não existe, a sessão do cliente dura o que dura o acesso.
 */
@Schema(name = "Token")
public record TokenResposta(
    @Schema(description = "JWT assinado em HS256") String accessToken,
    @Schema(example = "Bearer") String tokenType,
    @Schema(description = "Validade do token em segundos", example = "900") long expiresIn) {

  public static final String TIPO = "Bearer";

  public static TokenResposta de(String accessToken, long expiresIn) {
    return new TokenResposta(accessToken, TIPO, expiresIn);
  }
}
