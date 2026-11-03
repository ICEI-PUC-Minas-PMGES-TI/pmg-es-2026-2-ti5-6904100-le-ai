package br.com.leai.social.lista.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Schema {@code MoverLivroNaLista} de {@code docs/api/social.yaml}. O teto (quantidade de livros
 * da lista) depende do banco e é conferido no serviço.
 */
@Schema(name = "MoverLivroNaLista")
public record MoverLivroNaListaRequisicao(
    @NotNull(message = "Informe a nova posição.")
        @Min(value = 1, message = "A posição começa em 1.")
        Integer posicao) {}
