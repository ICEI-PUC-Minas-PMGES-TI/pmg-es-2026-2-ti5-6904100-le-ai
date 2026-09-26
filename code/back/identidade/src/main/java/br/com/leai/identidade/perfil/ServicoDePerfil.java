package br.com.leai.identidade.perfil;

import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.common.LimitePorUsuario;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Perfil do próprio leitor e de outros, e a busca exata (RF-SOC-01..04, RN-08). */
@Service
public class ServicoDePerfil {

  static final String SESSAO_EXPIRADA = "Sua sessão expirou. Entre novamente.";

  static final String NAO_ENCONTRADO = "Não encontramos esse leitor.";

  private final UsuarioRepositorio repositorio;
  private final ValidadorDeAvatar validadorDeAvatar;
  private final RelacaoEntrePerfis relacoes;
  private final LimitePorUsuario limiteDeBusca;

  public ServicoDePerfil(
      UsuarioRepositorio repositorio,
      ValidadorDeAvatar validadorDeAvatar,
      RelacaoEntrePerfis relacoes,
      @Qualifier("limiteDeBusca") LimitePorUsuario limiteDeBusca) {
    this.repositorio = repositorio;
    this.validadorDeAvatar = validadorDeAvatar;
    this.relacoes = relacoes;
    this.limiteDeBusca = limiteDeBusca;
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

  /**
   * Perfil de outro leitor (RF-SOC-02, RN-08). Identidade, biografia e contadores são públicos
   * em qualquer privacidade; `conteudoRestrito` diz aos clientes se os serviços donos vão recusar
   * o conteúdo social. Perfil privado para não-seguidor não é `403`: é o mesmo `200` com a
   * restrição marcada. Conta oculta é `404`, igual à inexistente.
   */
  @Transactional(readOnly = true)
  public PerfilResposta deOutro(UUID quemPergunta, String username) {
    Usuario perfil =
        repositorio
            .buscarVisivelPorUsername(username)
            .orElseThrow(
                () ->
                    new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, NAO_ENCONTRADO));
    String relacao = relacoes.entre(quemPergunta, perfil.id());
    return PerfilResposta.de(
        perfil, relacao, RelacaoEntrePerfis.conteudoRestrito(perfil.ehPrivado(), relacao));
  }

  /**
   * Busca por username exato (RF-SOC-03): zero ou um resultado, nunca por prefixo. Formato
   * inválido já foi recusado no controller; aqui só a igualdade.
   */
  @Transactional(readOnly = true)
  public List<PerfilResumoResposta> buscar(UUID quemPergunta, String username) {
    limiteDeBusca.registrar(quemPergunta);
    return repositorio
        .buscarVisivelPorUsername(username)
        .map(perfil -> List.of(PerfilResumoResposta.de(perfil, relacoes.entre(quemPergunta, perfil.id()))))
        .orElse(List.of());
  }

  private Usuario conta(UUID usuarioId) {
    return repositorio
        .findById(usuarioId)
        .orElseThrow(() -> new ErroDeNegocioException(CodigoErro.NAO_AUTENTICADO, SESSAO_EXPIRADA));
  }
}
