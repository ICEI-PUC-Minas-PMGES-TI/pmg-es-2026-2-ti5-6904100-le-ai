package br.com.leai.identidade.perfil.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * Corpo de `PATCH /me/perfil` (F-REC-ALG): grava só a preferência de sugestões, sem exigir o resto
 * do perfil, para o `switch` de Configurações salvar sozinho.
 */
@Schema(name = "PreferenciaDeSugestoes")
public record PreferenciaDeSugestoesRequisicao(
    @NotNull(message = "Informe se suas leituras ficam fora das sugestões.")
        Boolean optOutRecomendacao) {}
