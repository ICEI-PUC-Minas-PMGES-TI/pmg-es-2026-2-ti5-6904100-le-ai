package br.com.leai.social.push.dto;

import br.com.leai.social.push.model.DispositivoPush;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(name = "RegistrarDispositivoPush")
@JsonIgnoreProperties(ignoreUnknown = false)
public record RegistrarDispositivoPushRequisicao(
    @NotBlank(message = "Informe o token do dispositivo.")
        @Size(max = RegistrarDispositivoPushRequisicao.TOKEN_MAXIMO, message = "O token é longo demais.")
        String token,
    @NotBlank(message = "Informe a plataforma do dispositivo.")
        @Pattern(
            regexp = DispositivoPush.PLATAFORMA_ANDROID,
            message = "Só dispositivos android recebem push.")
        String plataforma) {

  public static final int TOKEN_MAXIMO = 4096;
}
