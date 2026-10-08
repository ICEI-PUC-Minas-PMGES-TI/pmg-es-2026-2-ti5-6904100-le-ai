package br.com.leai.identidade.conta.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** Resposta `202` de {@code DELETE /me/conta}: a janela de recuperação aberta (RN-23.2). */
@Schema(name = "ExclusaoSolicitada")
public record ExclusaoSolicitadaResposta(
    Instant exclusaoSolicitadaEm,
    @Schema(description = "Remoção definitiva, exatamente 30 dias após a solicitação")
        Instant exclusaoPrevistaEm) {}
