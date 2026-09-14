package br.com.leai.identidade.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Corpo do cadastro (RF-AUT-01). Toda validação aqui é do servidor; a do cliente reforça, não
 * substitui (RNF-SEC-13).
 *
 * <p>O limite de 72 caracteres na senha não é estético: o bcrypt ignora o que passa disso, e
 * aceitar em silêncio uma senha mais longa daria ao leitor uma falsa sensação de força.
 */
public record CadastroRequisicao(
    @NotBlank(message = "Informe seu e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254)
        @Schema(example = "marina.beltrao@gmail.com")
        String email,
    @NotBlank(message = "Escolha um nome de usuário.")
        @Pattern(
            regexp = "^[A-Za-z0-9._]{3,30}$",
            message = "Use de 3 a 30 caracteres, sem espaço: letras, números, ponto ou traço baixo.")
        @Schema(example = "marinableu")
        String username,
    @NotBlank(message = "Informe seu nome de exibição.")
        @Size(max = 60, message = "Use no máximo 60 caracteres.")
        @Schema(example = "Marina Beltrão")
        String displayName,
    @NotNull(message = "Informe sua data de nascimento.")
        @MaiorDeIdade
        @Schema(example = "1999-03-14", format = "date")
        LocalDate dataNascimento,
    @NotBlank(message = "Escolha uma senha.")
        @Size(min = 8, max = 72, message = "Use pelo menos 8 caracteres.")
        @Schema(minLength = 8, format = "password")
        String senha) {}
