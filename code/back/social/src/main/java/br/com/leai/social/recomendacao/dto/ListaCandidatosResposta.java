package br.com.leai.social.recomendacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(name = "ListaCandidatos")
public record ListaCandidatosResposta(List<CandidatoResposta> itens) {}
