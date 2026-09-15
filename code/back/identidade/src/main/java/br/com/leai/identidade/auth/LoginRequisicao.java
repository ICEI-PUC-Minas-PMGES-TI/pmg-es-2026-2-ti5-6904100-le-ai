package br.com.leai.identidade.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * Corpo do login (RF-AUT-02). Um campo só para o identificador, porque a tela tem um campo só:
 * o leitor entra com e-mail ou nome de usuario, e o servidor resolve qual dos dois e.
 */
public record LoginRequisicao(
    @NotBlank(message = "Informe seu e-mail ou nome de usuário.")
        @Schema(example = "marinableu", description = "E-mail ou nome de usuário")
        String identificador,
    @NotBlank(message = "Informe sua senha.") @Schema(format = "password") String senha) {}
