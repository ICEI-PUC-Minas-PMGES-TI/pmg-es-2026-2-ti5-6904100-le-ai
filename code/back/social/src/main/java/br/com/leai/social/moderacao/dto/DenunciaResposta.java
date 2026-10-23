package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Denúncia registrada. Mínima de propósito: vai inteira para o recibo de idempotência, que
 * sobrevive à exclusão da conta até ser anonimizado, então não leva motivo nem nada do alvo.
 */
@Schema(name = "Denuncia")
public record DenunciaResposta(String id, String estado, Instant criadoEm) {}
