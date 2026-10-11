package br.com.leai.social.lista.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Schema {@code CriarLista} de {@code docs/api/social.yaml}. Com {@code livroId}, a lista nasce
 * com esse livro na posição 1, na mesma transação.
 */
@Schema(name = "CriarLista")
public record CriarListaRequisicao(
    @NotBlank(message = "Informe o título da lista.")
        @Size(max = CriarListaRequisicao.TITULO_MAXIMO, message = "Use até 80 caracteres no título.")
        String titulo,
    @Size(max = CriarListaRequisicao.DESCRICAO_MAXIMA, message = "Use até 300 caracteres na descrição.")
        String descricao,
    UUID livroId) {

  /** Limites decididos em 30/09/2026; o CHECK de {@code V20261005100000} garante o mesmo teto. */
  public static final int TITULO_MAXIMO = 80;

  public static final int DESCRICAO_MAXIMA = 300;
}
