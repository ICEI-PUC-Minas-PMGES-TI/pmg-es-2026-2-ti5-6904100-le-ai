package br.com.leai.identidade.auth.dto;

import br.com.leai.identidade.usuario.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * O leitor autenticado visto por ele mesmo, em {@code GET /me}: a identidade pública mais o
 * e-mail, que o protótipo de Configurações mostra na identificação da conta (decisão do dono de
 * F-AUT em 25/09/2026). Só o próprio dono recebe este schema; cadastro, busca, listas e perfis de
 * terceiros continuam sem e-mail.
 *
 * <p>Nunca carrega data de nascimento nem hash de senha.
 */
@Schema(name = "UsuarioProprio")
public record UsuarioProprioResposta(
    @Schema(format = "uuid") String id,
    @Schema(example = "marinableu") String username,
    @Schema(example = "Marina Beltrão") String displayName,
    @Schema(format = "email", example = "marina.beltrao@gmail.com") String email) {

  public static UsuarioProprioResposta de(Usuario usuario) {
    return new UsuarioProprioResposta(
        usuario.id().toString(), usuario.username(), usuario.nomeExibicao(), usuario.email());
  }
}
