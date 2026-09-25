package br.com.leai.social.feed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Cobre o cursor opaco de respostas sem precisar de banco: só codificação/decodificação. */
class CursorComentarioTest {

  @Test
  void codificaEDecodificaOMesmoParDeVolta() {
    Instant criadoEm = Instant.parse("2026-01-15T10:30:00.123456Z");
    UUID id = UUID.randomUUID();
    CursorComentario original = new CursorComentario(criadoEm, id);

    String cursor = original.codificar();
    CursorComentario decodificado = CursorComentario.decodificar(cursor);

    assertThat(decodificado).isEqualTo(original);
    assertThat(decodificado.criadoEm()).isEqualTo(criadoEm);
    assertThat(decodificado.id()).isEqualTo(id);
  }

  @Test
  void cursorEhOpaco_naoExpoeOTextoCruDoParEmBase64Simples() {
    CursorComentario cursor = new CursorComentario(Instant.now(), UUID.randomUUID());

    String codificado = cursor.codificar();

    // Não é o par em texto puro: precisa passar por decodificar() para servir de algo.
    assertThat(codificado).doesNotContain("|").doesNotContain(cursor.id().toString());
  }

  @Test
  void doisComentariosConsecutivosGeramCursoresDiferentes() {
    Instant t1 = Instant.parse("2026-01-15T10:00:00Z");
    Instant t2 = Instant.parse("2026-01-15T10:00:01Z");
    UUID id1 = UUID.randomUUID();
    UUID id2 = UUID.randomUUID();

    String cursor1 = new CursorComentario(t1, id1).codificar();
    String cursor2 = new CursorComentario(t2, id2).codificar();

    assertThat(cursor1).isNotEqualTo(cursor2);
  }

  @Test
  void decodificarCursorInvalidoLancaExcecaoDedicada() {
    assertThatThrownBy(() -> CursorComentario.decodificar("nao-e-base64-!!!"))
        .isInstanceOf(CursorInvalidoException.class);
  }

  @Test
  void decodificarCursorSemSeparadorLancaExcecaoDedicada() {
    String semSeparador =
        java.util.Base64.getUrlEncoder().withoutPadding()
            .encodeToString("2026-01-15T10:00:00Z_sem_separador".getBytes());

    assertThatThrownBy(() -> CursorComentario.decodificar(semSeparador))
        .isInstanceOf(CursorInvalidoException.class);
  }

  @Test
  void decodificarCursorComUuidInvalidoLancaExcecaoDedicada() {
    String cursorRuim =
        java.util.Base64.getUrlEncoder().withoutPadding()
            .encodeToString("2026-01-15T10:00:00Z|nao-e-uuid".getBytes());

    assertThatThrownBy(() -> CursorComentario.decodificar(cursorRuim))
        .isInstanceOf(CursorInvalidoException.class);
  }
}
