package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code ResenhaSnapshot} de {@code docs/api/social.yaml}. Presente só quando {@code
 * Atividade.tipo == RESENHA_PUBLICADA}; nas demais o campo {@code resenha} da atividade é nulo.
 */
@Schema(name = "ResenhaSnapshot")
public record ResenhaSnapshotResposta(String id, String texto, boolean spoiler) {}
