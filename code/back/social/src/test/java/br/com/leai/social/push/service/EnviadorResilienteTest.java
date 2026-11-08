package br.com.leai.social.push.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.leai.social.notificacao.model.TipoNotificacao;
import br.com.leai.social.push.model.MensagemDePush;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EnviadorResilienteTest {

  private static final Duration SEM_ESPERA = Duration.ofMillis(1);
  private static final Duration CIRCUITO_ABERTO_POR_MUITO_TEMPO = Duration.ofMinutes(5);

  private static final MensagemDePush MENSAGEM =
      new MensagemDePush("token", "Lê Ai", "corpo", UUID.randomUUID(), TipoNotificacao.NOVO_SEGUIDOR);

  private static final class Delegado implements EnviadorDePush {
    final AtomicInteger chamadas = new AtomicInteger();
    volatile int falhasAntesDeFuncionar;
    volatile RuntimeException erro = new PushIndisponivelException(new RuntimeException("fora"));

    @Override
    public boolean ativo() {
      return true;
    }

    @Override
    public void enviar(MensagemDePush mensagem) {
      if (chamadas.incrementAndGet() <= falhasAntesDeFuncionar) {
        throw erro;
      }
    }
  }

  private static EnviadorResiliente com(Delegado delegado) {
    return new EnviadorResiliente(delegado, SEM_ESPERA, CIRCUITO_ABERTO_POR_MUITO_TEMPO);
  }

  @Test
  @DisplayName("falha transitoria do FCM e repetida e o envio acaba entregue")
  void repeteEmFalhaTransitoria() {
    Delegado delegado = new Delegado();
    delegado.falhasAntesDeFuncionar = 1;

    com(delegado).enviar(MENSAGEM);

    assertThat(delegado.chamadas).hasValue(2);
  }

  @Test
  @DisplayName("FCM fora do ar esgota as tentativas e sinaliza indisponibilidade")
  void esgotaAsTentativas() {
    Delegado delegado = new Delegado();
    delegado.falhasAntesDeFuncionar = Integer.MAX_VALUE;

    assertThatThrownBy(() -> com(delegado).enviar(MENSAGEM))
        .isInstanceOf(PushIndisponivelException.class);

    assertThat(delegado.chamadas).hasValue(EnviadorResiliente.TENTATIVAS);
  }

  @Test
  @DisplayName("token invalido nao e repetido nem abre o circuito")
  void tokenInvalidoNaoRepete() {
    Delegado delegado = new Delegado();
    delegado.falhasAntesDeFuncionar = Integer.MAX_VALUE;
    delegado.erro = new TokenDePushInvalidoException(new RuntimeException("UNREGISTERED"));
    EnviadorResiliente enviador = com(delegado);

    for (int i = 0; i < EnviadorResiliente.JANELA_DO_CIRCUITO; i++) {
      assertThatThrownBy(() -> enviador.enviar(MENSAGEM))
          .isInstanceOf(TokenDePushInvalidoException.class);
    }

    assertThat(delegado.chamadas).hasValue(EnviadorResiliente.JANELA_DO_CIRCUITO);
    delegado.falhasAntesDeFuncionar = 0;
    enviador.enviar(MENSAGEM);
  }

  @Test
  @DisplayName("circuito aberto recusa sem chamar o FCM")
  void circuitoAbertoNaoChamaOFcm() {
    Delegado delegado = new Delegado();
    delegado.falhasAntesDeFuncionar = Integer.MAX_VALUE;
    EnviadorResiliente enviador = com(delegado);
    for (int i = 0; i < 2; i++) {
      assertThatThrownBy(() -> enviador.enviar(MENSAGEM))
          .isInstanceOf(PushIndisponivelException.class);
    }
    int chamadasAteAbrir = delegado.chamadas.get();

    assertThatThrownBy(() -> enviador.enviar(MENSAGEM))
        .isInstanceOf(PushIndisponivelException.class);

    assertThat(delegado.chamadas).hasValue(chamadasAteAbrir);
  }
}
