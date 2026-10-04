package br.com.leai.social.recomendacao.dto;

import br.com.leai.social.feed.dto.AutorSnapshotResposta;
import io.swagger.v3.oas.annotations.media.Schema;

/** Schema {@code CandidatoARecomendacao}: um mútuo e a situação dele para o livro. */
@Schema(name = "CandidatoARecomendacao")
public record CandidatoResposta(
    AutorSnapshotResposta leitor, boolean jaTemLivro, boolean limiteAtingido) {}
