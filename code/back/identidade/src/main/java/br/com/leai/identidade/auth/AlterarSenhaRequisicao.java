package br.com.leai.identidade.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpo de {@code POST /auth/password/change} (RF-AUT-05). Mesmo teto de 72 caracteres do
 * cadastro, pelo mesmo motivo: o bcrypt ignora o que passa disso.
 */
@Schema(name = "AlterarSenhaRequisicao")
public record AlterarSenhaRequisicao(
    // Sem mínimo além de não vazia: a senha atual pode ser de antes da política de 8 caracteres,
    // e recusá-la aqui impediria justamente essa conta de trocar para uma senha melhor.
    @NotBlank(message = "Informe sua senha atual.")
        @Size(max = 72)
        @Schema(format = "password", accessMode = Schema.AccessMode.WRITE_ONLY)
        String senhaAtual,
    @NotBlank(message = "Escolha uma senha com pelo menos 8 caracteres.")
        @Size(min = 8, max = 72, message = "Escolha uma senha com pelo menos 8 caracteres.")
        @Schema(minLength = 8, format = "password", accessMode = Schema.AccessMode.WRITE_ONLY)
        String novaSenha) {}
