package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Schema {@code CriarComentario} de {@code docs/api/social.yaml}: corpo de {@code POST
 * /atividades/{id}/comentarios}. {@code comentarioRespondidoId} omitido cria um comentário-raiz;
 * presente, pode apontar para raiz ou resposta — o servidor deriva a raiz e o usuário respondido.
 */
@Schema(name = "CriarComentario")
public record CriarComentarioRequisicao(
    @NotBlank(message = "Informe o texto do comentário.")
        @Size(min = 1, max = CriarComentarioRequisicao.TEXTO_MAXIMO, message = "Use entre 1 e 2000 caracteres.")
        String texto,
    UUID comentarioRespondidoId) {

  public static final int TEXTO_MAXIMO = 2000;
}
