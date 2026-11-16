package br.com.leai.social.push.dto;

import br.com.leai.social.push.model.DispositivoPush;
import br.com.leai.social.push.model.RegistroDeDispositivo;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "DispositivoPush")
public record DispositivoPushResposta(String id, String plataforma, boolean ativo) {

  public static DispositivoPushResposta de(RegistroDeDispositivo registro) {
    return new DispositivoPushResposta(
        registro.id().toString(), DispositivoPush.PLATAFORMA_ANDROID, registro.ativo());
  }
}
