package br.com.leai.identidade.conta.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Corpo de {@code DELETE /me/conta} (RN-23.1): senha atual e confirmação explícita. A senha nunca
 * vai para log nem para o recibo (o hash da idempotência é HMAC).
 */
@Schema(name = "SolicitarExclusaoRequisicao")
public record SolicitarExclusaoRequisicao(
    @NotBlank(message = "Informe sua senha atual.")
        @Size(max = 128, message = "A senha tem no máximo 128 caracteres.")
        String senha,
    @NotNull(message = "Confirme que entendeu que a exclusão é definitiva depois do prazo.")
        @AssertTrue(
            message = "Confirme que entendeu que a exclusão é definitiva depois do prazo.")
        Boolean confirmacao) {}
