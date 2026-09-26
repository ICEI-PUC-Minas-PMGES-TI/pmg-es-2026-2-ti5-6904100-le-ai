package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

/**
 * Schema {@code ResenhaSnapshot} de {@code docs/api/social.yaml}. Presente só quando {@code
 * Atividade.tipo == RESENHA_PUBLICADA}; nas demais o campo {@code resenha} da atividade é nulo.
 * {@code nota} é a nota atual do autor para o livro, nula quando ele não deu nota.
 */
@Schema(name = "ResenhaSnapshot")
public record ResenhaSnapshotResposta(String id, String texto, boolean spoiler, BigDecimal nota) {}
