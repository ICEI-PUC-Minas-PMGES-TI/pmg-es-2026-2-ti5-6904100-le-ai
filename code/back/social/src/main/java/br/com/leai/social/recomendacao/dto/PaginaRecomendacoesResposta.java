package br.com.leai.social.recomendacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Schema {@code PaginaRecomendacoes}: recebidas paginadas por página/tamanho (RNF-DES-02). */
@Schema(name = "PaginaRecomendacoes")
public record PaginaRecomendacoesResposta(
    List<RecomendacaoRecebidaResposta> itens,
    int pagina,
    int tamanho,
    long totalItens,
    int totalPaginas,
    boolean ultima) {}
