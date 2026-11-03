package br.com.leai.social.lista.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** Schema {@code AdicionarLivroNaLista} de {@code docs/api/social.yaml}. */
@Schema(name = "AdicionarLivroNaLista")
public record AdicionarLivroNaListaRequisicao(
    @NotNull(message = "Informe o livro.") UUID livroId) {}
