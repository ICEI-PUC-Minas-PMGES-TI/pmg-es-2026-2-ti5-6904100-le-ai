package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Schema {@code LinkLivro} de {@code docs/api/social.yaml}: para livro pessoal, {@code via} vem
 * {@code feed} e {@code referenciaId} é o id da atividade — o serviço `acervo` revalida a
 * autorização ao abrir a página.
 */
@Schema(name = "LinkLivro")
public record LinkLivroResposta(String livroId, String via, String referenciaId) {}
