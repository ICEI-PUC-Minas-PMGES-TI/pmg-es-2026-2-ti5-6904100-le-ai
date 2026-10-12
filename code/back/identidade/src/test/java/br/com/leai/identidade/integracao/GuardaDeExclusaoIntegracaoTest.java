package br.com.leai.identidade.integracao;

import static org.assertj.core.api.Assertions.assertThat;

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
 * Guarda da exclusão de conta (F-CONTA-2, RN-23.5): toda tabela do schema {@code identidade} tem
 * destino declarado no job de exclusão definitiva ({@code ServicoDeExclusaoDeConta}). Uma migration
 * que cria tabela nova reprova aqui até alguém decidir o que acontece com os dados da conta nela.
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class GuardaDeExclusaoIntegracaoTest extends IntegracaoComPostgres {

  /** O job apaga: a conta e as tentativas de login (por e-mail ou username). */
  private static final Set<String> APAGADAS = Set.of("usuario", "tentativa_login");

  /** Saem pelo ON DELETE CASCADE de {@code usuario}. */
  private static final Map<String, String> POR_CASCATA =
      Map.of(
          "refresh_token", "usuario",
          "reset_token", "usuario",
          "seguidor", "usuario",
          "solicitacao_seguir", "usuario");

  /** O job anonimiza em vez de apagar (o recibo da exclusão fica, sem a referência). */
  private static final Set<String> ANONIMIZADAS =
      Set.of("exclusao_conta", "idempotencia_identidade", "outbox_identidade");

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
            "tabela sem destino: trate no ServicoDeExclusaoDeConta ou declare aqui como cascata,"
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
