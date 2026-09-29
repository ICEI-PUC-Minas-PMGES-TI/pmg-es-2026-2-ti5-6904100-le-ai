package br.com.leai.identidade.auth.validacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.identidade.common.ErroDeNegocioException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PoliticaDeSenhaTest {

  private final PoliticaDeSenha politica = new PoliticaDeSenha();

  @Test
  @DisplayName("carrega a lista inteira e ignora cabeçalho e linhas vazias")
  void carregaLista() {
    // ~2.100 entradas: o bloco pt-BR mais o SecLists filtrado. Um número muito menor indica
    // arquivo truncado ou filtro errado no carregamento.
    assertThat(politica.tamanho()).isGreaterThan(2000);
  }

  @ParameterizedTest
  @ValueSource(strings = {"password", "PASSWORD", "Password", "12345678", "senha123", "Flamengo"})
  @DisplayName("recusa senha da lista sem diferenciar caixa (RNF-SEC-27)")
  void recusaSenhaComum(String senha) {
    assertThatThrownBy(() -> politica.recusarSeComum(senha))
        .isInstanceOf(ErroDeNegocioException.class)
        .hasMessage(PoliticaDeSenha.SENHA_COMUM)
        .hasMessageNotContaining(senha);
  }

  @ParameterizedTest
  @ValueSource(strings = {"leai2026 ", " leai2026", "\tLeai2026\n", "password  "})
  @DisplayName("recusa senha da lista com espaço nas pontas (teclado e autofill acrescentam)")
  void recusaSenhaComumComEspaco(String senha) {
    assertThatThrownBy(() -> politica.recusarSeComum(senha))
        .isInstanceOf(ErroDeNegocioException.class)
        .hasMessage(PoliticaDeSenha.SENHA_COMUM);
  }

  @ParameterizedTest
  @ValueSource(strings = {"senha-bem-comprida", "cavalo correto bateria", "Xk9#mQ2!vLp"})
  @DisplayName("aceita senha fora da lista")
  void aceitaSenhaIncomum(String senha) {
    assertThatCode(() -> politica.recusarSeComum(senha)).doesNotThrowAnyException();
  }
}
