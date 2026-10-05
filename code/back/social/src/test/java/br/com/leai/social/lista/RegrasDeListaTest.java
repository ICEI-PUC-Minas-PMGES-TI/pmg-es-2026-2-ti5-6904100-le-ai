package br.com.leai.social.lista;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.lista.model.LivroDeReferencia;
import br.com.leai.social.lista.repository.CursorItemDeLista;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Regras de F-LST que não dependem de banco: RN-15.1 e o cursor opaco dos itens. */
class RegrasDeListaTest {

  private static final UUID DONO = UUID.randomUUID();
  private static final UUID OUTRO = UUID.randomUUID();

  @Test
  @DisplayName("RN-15.1: livro oficial ativo entra na lista de qualquer leitor")
  void oficialAtivo() {
    assertThat(livro("oficial", null, true).podeEntrarNaListaDe(DONO)).isTrue();
  }

  @Test
  @DisplayName("RN-15.1: livro pessoal só entra na lista do próprio dono")
  void pessoalSoDoDono() {
    LivroDeReferencia pessoal = livro("pessoal", DONO, true);

    assertThat(pessoal.podeEntrarNaListaDe(DONO)).isTrue();
    assertThat(pessoal.podeEntrarNaListaDe(OUTRO)).isFalse();
  }

  @Test
  @DisplayName("livro inativo não entra, nem oficial nem pessoal do dono")
  void inativo() {
    assertThat(livro("oficial", null, false).podeEntrarNaListaDe(DONO)).isFalse();
    assertThat(livro("pessoal", DONO, false).podeEntrarNaListaDe(DONO)).isFalse();
  }

  @Test
  @DisplayName("tipo desconhecido é recusado")
  void tipoDesconhecido() {
    assertThat(livro("outro", DONO, true).podeEntrarNaListaDe(DONO)).isFalse();
  }

  @Test
  @DisplayName("cursor codificado volta ao mesmo par (ordem, id)")
  void cursorIdaEVolta() {
    CursorItemDeLista cursor = new CursorItemDeLista(7, UUID.randomUUID());

    assertThat(CursorItemDeLista.decodificar(cursor.codificar())).isEqualTo(cursor);
  }

  @Test
  @DisplayName("cursor adulterado é recusado")
  void cursorAdulterado() {
    assertThatThrownBy(() -> CursorItemDeLista.decodificar("lixo"))
        .isInstanceOf(IllegalArgumentException.class);
    assertThatThrownBy(() -> CursorItemDeLista.decodificar("NXxuYW8tdXVpZA"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  private static LivroDeReferencia livro(String tipo, UUID donoId, boolean ativo) {
    return new LivroDeReferencia(UUID.randomUUID(), tipo, donoId, "Título", null, null, ativo);
  }
}
