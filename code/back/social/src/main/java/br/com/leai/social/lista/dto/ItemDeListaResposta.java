package br.com.leai.social.lista.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

/** Schema {@code ItemDeLista} de {@code docs/api/social.yaml}. */
@Schema(name = "ItemDeLista")
public record ItemDeListaResposta(
    String id, String listaId, LivroDaListaResposta livro, int posicao, Instant adicionadoEm) {}
