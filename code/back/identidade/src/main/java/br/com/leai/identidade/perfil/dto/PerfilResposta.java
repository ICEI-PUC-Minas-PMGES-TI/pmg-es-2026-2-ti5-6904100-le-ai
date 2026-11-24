package br.com.leai.identidade.perfil.dto;

import br.com.leai.identidade.usuario.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema `Perfil` de `docs/api/identidade.yaml`: o `PerfilResumo` (identidade pública, privacidade,
 * se o conteúdo está restrito e a relação com quem pergunta) mais biografia e contadores.
 *
 * <p>Nunca carrega e-mail, nascimento nem hash: o perfil é público por definição (RN-08), e só o
 * conteúdo social dos outros serviços é que pode ficar restrito.
 */
@Schema(name = "Perfil")
public record PerfilResposta(
    String id,
    String username,
    String displayName,
    String avatarUrl,
    String privacidade,
    boolean conteudoRestrito,
    String relacao,
    String biografia,
    Contadores contadores,
    @Schema(
            description =
                "F-REC-ALG: só no próprio perfil; nulo no perfil de outro leitor, porque a "
                    + "preferência não é pública.")
        Boolean optOutRecomendacao) {

  @Schema(name = "ContadoresPerfil")
  public record Contadores(long seguidores, long seguidos) {}

  /** O próprio perfil: relação `proprio`, nada restrito, e a preferência de sugestões. */
  public static PerfilResposta proprio(Usuario usuario, Contadores contadores) {
    return montar(usuario, "proprio", false, contadores, usuario.optOutRecomendacao());
  }

  /**
   * {@code contadores} vêm de fora desde a F-MOD-OPC: contam só as contas visíveis (sem suspensa ou
   * em exclusão), e não os `qtd_*` gravados.
   */
  public static PerfilResposta de(
      Usuario usuario, String relacao, boolean conteudoRestrito, Contadores contadores) {
    return montar(usuario, relacao, conteudoRestrito, contadores, null);
  }

  private static PerfilResposta montar(
      Usuario usuario,
      String relacao,
      boolean conteudoRestrito,
      Contadores contadores,
      Boolean optOutRecomendacao) {
    return new PerfilResposta(
        usuario.id().toString(),
        usuario.username(),
        usuario.nomeExibicao(),
        usuario.avatarUrl(),
        usuario.privacidade(),
        conteudoRestrito,
        relacao,
        usuario.biografia(),
        contadores,
        optOutRecomendacao);
  }
}
