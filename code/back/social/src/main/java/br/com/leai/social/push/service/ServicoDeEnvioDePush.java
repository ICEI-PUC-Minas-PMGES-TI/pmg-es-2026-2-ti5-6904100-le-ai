package br.com.leai.social.push.service;

import br.com.leai.social.notificacao.dto.NotificacaoResposta;
import br.com.leai.social.notificacao.model.NotificacaoGravada;
import br.com.leai.social.notificacao.service.ServicoDeNotificacao;
import br.com.leai.social.push.model.DispositivoPush;
import br.com.leai.social.push.model.MensagemDePush;
import br.com.leai.social.push.repository.DispositivoPushRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ServicoDeEnvioDePush {

  static final String TITULO = "Lê Ai";
  static final int CORPO_MAXIMO = 140;
  private static final String RETICENCIAS = "…";

  private static final Logger log = LoggerFactory.getLogger(ServicoDeEnvioDePush.class);

  private final DispositivoPushRepository dispositivos;
  private final ServicoDeNotificacao notificacoes;
  private final EnviadorDePush enviador;

  public ServicoDeEnvioDePush(
      DispositivoPushRepository dispositivos,
      ServicoDeNotificacao notificacoes,
      EnviadorDePush enviador) {
    this.dispositivos = dispositivos;
    this.notificacoes = notificacoes;
    this.enviador = enviador;
  }

  public void enviar(NotificacaoGravada gravada) {
    List<DispositivoPush> ativos = dispositivos.ativosDe(gravada.destinatarioId());
    if (ativos.isEmpty()) {
      return;
    }
    notificacoes
        .buscar(gravada.destinatarioId(), gravada.id())
        .ifPresent(notificacao -> ativos.forEach(d -> enviarAo(d, gravada, notificacao)));
  }

  private void enviarAo(
      DispositivoPush dispositivo, NotificacaoGravada gravada, NotificacaoResposta notificacao) {
    if (!dispositivos.reservarEnvio(gravada.id(), dispositivo.id())) {
      return;
    }
    MensagemDePush mensagem =
        new MensagemDePush(
            dispositivo.token(),
            TITULO,
            abreviar(notificacao.mensagem()),
            gravada.id(),
            notificacao.tipo());
    try {
      enviador.enviar(mensagem);
    } catch (TokenDePushInvalidoException invalido) {
      dispositivos.inativar(dispositivo.id());
      log.atInfo()
          .addKeyValue("notificacaoId", gravada.id())
          .addKeyValue("dispositivoId", dispositivo.id())
          .log("Push: token recusado pelo FCM, dispositivo inativado");
    } catch (PushIndisponivelException indisponivel) {
      dispositivos.liberarEnvio(gravada.id(), dispositivo.id());
      log.atWarn()
          .addKeyValue("notificacaoId", gravada.id())
          .addKeyValue("dispositivoId", dispositivo.id())
          .setCause(indisponivel)
          .log("Push: FCM indisponível, a notificação segue só no aplicativo");
    }
  }

  private static String abreviar(String texto) {
    if (texto.codePointCount(0, texto.length()) <= CORPO_MAXIMO) {
      return texto;
    }
    return texto.substring(0, texto.offsetByCodePoints(0, CORPO_MAXIMO - 1)) + RETICENCIAS;
  }
}
