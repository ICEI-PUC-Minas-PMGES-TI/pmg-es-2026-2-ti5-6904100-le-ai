package br.com.leai.social.recomendacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Quantas recomendações do livro saíram da lista do leitor; zero quando já não havia nenhuma. */
@Schema(name = "DescarteEmLote")
public record DescarteEmLoteResposta(long removidas) {}
