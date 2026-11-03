package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "Mencao")
public record MencaoResposta(int posicao, int comprimento, String usuarioId, String username) {}
