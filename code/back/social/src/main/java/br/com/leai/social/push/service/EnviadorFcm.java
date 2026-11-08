package br.com.leai.social.push.service;

import br.com.leai.social.push.model.MensagemDePush;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import java.util.EnumSet;
import java.util.Set;

public class EnviadorFcm implements EnviadorDePush {

  private static final Set<MessagingErrorCode> TOKEN_INVALIDO =
      EnumSet.of(
          MessagingErrorCode.UNREGISTERED,
          MessagingErrorCode.INVALID_ARGUMENT,
          MessagingErrorCode.SENDER_ID_MISMATCH);

  private final FirebaseMessaging fcm;

  public EnviadorFcm(FirebaseMessaging fcm) {
    this.fcm = fcm;
  }

  @Override
  public boolean ativo() {
    return true;
  }

  @Override
  public void enviar(MensagemDePush mensagem) {
    Message fcmMessage =
        Message.builder()
            .setToken(mensagem.token())
            .setNotification(
                Notification.builder()
                    .setTitle(mensagem.titulo())
                    .setBody(mensagem.corpo())
                    .build())
            .setAndroidConfig(
                AndroidConfig.builder().setPriority(AndroidConfig.Priority.HIGH).build())
            .putAllData(mensagem.dados())
            .build();
    try {
      fcm.send(fcmMessage);
    } catch (FirebaseMessagingException erro) {
      if (TOKEN_INVALIDO.contains(erro.getMessagingErrorCode())) {
        throw new TokenDePushInvalidoException(erro);
      }
      throw new PushIndisponivelException(erro);
    }
  }
}
