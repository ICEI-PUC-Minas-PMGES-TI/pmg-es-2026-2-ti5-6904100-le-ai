package br.com.leai.social.conta.service;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.leai.social.integracao.IntegracaoComPostgres;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Guarda da exclusão de conta (F-CONTA-2, RN-23.5): toda tabela do schema {@code social} tem
 * destino declarado quando chega {@code conta.excluida}. Uma migration que cria tabela nova reprova
 * aqui até alguém decidir o que acontece com os dados da conta nela. A matriz de remoção fica no
 * arquivo da feature.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class GuardaDeExclusaoIntegracaoTest extends IntegracaoComPostgres {

  /** {@link ConsumidorDeContaExcluida} apaga as linhas da conta. */
  private static final Set<String> APAGADAS =
      Set.of(
          "atividade",
          "curtida_atividade",
          "comentario",
          "comentario_mencao",
          "lista",
          "recomendacao",
          "sugestao_descartada",
          "notificacao",
          "preferencia_notificacao",
          "dispositivo_push",
          "denuncia");

  /** Saem pelo ON DELETE CASCADE de outra tabela (filha → mãe). */
  private static final Map<String, String> POR_CASCATA = Map.of("lista_item", "lista");

  /** O consumidor anonimiza em vez de apagar. */
  private static final Set<String> ANONIMIZADAS =
      Set.of("log_moderacao", "idempotencia_social", "outbox_social");

  /** Sem dado de usuário: a exclusão não toca. */
  private static final Map<String, String> ISENTAS =
      Map.of(
          "mensagem_processada", "recibo de consumo: só id e tipo do evento",
          "flyway_schema_history", "histórico de migrations");

  @Autowired private JdbcTemplate jdbc;

  @Test
  @DisplayName("toda tabela do schema tem destino na exclusão, e só um")
  void todaTabelaTemDestino() {
    Set<String> existentes =
        new HashSet<>(
            jdbc.queryForList(
                "SELECT tablename FROM pg_tables WHERE schemaname = current_schema()",
                String.class));
    List<String> declaradas = new ArrayList<>(APAGADAS);
    declaradas.addAll(POR_CASCATA.keySet());
    declaradas.addAll(ANONIMIZADAS);
    declaradas.addAll(ISENTAS.keySet());

    assertThat(existentes)
        .as(
            "tabela sem destino: trate no ConsumidorDeContaExcluida ou declare aqui como cascata,"
                + " anonimizada ou isenta com o motivo")
        .isSubsetOf(declaradas);
    assertThat(declaradas).as("declarada mas inexistente").isSubsetOf(existentes);
    assertThat(declaradas).as("declarada em dois grupos").doesNotHaveDuplicates();
  }

  @Test
  @DisplayName("cada cascata declarada existe no banco com ON DELETE CASCADE")
  void cascatasExistem() {
    Set<String> cascatas =
        new HashSet<>(
            jdbc.queryForList(
                """
                SELECT f.relname || '->' || m.relname
                  FROM pg_constraint c
                  JOIN pg_class f ON f.oid = c.conrelid
                  JOIN pg_class m ON m.oid = c.confrelid
                 WHERE c.contype = 'f' AND c.confdeltype = 'c'
                   AND c.connamespace = current_schema()::regnamespace
                """,
                String.class));
    POR_CASCATA.forEach(
        (filha, mae) ->
            assertThat(cascatas)
                .as("%s sem CASCADE para %s", filha, mae)
                .contains(filha + "->" + mae));
  }
}
