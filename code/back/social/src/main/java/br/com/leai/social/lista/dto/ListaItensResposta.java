package br.com.leai.social.lista.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Schema {@code ListaItens}: segmento de itens paginado por cursor opaco. */
@Schema(name = "ListaItens")
public record ListaItensResposta(
    List<ItemDeListaResposta> itens, String proximoCursor, boolean temMais) {}
