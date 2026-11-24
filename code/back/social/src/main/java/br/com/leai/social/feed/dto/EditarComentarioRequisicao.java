package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(name = "EditarComentario")
public record EditarComentarioRequisicao(
    @NotBlank(message = "Informe o texto do comentário.")
        @Size(min = 1, max = CriarComentarioRequisicao.TEXTO_MAXIMO, message = "Use entre 1 e 2000 caracteres.")
        String texto,
    // A `versao` do comentário que o editor carregou (F-MOD-OPC); obrigatória quando ele tem
    // menção gravada.
    @Size(max = 64, message = "Versão inválida.") String versao) {}
