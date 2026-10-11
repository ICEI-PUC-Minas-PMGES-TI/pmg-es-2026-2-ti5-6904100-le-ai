package br.com.leai.social.lista.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Schema {@code CapaDaLista}: um dos três primeiros livros ativos, pela ordem do dono. */
@Schema(name = "CapaDaLista")
public record CapaDaListaResposta(String livroId, String tipo, String titulo, String capaUrl) {}
