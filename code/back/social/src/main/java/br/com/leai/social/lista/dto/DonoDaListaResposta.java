package br.com.leai.social.lista.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Schema {@code DonoDaLista}: dados públicos atuais do dono, lidos de {@code v_perfil_referencia_v1}. */
@Schema(name = "DonoDaLista")
public record DonoDaListaResposta(String id, String username, String nomeExibicao, String avatarUrl) {}
