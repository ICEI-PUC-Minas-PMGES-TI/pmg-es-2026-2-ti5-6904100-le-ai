package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "LivroDaDenuncia")
public record LivroDaDenuncia(String id, String titulo, boolean pessoal) {}
