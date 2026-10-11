package br.com.leai.social.lista.dto;

import br.com.leai.social.feed.dto.LinkLivroResposta;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code LivroDaLista}: dados atuais do livro, lidos de {@code v_livro_referencia_v1} na
 * consulta (não é snapshot). {@code link} reusa o schema {@code LinkLivro} do feed.
 */
@Schema(name = "LivroDaLista")
public record LivroDaListaResposta(
    String id, String tipo, String titulo, String autor, String capaUrl, LinkLivroResposta link) {}
