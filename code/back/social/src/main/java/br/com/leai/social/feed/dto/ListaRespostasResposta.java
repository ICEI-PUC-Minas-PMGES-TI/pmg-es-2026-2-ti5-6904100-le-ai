package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * Schema {@code ListaRespostas} de {@code docs/api/social.yaml}: respostas de uma raiz, paginadas
 * por cursor. {@code proximoCursor} ausente quando {@code temMais} é falso.
 */
@Schema(name = "ListaRespostas")
public record ListaRespostasResposta(List<ComentarioResposta> itens, String proximoCursor, boolean temMais) {}
