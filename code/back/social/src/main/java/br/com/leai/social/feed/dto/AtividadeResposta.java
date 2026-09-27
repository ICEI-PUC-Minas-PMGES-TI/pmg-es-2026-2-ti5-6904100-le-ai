package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Schema {@code Atividade} de {@code docs/api/social.yaml}: um item do feed, já com os totais e a
 * curtida do solicitante resolvidos (agregação que pertence às tasks 3/4, não a esta).
 */
@Schema(name = "Atividade")
public record AtividadeResposta(
    String id,
    String tipo,
    AutorSnapshotResposta autor,
    LivroSnapshotResposta livro,
    ResenhaSnapshotResposta resenha,
    Instant criadoEm,
    long totalCurtidas,
    long totalComentarios,
    boolean curtidaPeloSolicitante) {}
