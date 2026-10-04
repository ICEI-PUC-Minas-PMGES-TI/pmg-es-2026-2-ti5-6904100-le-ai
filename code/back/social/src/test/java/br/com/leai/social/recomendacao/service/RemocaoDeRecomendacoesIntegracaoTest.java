package br.com.leai.social.recomendacao.service;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.integracao.IntegracaoComPostgres;
import br.com.leai.social.integracao.MassaDeRecomendacao;
import br.com.leai.social.messaging.MessageEnvelope;
import br.com.leai.social.messaging.MessagingConstants;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Vias automáticas de remoção contra Postgres real: o livro entra na estante (RN-22.10, pelo
 * consumidor de {@code livro.adicionado_a_estante}) e a rotina diária, que apaga vencidas (RN-22.9)
 * e reconcilia com a estante. O envelope é entregue direto ao handler; validação e DLQ do broker
 * ficam em {@code ConsumidorDeLivroNaEstanteBrokerTest}.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class RemocaoDeRecomendacoesIntegracaoTest extends IntegracaoComPostgres {

  @Autowired private ConsumidorDeLivroNaEstante consumidor;
  @Autowired private LimpezaDeRecomendacoes limpeza;
  @Autowired private JdbcTemplate jdbc;
  private MassaDeRecomendacao massa;

  @BeforeEach
  void preparaMassa() {
    massa = new MassaDeRecomendacao(jdbc);
    massa.preparar();
  }

  @Test
  @DisplayName("Livro na estante remove todas as recomendações dele ao leitor, de todos os remetentes")
  void livroNaEstanteRemoveAsRecomendacoesDoLivro() {
    UUID bia = massa.leitor("bia");
    UUID ana = massa.mutuoDe(bia, "ana");
    UUID caio = massa.mutuoDe(bia, "caio");
    UUID livro = massa.livroOficial("Torto arado");
    UUID outroLivro = massa.livroOficial("Outro");
    massa.recomendacao(ana, bia, livro, 1);
    massa.recomendacao(caio, bia, livro, 2);
    UUID mantidaOutroLivro = massa.recomendacao(ana, bia, outroLivro, 1);
    UUID mantidaOutroLeitor = massa.recomendacao(bia, caio, livro, 1);

    consumidor.handle(estantado(bia, livro));

    assertThat(idsRestantes()).containsExactlyInAnyOrder(mantidaOutroLivro, mantidaOutroLeitor);
  }

  @Test
  @DisplayName("Reentrega do mesmo fato não tem efeito adicional")
  void reentregaENoOp() {
    UUID bia = massa.leitor("bia");
    UUID ana = massa.mutuoDe(bia, "ana");
    UUID livro = massa.livroOficial("Torto arado");
    massa.recomendacao(ana, bia, livro, 1);
    MessageEnvelope fato = estantado(bia, livro);

    consumidor.handle(fato);
    consumidor.handle(fato);

    assertThat(massa.contar("SELECT count(*) FROM recomendacao")).isZero();
  }

  @Test
  @DisplayName("Rotina diária apaga vencidas e as de livro já na estante, e mantém as ativas")
  void limpezaApagaVencidasEReconciliaComAEstante() {
    UUID bia = massa.leitor("bia");
    UUID ana = massa.mutuoDe(bia, "ana");
    massa.recomendacao(ana, bia, massa.livroOficial("Vencida"), 91);
    UUID estantado = massa.livroOficial("Estantado sem evento");
    massa.recomendacao(ana, bia, estantado, 5);
    massa.naEstante(bia, estantado);
    UUID ativa = massa.recomendacao(ana, bia, massa.livroOficial("Ativa"), 89);

    limpeza.limpar();

    assertThat(idsRestantes()).containsExactly(ativa);
  }

  @Test
  @DisplayName("Rotina apaga em lotes até não sobrar vencida")
  void limpezaEmVariosLotes() {
    UUID bia = massa.leitor("bia");
    UUID ana = massa.mutuoDe(bia, "ana");
    UUID livro = massa.livroOficial("Vencido");
    jdbc.update(
        "INSERT INTO recomendacao (remetente_id, destinatario_id, livro_id, criado_em, expira_em)"
            + " SELECT ?, ?, ?, now() - interval '100 days', now() - interval '10 days'"
            + " FROM generate_series(1, ?)",
        ana,
        bia,
        livro,
        LimpezaDeRecomendacoes.LOTE + 1);

    limpeza.limpar();

    assertThat(massa.contar("SELECT count(*) FROM recomendacao")).isZero();
  }

  private List<UUID> idsRestantes() {
    return jdbc.queryForList("SELECT id FROM recomendacao", UUID.class);
  }

  private static MessageEnvelope estantado(UUID usuario, UUID livro) {
    return new MessageEnvelope(
        UUID.randomUUID(),
        MessagingConstants.EVENTO_LIVRO_ADICIONADO_A_ESTANTE,
        1,
        OffsetDateTime.parse("2026-10-04T12:00:00Z"),
        UUID.randomUUID(),
        "estante:" + usuario + ":" + livro,
        Map.of("usuarioId", usuario.toString(), "livroId", livro.toString()));
  }
}
