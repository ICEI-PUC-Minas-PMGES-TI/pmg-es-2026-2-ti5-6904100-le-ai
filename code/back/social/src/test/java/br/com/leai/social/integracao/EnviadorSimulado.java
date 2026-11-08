package br.com.leai.social.integracao;

import br.com.leai.social.push.model.MensagemDePush;
import br.com.leai.social.push.service.EnviadorDePush;
import br.com.leai.social.push.service.PushIndisponivelException;
import br.com.leai.social.push.service.TokenDePushInvalidoException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public final class EnviadorSimulado implements EnviadorDePush {

  public enum Modo {
    ENVIA,
    TOKEN_INVALIDO,
    INDISPONIVEL
  }

  private final List<MensagemDePush> enviadas = new CopyOnWriteArrayList<>();
  private volatile Modo modo = Modo.ENVIA;

  public void reiniciar() {
    enviadas.clear();
    modo = Modo.ENVIA;
  }

  public void modo(Modo novo) {
    modo = novo;
  }

  public List<MensagemDePush> enviadas() {
    return List.copyOf(enviadas);
  }

  @Override
  public boolean ativo() {
    return true;
  }

  @Override
  public void enviar(MensagemDePush mensagem) {
    switch (modo) {
      case ENVIA -> enviadas.add(mensagem);
      case TOKEN_INVALIDO -> throw new TokenDePushInvalidoException(new RuntimeException("UNREGISTERED"));
      case INDISPONIVEL -> throw new PushIndisponivelException(new RuntimeException("UNAVAILABLE"));
    }
  }
}
