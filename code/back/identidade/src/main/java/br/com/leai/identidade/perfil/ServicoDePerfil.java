package br.com.leai.identidade.perfil;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Perfil do próprio leitor (RF-SOC-01/04). O dono vem sempre do token, nunca do corpo. */
@Service
public class ServicoDePerfil {

  static final String SESSAO_EXPIRADA = "Sua sessão expirou. Entre novamente.";

  private final UsuarioRepositorio repositorio;
  private final ValidadorDeAvatar validadorDeAvatar;

  public ServicoDePerfil(UsuarioRepositorio repositorio, ValidadorDeAvatar validadorDeAvatar) {
    this.repositorio = repositorio;
    this.validadorDeAvatar = validadorDeAvatar;
  }

  @Transactional(readOnly = true)
  public PerfilResposta meu(UUID usuarioId) {
    return PerfilResposta.proprio(conta(usuarioId));
  }

  @Transactional
  public PerfilResposta editar(UUID usuarioId, EditarPerfilRequisicao requisicao) {
    // Antes de qualquer escrita: avatar recusado não salva nada, nem nome nem biografia.
    String avatarUrl = null;
    String avatarAssetId = null;
    if (requisicao.avatar() != null) {
      avatarUrl =
          validadorDeAvatar.validar(requisicao.avatar().url(), requisicao.avatar().publicId());
      avatarAssetId = requisicao.avatar().publicId();
    }

    Usuario usuario =
        repositorio
            .buscarParaAtualizar(usuarioId)
            .orElseThrow(
                () -> new ErroDeNegocioException(CodigoErro.NAO_AUTENTICADO, SESSAO_EXPIRADA));
    String biografia = requisicao.biografia() == null ? null : requisicao.biografia().strip();
    usuario.editarPerfil(
        requisicao.displayName().strip(),
        biografia == null || biografia.isEmpty() ? null : biografia,
        avatarUrl,
        avatarAssetId,
        requisicao.privacidade());
    repositorio.flush();
    return PerfilResposta.proprio(usuario);
  }

  private Usuario conta(UUID usuarioId) {
    return repositorio
        .findById(usuarioId)
        .orElseThrow(() -> new ErroDeNegocioException(CodigoErro.NAO_AUTENTICADO, SESSAO_EXPIRADA));
  }
}
