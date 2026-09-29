package br.com.leai.social.notificacao.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Schema {@code PaginaNotificacoes}: página do leitor mais o total de não lidas para o badge. */
@Schema(name = "PaginaNotificacoes")
public record PaginaNotificacoesResposta(
    List<NotificacaoResposta> itens,
    int pagina,
    int tamanho,
    long totalItens,
    int totalPaginas,
    boolean ultima,
    long totalNaoLidas) {}
