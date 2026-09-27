package br.com.leai.social.feed.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Schema {@code PaginaAtividades} de {@code docs/api/social.yaml}: feed paginado por página/tamanho. */
@Schema(name = "PaginaAtividades")
public record PaginaAtividadesResposta(
    List<AtividadeResposta> itens,
    int pagina,
    int tamanho,
    long totalItens,
    int totalPaginas,
    boolean ultima) {}
