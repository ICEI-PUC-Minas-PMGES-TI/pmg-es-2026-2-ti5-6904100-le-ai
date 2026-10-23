package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Atividade do comentário denunciado, pelo snapshot do feed. {@code visivelParaAdmin} decide o
 * link "Ver no feed": o administrador não segue todo mundo, e o link levaria a um 404.
 */
@Schema(name = "AtividadeDaDenuncia")
public record AtividadeDaDenuncia(
    String id, String tipo, String autorNome, String livroTitulo, boolean visivelParaAdmin) {}
