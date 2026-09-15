package br.com.leai.identidade.auth;

import br.com.leai.identidade.usuario.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Identidade pública do leitor. Serve ao 201 do cadastro e ao 200 de {@code GET /me}, porque as
 * duas respostas são a mesma coisa: quem é este usuário.
 *
 * <p>Nunca carrega e-mail, data de nascimento ou hash de senha. O que não precisa sair, não sai.
 */
@Schema(name = "Usuario")
public record UsuarioResposta(
    @Schema(format = "uuid") String id,
    @Schema(example = "marinableu") String username,
    @Schema(example = "Marina Beltrão") String displayName) {

  public static UsuarioResposta de(Usuario usuario) {
    return new UsuarioResposta(
        usuario.id().toString(), usuario.username(), usuario.nomeExibicao());
  }
}
