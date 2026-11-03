package br.com.leai.identidade.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Resposta do login para conta com exclusão pendente (F-CONTA-2, RN-23.3): token curto que só
 * serve para cancelar a exclusão, sem token de renovação, e os dados que a tela de recuperação
 * mostra ({@code recuperar-conta.md} §3).
 */
@Schema(name = "AcessoDeRecuperacao")
public record AcessoDeRecuperacaoResposta(
    @Schema(description = "JWT de recuperação, assinado com chave própria") String accessToken,
    @Schema(example = "Bearer") String tokenType,
    @Schema(example = "900") long expiresIn,
    @Schema(allowableValues = TIPO_RECUPERACAO) String tipo,
    Instant exclusaoSolicitadaEm,
    Instant exclusaoPrevistaEm,
    String username,
    String nomeExibicao)
    implements RespostaDeLogin {

  public static final String TIPO_RECUPERACAO = "recuperacao_exclusao";

  public AcessoDeRecuperacaoResposta {
    tipo = TIPO_RECUPERACAO;
  }

  public static AcessoDeRecuperacaoResposta de(
      String accessToken,
      long expiresIn,
      Instant exclusaoSolicitadaEm,
      Instant exclusaoPrevistaEm,
      String username,
      String nomeExibicao) {
    return new AcessoDeRecuperacaoResposta(
        accessToken,
        SessaoResposta.TIPO,
        expiresIn,
        TIPO_RECUPERACAO,
        exclusaoSolicitadaEm,
        exclusaoPrevistaEm,
        username,
        nomeExibicao);
  }
}
