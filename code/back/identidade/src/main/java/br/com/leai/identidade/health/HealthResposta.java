package br.com.leai.identidade.health;

import io.swagger.v3.oas.annotations.media.Schema;

/** Corpo do {@code GET /health} — mesma forma nos quatro serviços (RNF-OBS-02). */
@Schema(name = "Health")
public record HealthResposta(
    @Schema(example = "ok") String status,
    @Schema(example = "identidade") String service,
    @Schema(format = "date-time", example = "2026-08-25T12:00:00.000Z") String time) {}
