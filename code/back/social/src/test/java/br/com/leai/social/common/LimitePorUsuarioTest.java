package br.com.leai.social.common;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.RelogioDeTeste;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Limite por usuário autenticado (RNF-SEC-18), usado por curtir/comentar. */
class LimitePorUsuarioTest {

  private static final int LIMITE = 3;
  private static final String MENSAGEM = "Muitas curtidas em pouco tempo.";

  private RelogioDeTeste relogio;
  private LimitePorUsuario limite;

  @BeforeEach
  void montar() {
    relogio = new RelogioDeTeste();
    limite = new LimitePorUsuario(LIMITE, MENSAGEM, relogio);
  }

  @Test
  @DisplayName("dentro do limite não lança")
  void dentroDoLimiteNaoLanca() {
    UUID usuario = UUID.randomUUID();

    assertThatCode(
            () -> {
              for (int i = 0; i < LIMITE; i++) {
                limite.registrar(usuario);
              }
            })
        .doesNotThrowAnyException();
  }

  @Test
  @DisplayName("acima do limite lança 429 com a mensagem própria")
  void acimaDoLimiteLanca429() {
    UUID usuario = UUID.randomUUID();
    for (int i = 0; i < LIMITE; i++) {
      limite.registrar(usuario);
    }

    assertThatThrownBy(() -> limite.registrar(usuario))
        .isInstanceOf(ErroDeNegocioException.class)
        .hasMessage(MENSAGEM)
        .extracting(erro -> ((ErroDeNegocioException) erro).codigo())
        .isEqualTo(CodigoErro.MUITAS_REQUISICOES);
  }

  @Test
  @DisplayName("o limite é por usuário: um bloqueado não bloqueia o outro")
  void limiteEhPorUsuario() {
    UUID um = UUID.randomUUID();
    UUID outro = UUID.randomUUID();
    for (int i = 0; i < LIMITE; i++) {
      limite.registrar(um);
    }

    assertThatThrownBy(() -> limite.registrar(um)).isInstanceOf(ErroDeNegocioException.class);
    assertThatCode(() -> limite.registrar(outro)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("a janela expira e a contagem recomeça do zero")
  void janelaExpiraELibera() {
    UUID usuario = UUID.randomUUID();
    for (int i = 0; i < LIMITE; i++) {
      limite.registrar(usuario);
    }

    relogio.avancar(Duration.ofMinutes(1));

    assertThatCode(() -> limite.registrar(usuario)).doesNotThrowAnyException();
  }
}
