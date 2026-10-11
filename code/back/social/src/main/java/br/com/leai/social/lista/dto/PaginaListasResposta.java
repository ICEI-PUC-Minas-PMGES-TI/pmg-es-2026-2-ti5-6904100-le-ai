package br.com.leai.social.lista.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Schema {@code PaginaListas}: índice de listas paginado por página/tamanho. */
@Schema(name = "PaginaListas")
public record PaginaListasResposta(
    List<ListaResumoResposta> itens,
    int pagina,
    int tamanho,
    long totalItens,
    int totalPaginas,
    boolean ultima) {}
