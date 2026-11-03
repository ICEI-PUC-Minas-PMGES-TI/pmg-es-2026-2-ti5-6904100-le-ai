package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(name = "EditarComentario")
public record EditarComentarioRequisicao(
    @NotBlank(message = "Informe o texto do comentário.")
        @Size(min = 1, max = CriarComentarioRequisicao.TEXTO_MAXIMO, message = "Use entre 1 e 2000 caracteres.")
        String texto) {}
