package br.com.leai.social.recomendacao.service;

import br.com.leai.social.recomendacao.repository.RecomendacaoRepository;
import java.util.function.IntUnaryOperator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Rotina diária de remoção física (§10.8, sem exigir precisão de horário): recomendações vencidas
 * (RN-22.9) e as de livro que já está na estante do destinatário (RN-22.10), que o consumidor de
 * {@code livro.adicionado_a_estante} não viu. As consultas já escondem as vencidas; a rotina só
 * libera espaço e fecha a reconciliação. Apaga em lotes para não segurar locks longos.
 */
@Component
public class LimpezaDeRecomendacoes {

  static final int LOTE = 1_000;

  private static final Logger LOG = LoggerFactory.getLogger(LimpezaDeRecomendacoes.class);

  private final RecomendacaoRepository repositorio;

  public LimpezaDeRecomendacoes(RecomendacaoRepository repositorio) {
    this.repositorio = repositorio;
  }

  @Scheduled(
      cron = "${leai.recomendacoes.limpeza-cron:0 30 4 * * *}",
      zone = "America/Sao_Paulo")
  public void limpar() {
    int expiradas = emLotes(repositorio::removerExpiradas);
    int naEstante = emLotes(repositorio::removerJaNaEstante);
    LOG.info(
        "Limpeza de recomendacoes: {} expiradas e {} ja na estante removidas", expiradas, naEstante);
  }

  private static int emLotes(IntUnaryOperator remocao) {
    int total = 0;
    int removidas;
    do {
      removidas = remocao.applyAsInt(LOTE);
      total += removidas;
    } while (removidas == LOTE);
    return total;
  }
}
