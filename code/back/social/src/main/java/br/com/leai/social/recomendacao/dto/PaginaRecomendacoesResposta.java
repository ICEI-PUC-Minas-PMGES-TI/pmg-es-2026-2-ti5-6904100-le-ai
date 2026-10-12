package br.com.leai.social.recomendacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(name = "PaginaRecomendacoes")
public record PaginaRecomendacoesResposta(
    List<RecomendacaoRecebidaResposta> itens,
    int pagina,
    int tamanho,
    long totalItens,
    int totalPaginas,
    boolean ultima) {}
