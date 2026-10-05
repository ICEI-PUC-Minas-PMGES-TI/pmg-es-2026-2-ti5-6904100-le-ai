package br.com.leai.social.lista.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;

/**
 * Schema {@code ListaResumo}: item do índice de listas. {@code contemLivro} só sai em {@code
 * listarMinhasListas} com {@code livroId}; nos outros casos é omitido do JSON.
 */
@Schema(name = "ListaResumo")
public record ListaResumoResposta(
    String id,
    String titulo,
    String descricao,
    long quantidadeLivros,
    List<CapaDaListaResposta> capas,
    Instant atualizadaEm,
    @JsonInclude(JsonInclude.Include.NON_NULL) Boolean contemLivro) {}
