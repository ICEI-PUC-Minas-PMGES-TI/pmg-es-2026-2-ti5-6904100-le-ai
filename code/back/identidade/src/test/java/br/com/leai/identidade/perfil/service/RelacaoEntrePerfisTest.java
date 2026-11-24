package br.com.leai.identidade.perfil.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Decisão de RN-08 no {@code identidade} sem banco: {@link RelacaoEntrePerfis#conteudoRestrito}
 * é a função pura que o perfil e a busca usam para dizer aos clientes se o conteúdo social do
 * perfil está fechado. A integração (CT-PER-04 e CT-PER-05) prova o mesmo pelo HTTP.
 */
class RelacaoEntrePerfisTest {

  private static final String[] TODAS =
      {
        RelacaoEntrePerfis.PROPRIO,
        RelacaoEntrePerfis.NENHUMA,
        RelacaoEntrePerfis.SEGUINDO,
        RelacaoEntrePerfis.SOLICITACAO_ENVIADA,
        RelacaoEntrePerfis.SOLICITACAO_RECEBIDA
      };

  @Test
  @DisplayName("RN-08: perfil público nunca tem conteúdo restrito, qualquer que seja a relação")
  void publicoNuncaRestrito() {
    for (String relacao : TODAS) {
      assertThat(RelacaoEntrePerfis.conteudoRestrito(false, relacao)).as(relacao).isFalse();
    }
  }

  @ParameterizedTest(name = "{0}")
  @ValueSource(
      strings = {
        RelacaoEntrePerfis.NENHUMA,
        RelacaoEntrePerfis.SOLICITACAO_ENVIADA,
        RelacaoEntrePerfis.SOLICITACAO_RECEBIDA
      })
  @DisplayName("RN-08: perfil privado fica restrito para quem não segue, mesmo com pedido pendente")
  void privadoRestritoSemSeguimentoAceito(String relacao) {
    assertThat(RelacaoEntrePerfis.conteudoRestrito(true, relacao)).isTrue();
  }

  @ParameterizedTest(name = "{0}")
  @ValueSource(strings = {RelacaoEntrePerfis.PROPRIO, RelacaoEntrePerfis.SEGUINDO})
  @DisplayName("RN-08: perfil privado fica aberto para o dono e para seguidor aceito")
  void privadoAbertoParaDonoESeguidor(String relacao) {
    assertThat(RelacaoEntrePerfis.conteudoRestrito(true, relacao)).isFalse();
  }

  @Test
  @DisplayName("o próprio perfil é relação proprio sem consultar o banco")
  void proprioSemBanco() {
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    UUID eu = UUID.randomUUID();

    assertThat(new RelacaoEntrePerfis(jdbc).entre(eu, eu)).isEqualTo(RelacaoEntrePerfis.PROPRIO);
    verifyNoInteractions(jdbc);
  }
}
