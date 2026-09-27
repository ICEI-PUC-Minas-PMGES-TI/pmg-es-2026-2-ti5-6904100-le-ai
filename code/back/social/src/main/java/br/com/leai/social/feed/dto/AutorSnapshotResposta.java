package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code AutorSnapshot} de {@code docs/api/social.yaml}: snapshot capturado no evento, sem
 * exigir hidratação síncrona do perfil em `identidade`.
 */
@Schema(name = "AutorSnapshot")
public record AutorSnapshotResposta(String id, String username, String nomeExibicao, String avatarUrl) {}
