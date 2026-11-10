package br.com.leai.social.recomendacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

@Schema(name = "DescartarLote")
public record DescartarLoteRequisicao(@NotNull(message = "Informe o livro.") UUID livroId) {}
