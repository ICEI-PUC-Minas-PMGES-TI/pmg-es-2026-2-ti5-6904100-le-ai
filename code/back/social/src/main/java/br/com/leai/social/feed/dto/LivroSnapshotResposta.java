package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Schema {@code LivroSnapshot} de {@code docs/api/social.yaml}: snapshot mínimo do livro no momento do fato de leitura. */
@Schema(name = "LivroSnapshot")
public record LivroSnapshotResposta(
    String id, String tipo, String titulo, String autor, String capaUrl, LinkLivroResposta link) {}
