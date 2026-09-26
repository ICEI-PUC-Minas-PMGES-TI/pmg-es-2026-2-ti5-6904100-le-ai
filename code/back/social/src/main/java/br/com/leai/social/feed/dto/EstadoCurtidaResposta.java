package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code EstadoCurtida} de {@code docs/api/social.yaml}: resposta de {@code POST
 * /atividades/{id}/curtir}. {@code curtida} é sempre {@code true} aqui (o contrato fixa
 * {@code enum: [true]}); desfazer a curtida responde {@code 204} sem corpo.
 */
@Schema(name = "EstadoCurtida")
public record EstadoCurtidaResposta(String atividadeId, boolean curtida, long totalCurtidas) {}
