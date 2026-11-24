package br.com.leai.identidade.perfil.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import br.com.leai.identidade.RelogioDeTeste;
import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.common.LimitePorUsuario;
import br.com.leai.identidade.perfil.dto.PerfilResposta;
import br.com.leai.identidade.perfil.dto.PerfilResumoResposta;
import br.com.leai.identidade.perfil.validacao.ValidadorDeAvatar;
import br.com.leai.identidade.usuario.Usuario;
import br.com.leai.identidade.usuario.UsuarioRepositorio;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * RN-08 no serviço de perfil, sem banco: repositório e relação mockados. O que se prova é que o
 * serviço aplica {@link RelacaoEntrePerfis#conteudoRestrito} à privacidade e à relação de quem
 * pergunta, e que a identidade pública continua visível com o conteúdo restrito.
 */
class ServicoDePerfilTest {

  private final UsuarioRepositorio repositorio = mock(UsuarioRepositorio.class);
  private final RelacaoEntrePerfis relacoes = mock(RelacaoEntrePerfis.class);
  private ServicoDePerfil servico;

  private final UUID eu = UUID.randomUUID();

  @BeforeEach
  void montar() {
    servico =
        new ServicoDePerfil(
            repositorio,
            new ValidadorDeAvatar("leai"),
            relacoes,
            new LimitePorUsuario(30, "Muitas buscas.", new RelogioDeTeste()));
  }

  private Usuario perfil(String privacidade) {
    Usuario usuario =
        Usuario.novo(
            "dona@exemplo.com", "dona_perfil", "Dona", LocalDate.of(1990, 1, 1), "hash-qualquer");
    usuario.editarPerfil("Dona", "Leio de tudo.", null, null, privacidade);
    given(repositorio.buscarVisivelPorUsername("dona_perfil")).willReturn(Optional.of(usuario));
    return usuario;
  }

  @Test
  @DisplayName("RN-08: perfil privado para quem não segue mostra nome e bio, com conteúdo restrito")
  void privadoParaNaoSeguidor() {
    Usuario dona = perfil("privado");
    given(relacoes.entre(eu, dona.id())).willReturn(RelacaoEntrePerfis.NENHUMA);

    PerfilResposta resposta = servico.deOutro(eu, "dona_perfil");

    assertThat(resposta.conteudoRestrito()).isTrue();
    assertThat(resposta.relacao()).isEqualTo(RelacaoEntrePerfis.NENHUMA);
    assertThat(resposta.displayName()).isEqualTo("Dona");
    assertThat(resposta.biografia()).isEqualTo("Leio de tudo.");
  }

  @Test
  @DisplayName("RN-08: perfil privado para seguidor aceito tem o conteúdo aberto")
  void privadoParaSeguidor() {
    Usuario dona = perfil("privado");
    given(relacoes.entre(eu, dona.id())).willReturn(RelacaoEntrePerfis.SEGUINDO);

    PerfilResposta resposta = servico.deOutro(eu, "dona_perfil");

    assertThat(resposta.conteudoRestrito()).isFalse();
    assertThat(resposta.relacao()).isEqualTo(RelacaoEntrePerfis.SEGUINDO);
  }

  @Test
  @DisplayName("RN-08: pedido pendente não abre o perfil privado, nem na busca")
  void pedidoPendenteNaoAbre() {
    Usuario dona = perfil("privado");
    given(relacoes.entre(eu, dona.id())).willReturn(RelacaoEntrePerfis.SOLICITACAO_ENVIADA);

    assertThat(servico.deOutro(eu, "dona_perfil").conteudoRestrito()).isTrue();
    List<PerfilResumoResposta> busca = servico.buscar(eu, "dona_perfil");
    // Encontrado por username exato mesmo privado (RN-08), com o conteúdo fechado.
    assertThat(busca).hasSize(1);
    assertThat(busca.get(0).conteudoRestrito()).isTrue();
  }

  @Test
  @DisplayName("conta oculta ou inexistente é 404 sem consultar a relação")
  void ocultaE404() {
    given(repositorio.buscarVisivelPorUsername(any())).willReturn(Optional.empty());

    assertThatThrownBy(() -> servico.deOutro(eu, "sumida"))
        .isInstanceOfSatisfying(
            ErroDeNegocioException.class,
            erro -> assertThat(erro.codigo()).isEqualTo(CodigoErro.RECURSO_NAO_ENCONTRADO));
    verify(relacoes, never()).entre(any(), any());
  }
}
