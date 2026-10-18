package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(name = "PaginaRegistrosDeModeracao")
public record PaginaRegistrosResposta(
    List<RegistroDeModeracaoResposta> itens, String proximoCursor, boolean temMais) {}
