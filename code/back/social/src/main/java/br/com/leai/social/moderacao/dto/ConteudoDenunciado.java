package br.com.leai.social.moderacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * O conteúdo inteiro, para o administrador decidir (painel-de-moderacao.md §5): resenha com o
 * Markdown cru, que o cliente renderiza no subconjunto do RN-13, e com spoiler à mostra; nota e
 * respostas quando se aplicam. A denúncia sem conteúdo (excluído pelo autor) vem com ele nulo.
 */
@Schema(name = "ConteudoDenunciado")
public record ConteudoDenunciado(
    String texto, boolean spoiler, BigDecimal nota, Instant publicadoEm, int respostas) {}
