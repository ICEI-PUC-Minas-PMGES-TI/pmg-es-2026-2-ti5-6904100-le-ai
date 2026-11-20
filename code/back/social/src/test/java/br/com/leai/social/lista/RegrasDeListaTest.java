package br.com.leai.social.lista;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.lista.model.LivroDeReferencia;
import br.com.leai.social.lista.model.PerfilDoDono;
import br.com.leai.social.lista.repository.CursorItemDeLista;
import br.com.leai.social.lista.service.ServicoDeListas;
import br.com.leai.social.lista.service.ServicoDeListas.AcessoAsListas;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BooleanSupplier;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Regras de F-LST que não dependem de banco: RN-15.1, RN-08 e o cursor opaco dos itens. */
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

  // ------------------------------------------------------------ RN-08 (L-01)

  /** O seguimento não pode nem ser consultado: a decisão já está tomada sem ele. */
  private static final BooleanSupplier NAO_CONSULTAR =
      () -> {
        throw new AssertionError("o seguimento não devia ser consultado");
      };

  private static final BooleanSupplier SEGUE = () -> true;
  private static final BooleanSupplier NAO_SEGUE = () -> false;

  @Test
  @DisplayName("RN-08: perfil público libera as listas para qualquer leitor, sem consultar o seguimento")
  void rn08PerfilPublico() {
    assertThat(ServicoDeListas.decidirAcesso(OUTRO, DONO, perfil("publico"), NAO_CONSULTAR))
        .isEqualTo(AcessoAsListas.LIBERADO);
  }

  @Test
  @DisplayName("RN-08: perfil privado libera só com seguimento aceito; sem ele, 403 de perfil privado")
  void rn08PerfilPrivado() {
    assertThat(ServicoDeListas.decidirAcesso(OUTRO, DONO, perfil("privado"), SEGUE))
        .isEqualTo(AcessoAsListas.LIBERADO);
    assertThat(ServicoDeListas.decidirAcesso(OUTRO, DONO, perfil("privado"), NAO_SEGUE))
        .isEqualTo(AcessoAsListas.PERFIL_PRIVADO);
  }

  @Test
  @DisplayName("RN-08: o dono vê as próprias listas com perfil privado, sem consultar o seguimento")
  void rn08ODonoSempreVe() {
    assertThat(ServicoDeListas.decidirAcesso(DONO, DONO, perfil("privado"), NAO_CONSULTAR))
        .isEqualTo(AcessoAsListas.LIBERADO);
  }

  @Test
  @DisplayName("RN-08: dono fora da VIEW de perfil é 404 para todos, inclusive para ele e para quem segue")
  void rn08DonoForaDaView() {
    for (UUID quem : new UUID[] {DONO, OUTRO}) {
      assertThat(ServicoDeListas.decidirAcesso(quem, DONO, Optional.empty(), NAO_CONSULTAR))
          .isEqualTo(AcessoAsListas.NAO_ENCONTRADO);
    }
  }

  private static Optional<PerfilDoDono> perfil(String privacidade) {
    return Optional.of(new PerfilDoDono(DONO, "dona", "Dona", null, privacidade));
  }

  private static LivroDeReferencia livro(String tipo, UUID donoId, boolean ativo) {
    return new LivroDeReferencia(UUID.randomUUID(), tipo, donoId, "Título", null, null, ativo);
  }
}
