package br.com.leai.social.recomendacao.service;

import br.com.leai.social.recomendacao.repository.RecomendacaoRepository;
import java.util.function.IntUnaryOperator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

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
  // A reconciliação com a estante cobre o que o consumidor não viu, inclusive antes da fila existir.
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
