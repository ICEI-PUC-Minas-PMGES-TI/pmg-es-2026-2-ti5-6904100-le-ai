package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Schema {@code Comentario} de {@code docs/api/social.yaml}. {@code comentarioRaizId} ausente em
 * raiz; {@code totalRespostas} só faz sentido em raiz (nulo em resposta).
 */
@Schema(name = "Comentario")
public record ComentarioResposta(
    String id,
    String atividadeId,
    String comentarioRaizId,
    String comentarioRespondidoId,
    AutorSnapshotResposta usuarioRespondido,
    AutorSnapshotResposta autor,
    String texto,
    String nivel,
    Integer totalRespostas,
    boolean pertenceAoSolicitante,
    Instant criadoEm,
    Instant atualizadoEm) {}
