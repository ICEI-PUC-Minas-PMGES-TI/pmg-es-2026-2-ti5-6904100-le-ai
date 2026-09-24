package br.com.leai.identidade.perfil;

import br.com.leai.identidade.usuario.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema `PerfilResumo`: só o que é público em qualquer privacidade (RN-08), mais o estado de
 * acesso de quem pergunta. É o que a busca e as listas devolvem; biografia e contadores ficam no
 * `Perfil` inteiro.
 */
@Schema(name = "PerfilResumo")
public record PerfilResumoResposta(
    String id,
    String username,
    String displayName,
    String avatarUrl,
    String privacidade,
    boolean conteudoRestrito,
    String relacao) {

  public static PerfilResumoResposta de(Usuario usuario, String relacao) {
    return new PerfilResumoResposta(
        usuario.id().toString(),
        usuario.username(),
        usuario.nomeExibicao(),
        usuario.avatarUrl(),
        usuario.privacidade(),
        RelacaoEntrePerfis.conteudoRestrito(usuario.ehPrivado(), relacao),
        relacao);
  }
}
