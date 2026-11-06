package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Estado da conta depois de suspender ou reativar (F-MOD-OPC), como o {@code identidade} o
 * confirmou. A repetição devolve o mesmo estado.
 */
@Schema(name = "ContaModerada")
public record ContaModeradaResposta(
    String usuarioId, boolean suspensa, Instant suspensaEm, Instant reativadaEm) {}
