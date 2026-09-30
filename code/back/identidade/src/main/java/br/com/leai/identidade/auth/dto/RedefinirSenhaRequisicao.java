package br.com.leai.identidade.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo de {@code POST /auth/password/reset} (RF-AUT-04). */
@Schema(name = "RedefinirSenhaRequisicao")
public record RedefinirSenhaRequisicao(
    // O token emitido tem 43 caracteres; o teto só impede corpo absurdo de chegar ao hash.
    @NotBlank @Size(max = 512) @Schema(accessMode = Schema.AccessMode.WRITE_ONLY) String token,
    @NotBlank(message = "Escolha uma senha com pelo menos 8 caracteres.")
        @Size(min = 8, max = 72, message = "Escolha uma senha com pelo menos 8 caracteres.")
        @Schema(minLength = 8, format = "password", accessMode = Schema.AccessMode.WRITE_ONLY)
        String novaSenha) {}
