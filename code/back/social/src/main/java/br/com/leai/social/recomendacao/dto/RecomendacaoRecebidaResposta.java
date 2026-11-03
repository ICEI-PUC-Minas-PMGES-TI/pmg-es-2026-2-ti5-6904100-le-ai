package br.com.leai.social.recomendacao.dto;

import br.com.leai.social.feed.dto.AutorSnapshotResposta;
import br.com.leai.social.feed.dto.LivroSnapshotResposta;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(name = "RecomendacaoRecebida")
public record RecomendacaoRecebidaResposta(
    String id,
    AutorSnapshotResposta remetente,
    LivroSnapshotResposta livro,
    String mensagem,
    Instant criadoEm,
    Instant expiraEm) {}
