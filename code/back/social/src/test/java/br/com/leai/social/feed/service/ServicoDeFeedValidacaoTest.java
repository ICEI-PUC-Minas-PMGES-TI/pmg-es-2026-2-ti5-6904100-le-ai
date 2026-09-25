package br.com.leai.social.feed.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.feed.repository.AtividadeRepository;
import br.com.leai.social.feed.repository.ComentarioRepository;
import br.com.leai.social.feed.repository.CurtidaAtividadeRepository;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mockito;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * {@link ServicoDeFeed#listar} não depende de banco para recusar página/tamanho inválidos
 * (RNF-DES-02): dependências vêm mockadas e nunca são tocadas quando a validação falha antes.
 */
class ServicoDeFeedValidacaoTest {

  private final AtividadeRepository atividadeRepository = Mockito.mock(AtividadeRepository.class);
  private final CurtidaAtividadeRepository curtidaRepository =
      Mockito.mock(CurtidaAtividadeRepository.class);
  private final ComentarioRepository comentarioRepository = Mockito.mock(ComentarioRepository.class);
  private final JdbcTemplate jdbc = Mockito.mock(JdbcTemplate.class);

  private final ServicoDeFeed servico =
      new ServicoDeFeed(atividadeRepository, curtidaRepository, comentarioRepository, jdbc);

  @ParameterizedTest(name = "page={0}, size={1} é rejeitado")
  @CsvSource({"-1, 20", "0, 0", "0, 51", "0, -5"})
  void rejeitaPaginacaoInvalidaSemTocarNoBanco(int page, int size) {
    UUID usuarioId = UUID.randomUUID();

    assertThatThrownBy(() -> servico.listar(usuarioId, page, size))
        .isInstanceOf(ErroDeNegocioException.class)
        .hasMessageContaining("Página a partir de 0 e tamanho de 1 a 50");

    verifyNoInteractions(atividadeRepository, curtidaRepository, comentarioRepository, jdbc);
  }

  @Test
  @DisplayName("tamanho padrão é 20 e o limite máximo é 50")
  void tamanhoPadraoEhVinteELimiteMaximoEhCinquenta() {
    assertThat(ServicoDeFeed.TAMANHO_PADRAO).isEqualTo(20);
    assertThat(ServicoDeFeed.TAMANHO_MAXIMO).isEqualTo(50);
  }
}
