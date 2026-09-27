package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/**
 * Schema {@code MarcarLidas}. A regra condicional (SELECIONADAS exige {@code ids}, TODAS não os
 * aceita) e a unicidade dos itens são validadas no serviço.
 */
@Schema(name = "MarcarLidas")
public record MarcarLidasRequisicao(
    @NotNull(message = "Informe o modo: SELECIONADAS ou TODAS.") ModoMarcarLidas modo,
    @Size(min = 1, max = 100, message = "Envie de 1 a 100 notificações.") List<UUID> ids) {

  public enum ModoMarcarLidas {
    SELECIONADAS,
    TODAS
  }
}
