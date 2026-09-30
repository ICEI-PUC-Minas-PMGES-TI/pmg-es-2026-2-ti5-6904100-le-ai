package br.com.leai.identidade.perfil.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Corpo de `PUT /me/perfil` (RF-SOC-01/04). É substituição: os quatro campos vão sempre, e
 * `avatar` nulo remove a foto.
 *
 * <p><b>Biografia com teto técnico de {@value #BIOGRAFIA_MAXIMA} caracteres.</b> Nenhuma fonte fixa o
 * limite (editar-perfil.md §7 registra a pendência), mas sem teto nenhum o servidor aceitaria
 * qualquer tamanho. O limite de produto, com contador na tela, continua a definir.
 */
@Schema(name = "EditarPerfilRequisicao")
public record EditarPerfilRequisicao(
    @NotBlank(message = "Informe seu nome de exibição.")
        @Size(max = 60, message = "Use no máximo 60 caracteres.")
        String displayName,
    @Size(max = EditarPerfilRequisicao.BIOGRAFIA_MAXIMA, message = "Use no máximo 1000 caracteres.")
        String biografia,
    @Valid Avatar avatar,
    @NotNull(message = "Escolha entre perfil público e privado.")
        @Pattern(regexp = "publico|privado", message = "Escolha entre perfil público e privado.")
        String privacidade) {

  public static final int BIOGRAFIA_MAXIMA = 1000;

  @Schema(name = "Avatar")
  public record Avatar(
      @NotBlank @Size(max = 2048) String url, @NotBlank @Size(max = 255) String publicId) {}
}
