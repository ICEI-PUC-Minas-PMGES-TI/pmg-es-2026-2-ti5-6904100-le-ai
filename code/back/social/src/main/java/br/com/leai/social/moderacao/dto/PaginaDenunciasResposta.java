package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Página por cursor: a fila encolhe a cada ação, e uma página por número pularia denúncias. */
@Schema(name = "PaginaDenuncias")
public record PaginaDenunciasResposta(
    List<DenunciaPendenteResposta> itens, String proximoCursor, boolean temMais) {}
