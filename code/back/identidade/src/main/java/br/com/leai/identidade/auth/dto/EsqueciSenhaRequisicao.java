package br.com.leai.identidade.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo de {@code POST /auth/password/forgot} (RF-AUT-04). */
@Schema(name = "EsqueciSenhaRequisicao")
public record EsqueciSenhaRequisicao(
    @NotBlank(message = "Informe seu e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254)
        @Schema(example = "marina.beltrao@gmail.com")
        String email) {}
