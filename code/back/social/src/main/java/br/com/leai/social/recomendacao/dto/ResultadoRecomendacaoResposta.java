package br.com.leai.social.recomendacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(name = "ResultadoRecomendacao")
public record ResultadoRecomendacaoResposta(
    List<ResultadoPorDestinatarioResposta> resultados, int totalCriadas) {}
