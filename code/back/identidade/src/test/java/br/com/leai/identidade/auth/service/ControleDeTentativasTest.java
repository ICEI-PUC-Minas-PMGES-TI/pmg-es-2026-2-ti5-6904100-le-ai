package br.com.leai.identidade.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.identidade.RelogioDeTeste;
import br.com.leai.identidade.common.CodigoErro;
import br.com.leai.identidade.common.ErroDeNegocioException;
import br.com.leai.identidade.common.RateLimitFilter;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Bloqueio temporário progressivo por identidade (RNF-SEC-17 e RNF-SEC-29). */
class ControleDeTentativasTest {

  private static final String IDENTIDADE = "marinableu";

  private RelogioDeTeste relogio;
  private ControleDeTentativas controle;

  @BeforeEach
  void montar() {
    relogio = new RelogioDeTeste();
    controle = new ControleDeTentativas(relogio);
  }

  private void falhar(String identificador, int vezes) {
    for (int i = 0; i < vezes; i++) {
      controle.registrarFalha(identificador);
    }
  }

  @Test
  @DisplayName("erros abaixo do limiar não bloqueiam: quem digitou errado tenta de novo")
  void abaixoDoLimiarNaoBloqueia() {
    falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO - 1);

    assertThatCode(() -> controle.verificar(IDENTIDADE)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("a enésima falha bloqueia a identidade com 429 e a mensagem da tela")
  void enesimaFalhaBloqueia() {
    falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO);

    assertThatThrownBy(() -> controle.verificar(IDENTIDADE))
        .isInstanceOf(ErroDeNegocioException.class)
        .hasMessage(RateLimitFilter.MUITAS_TENTATIVAS)
        .extracting(erro -> ((ErroDeNegocioException) erro).codigo())
        .isEqualTo(CodigoErro.MUITAS_REQUISICOES);
  }

  @Test
  @DisplayName("passada a duração do bloqueio, a identidade é liberada sozinha")
  void bloqueioExpiraSozinho() {
    falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO);

    relogio.avancar(ControleDeTentativas.DURACOES[0]);

    assertThatCode(() -> controle.verificar(IDENTIDADE)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("o segundo bloqueio da mesma identidade dura mais que o primeiro (progressivo)")
  void bloqueioSeguinteDuraMais() {
    falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO);
    relogio.avancar(ControleDeTentativas.DURACOES[0]);
    falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO);

    // Um segundo bloqueio de primeiro degrau já teria acabado aqui.
    relogio.avancar(ControleDeTentativas.DURACOES[0]);
    assertThatThrownBy(() -> controle.verificar(IDENTIDADE))
        .isInstanceOf(ErroDeNegocioException.class);

    relogio.avancar(ControleDeTentativas.DURACOES[1]);
    assertThatCode(() -> controle.verificar(IDENTIDADE)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("sem evento novo a contagem é esquecida, e falhas distantes não se somam")
  void contagemEsquecidaDepoisDaMemoria() {
    falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO - 1);

    relogio.avancar(ControleDeTentativas.MEMORIA);
    falhar(IDENTIDADE, 1);

    assertThatCode(() -> controle.verificar(IDENTIDADE)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("login bem-sucedido zera a contagem da identidade")
  void sucessoZeraContagem() {
    falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO - 1);
    controle.registrarSucesso(IDENTIDADE);
    falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO - 1);

    assertThatCode(() -> controle.verificar(IDENTIDADE)).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("o contador é por identidade, não global: bloquear uma não afeta a outra")
  void contadorEhPorIdentidade() {
    falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO);

    assertThatThrownBy(() -> controle.verificar(IDENTIDADE))
        .isInstanceOf(ErroDeNegocioException.class);
    assertThatCode(() -> controle.verificar("joaquim")).doesNotThrowAnyException();
  }

  @Test
  @DisplayName("alternar a caixa ou pôr espaço no identificador não contorna o bloqueio")
  void caixaEEspacoNaoContornam() {
    controle.registrarFalha("MarinaBleu");
    controle.registrarFalha("  marinableu  ");
    controle.registrarFalha("MARINABLEU");
    controle.registrarFalha("marinableu");
    controle.registrarFalha("mArInAbLeU");

    assertThatThrownBy(() -> controle.verificar(" MaRiNaBlEu "))
        .isInstanceOf(ErroDeNegocioException.class);
  }

  @Test
  @DisplayName("identificador sem cadastro é bloqueado igual, sem virar oráculo de quem existe")
  void identidadeInexistenteBloqueiaIgual() {
    falhar("conta-que-nao-existe", ControleDeTentativas.FALHAS_ATE_BLOQUEIO);

    assertThatThrownBy(() -> controle.verificar("conta-que-nao-existe"))
        .isInstanceOf(ErroDeNegocioException.class)
        .hasMessage(RateLimitFilter.MUITAS_TENTATIVAS);
  }

  @Test
  @DisplayName("a progressão tem teto: o último degrau se repete em vez de crescer sem fim")
  void progressaoTemTeto() {
    Duration ultimo = ControleDeTentativas.DURACOES[ControleDeTentativas.DURACOES.length - 1];

    for (int bloqueio = 0; bloqueio < ControleDeTentativas.DURACOES.length + 2; bloqueio++) {
      falhar(IDENTIDADE, ControleDeTentativas.FALHAS_ATE_BLOQUEIO);
      relogio.avancar(ultimo);
    }

    assertThat(ultimo).isEqualTo(Duration.ofMinutes(30));
    assertThatCode(() -> controle.verificar(IDENTIDADE)).doesNotThrowAnyException();
  }
}
