package br.com.leai.identidade.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo de {@code POST /auth/refresh} e, na Etapa 4, de {@code POST /auth/logout}. */
@Schema(name = "RefreshRequisicao")
public record RefreshRequisicao(
    // O token emitido tem 43 caracteres; o teto só impede corpo absurdo de chegar ao hash.
    @NotBlank @Size(max = 512) @Schema(accessMode = Schema.AccessMode.WRITE_ONLY)
        String refreshToken) {}
