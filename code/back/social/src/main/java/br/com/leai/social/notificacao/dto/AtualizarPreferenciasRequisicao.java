package br.com.leai.social.notificacao.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

@Schema(name = "AtualizarPreferenciasDeNotificacao")
@JsonIgnoreProperties(ignoreUnknown = false)
public record AtualizarPreferenciasRequisicao(
    @NotEmpty(message = "Informe ao menos uma preferência.")
        @Size(max = AtualizarPreferenciasRequisicao.MAXIMO_DE_TIPOS, message = "Preferências demais.")
        List<@NotNull(message = "Preferência inválida.") @Valid Item> preferencias) {

  public static final int MAXIMO_DE_TIPOS = 12;

  @Schema(name = "PreferenciaDeNotificacaoEntrada")
  public record Item(
      @NotNull(message = "Informe o tipo da preferência.") String tipo,
      @NotNull(message = "Informe se o tipo está habilitado.") Boolean habilitada) {}
}
