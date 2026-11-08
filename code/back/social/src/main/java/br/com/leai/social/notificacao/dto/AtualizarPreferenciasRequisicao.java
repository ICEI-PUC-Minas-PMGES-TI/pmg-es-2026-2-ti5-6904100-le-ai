package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

@Schema(name = "AtualizarPreferenciasDeNotificacao")
public record AtualizarPreferenciasRequisicao(
    @NotEmpty(message = "Informe ao menos uma preferência.")
        List<@NotNull(message = "Preferência inválida.") @Valid Item> preferencias) {

  @Schema(name = "PreferenciaDeNotificacaoEntrada")
  public record Item(
      @NotNull(message = "Informe o tipo da preferência.") String tipo,
      @NotNull(message = "Informe se o tipo está habilitado.") Boolean habilitada) {}
}
