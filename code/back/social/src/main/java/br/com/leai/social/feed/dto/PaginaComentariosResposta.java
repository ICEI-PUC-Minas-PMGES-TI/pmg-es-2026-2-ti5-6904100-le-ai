package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Schema {@code PaginaComentarios} de {@code docs/api/social.yaml}: comentários-raiz paginados por página/tamanho. */
@Schema(name = "PaginaComentarios")
public record PaginaComentariosResposta(
    List<ComentarioResposta> itens,
    int pagina,
    int tamanho,
    long totalItens,
    int totalPaginas,
    boolean ultima) {}
