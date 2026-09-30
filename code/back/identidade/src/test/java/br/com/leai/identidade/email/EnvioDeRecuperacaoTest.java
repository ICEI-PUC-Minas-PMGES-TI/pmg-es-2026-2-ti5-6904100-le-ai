package br.com.leai.identidade.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import br.com.leai.identidade.RelogioDeTeste;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

/**
 * Retentativa e disjuntor do envio. A fila real é trocada por execução imediata, que anota as
 * esperas pedidas: o teste confere o intervalo sem dormir.
 */
class EnvioDeRecuperacaoTest {

  private EmailNotificationService email;
  private RelogioDeTeste relogio;
  private List<Duration> esperasPedidas;
  private EnvioDeRecuperacao envio;

  @BeforeEach
  void montar() {
    email = Mockito.mock(EmailNotificationService.class);
    relogio = new RelogioDeTeste();
    esperasPedidas = new ArrayList<>();
    EnvioDeRecuperacao.Agendador imediato =
        (tarefa, espera) -> {
          esperasPedidas.add(espera);
          tarefa.run();
        };
    envio = new EnvioDeRecuperacao(email, imediato, relogio, EnvioDeRecuperacao.ESPERAS);
  }

  private void provedorResponde(ResultadoDeEnvio primeiro, ResultadoDeEnvio... seguintes) {
    given(email.enviarRecuperacaoSenha(anyString(), anyString(), anyString()))
        .willReturn(primeiro, seguintes);
  }

  private void enviar() {
    envio.enviar("leitor@exemplo.com", "Leitor", "https://leai.example/redefinir-senha#token=x");
  }

  @Test
  @DisplayName("falha temporária tenta de novo com 2 s e 8 s de espera, e para no sucesso")
  void retentaComBackoff() {
    provedorResponde(
        ResultadoDeEnvio.FALHA_TEMPORARIA,
        ResultadoDeEnvio.FALHA_TEMPORARIA,
        ResultadoDeEnvio.ACEITO);

    enviar();

    verify(email, times(3)).enviarRecuperacaoSenha(anyString(), anyString(), anyString());
    assertThat(esperasPedidas).containsExactly(Duration.ofSeconds(2), Duration.ofSeconds(8));
  }

  @Test
  @DisplayName("desiste depois de três tentativas")
  void desisteNaTerceira() {
    provedorResponde(ResultadoDeEnvio.FALHA_TEMPORARIA);

    enviar();

    verify(email, times(3)).enviarRecuperacaoSenha(anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("falha definitiva e envio ignorado não se repetem")
  void naoRepeteOQueNaoAdianta() {
    provedorResponde(ResultadoDeEnvio.FALHA_DEFINITIVA, ResultadoDeEnvio.IGNORADO);

    enviar();
    enviar();

    verify(email, times(2)).enviarRecuperacaoSenha(anyString(), anyString(), anyString());
    assertThat(esperasPedidas).isEmpty();
  }

  @Test
  @DisplayName("cinco falhas seguidas abrem o circuito por um minuto, e ele fecha depois")
  void disjuntor() {
    provedorResponde(ResultadoDeEnvio.FALHA_TEMPORARIA);

    enviar(); // 3 falhas
    enviar(); // mais 2 abrem o circuito; a terceira tentativa deste envio é descartada
    verify(email, times(5)).enviarRecuperacaoSenha(anyString(), anyString(), anyString());

    enviar();
    verify(email, times(5)).enviarRecuperacaoSenha(anyString(), anyString(), anyString());

    relogio.avancar(EnvioDeRecuperacao.CIRCUITO_ABERTO.plusSeconds(1));
    provedorResponde(ResultadoDeEnvio.ACEITO);
    enviar();
    verify(email, times(6)).enviarRecuperacaoSenha(anyString(), anyString(), anyString());
  }

  @Test
  @DisplayName("erro dentro da tarefa em segundo plano não escapa para a fila")
  void erroNaTarefaNaoEscapa() {
    envio.emSegundoPlano(
        () -> {
          throw new IllegalStateException("falha simulada");
        });

    assertThat(esperasPedidas).containsExactly(Duration.ZERO);
  }
}
