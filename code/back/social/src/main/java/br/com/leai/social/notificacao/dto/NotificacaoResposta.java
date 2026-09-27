package br.com.leai.social.notificacao.dto;

import br.com.leai.social.feed.dto.AutorSnapshotResposta;
import br.com.leai.social.notificacao.model.TipoNotificacao;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/**
 * Schema {@code Notificacao} de {@code docs/api/social.yaml}. {@code ator}, {@code atividadeId} e
 * {@code comentarioId} saem nulos quando quem agiu perdeu a visibilidade (conta suspensa ou em
 * exclusão) ou a atividade deixou de existir.
 */
@Schema(name = "Notificacao")
public record NotificacaoResposta(
    String id,
    TipoNotificacao tipo,
    String mensagem,
    AutorSnapshotResposta ator,
    String atividadeId,
    String comentarioId,
    String leituraId,
    Integer limiarDias,
    LivroDaNotificacaoResposta livro,
    AcaoNotificacaoResposta acao,
    boolean lida,
    Instant lidaEm,
    Instant criadoEm) {}
