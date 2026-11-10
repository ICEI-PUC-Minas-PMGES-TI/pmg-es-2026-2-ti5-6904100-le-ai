package br.com.leai.social.recomendacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Recomendações ativas de um livro na lista do leitor (RN-22.12). */
@Schema(name = "RestantesDoLivro")
public record RestantesDoLivroResposta(long restantes) {}
