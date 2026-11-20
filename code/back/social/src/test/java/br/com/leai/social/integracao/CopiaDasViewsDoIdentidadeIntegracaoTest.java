package br.com.leai.social.integracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Contrato das cópias das VIEWs do {@code identidade} nos testes do {@code social} (L-35,
 * F-MOD-OPC). Os testes de integração do {@code social} não aplicam as migrations do {@code
 * identidade}: {@link MassaDeRecomendacao} recria as VIEWs à mão, e é sobre elas que a ocultação da
 * conta suspensa é provada. Este teste lê a última migration do {@code identidade} que define cada
 * VIEW, cria a VIEW real num schema à parte sobre a mesma tabela falsa e compara as linhas das duas
 * numa massa com todos os estados de conta. Se o filtro real mudar (ou a cópia), o teste quebra.
 *
 * <p>O que fica de fora: as cópias das classes do Kayke e do Henrique, que recriam as mesmas VIEWs
 * por conta própria (aviso no plano da E6-02).
 */
@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")
class CopiaDasViewsDoIdentidadeIntegracaoTest extends IntegracaoComPostgres {

  /** Migrations do {@code identidade}, a partir da pasta do {@code social} (onde o Maven roda). */
  static final Path MIGRATIONS_DO_IDENTIDADE =
      Path.of("..", "identidade", "src", "main", "resources", "db", "migration");

  private static final String SCHEMA_REAL = "contrato_identidade";

  @Autowired private JdbcTemplate jdbc;

  @BeforeEach
  void preparar() {
    new MassaDeRecomendacao(jdbc).preparar();
    jdbc.execute("DROP SCHEMA IF EXISTS " + SCHEMA_REAL + " CASCADE");
    jdbc.execute("CREATE SCHEMA " + SCHEMA_REAL);

    // Todos os estados de conta: ativa pública, ativa privada, suspensa, em exclusão e as duas
    // coisas; e todos os pares de seguimento entre elas.
    List<UUID> contas =
        List.of(
            conta("ativa", "publico", false, false),
            conta("privada", "privado", false, false),
            conta("suspensa", "publico", true, false),
            conta("em_exclusao", "publico", false, true),
            conta("suspensa_em_exclusao", "privado", true, true));
    for (UUID seguidor : contas) {
      for (UUID seguido : contas) {
        if (!seguidor.equals(seguido)) {
          jdbc.update("INSERT INTO identidade.seguidor VALUES (?, ?)", seguidor, seguido);
        }
      }
    }
  }

  @AfterEach
  void limpar() {
    // A VIEW real depende de identidade.usuario: não pode sobrar para outra classe que mexa nela.
    jdbc.execute("DROP SCHEMA IF EXISTS " + SCHEMA_REAL + " CASCADE");
  }

  @ParameterizedTest(name = "{0}")
  @ValueSource(strings = {"v_perfil_referencia_v1", "v_seguimento_aceito_v1", "v_conta_moderacao_v1"})
  @DisplayName("A cópia da VIEW do identidade nos testes filtra igual à migration do identidade")
  void copiaFiltraIgualAMigration(String view) {
    criarViewReal(view, ultimaDefinicao(view));

    assertThat(colunas(SCHEMA_REAL, view)).isEqualTo(colunas("identidade", view));
    long naCopia = jdbc.queryForObject("SELECT count(*) FROM identidade." + view, Long.class);
    long naReal =
        jdbc.queryForObject("SELECT count(*) FROM " + SCHEMA_REAL + "." + view, Long.class);
    long diferencas =
        jdbc.queryForObject(
            "SELECT count(*) FROM ("
                + " (SELECT * FROM identidade." + view
                + "  EXCEPT ALL SELECT * FROM " + SCHEMA_REAL + "." + view + ")"
                + " UNION ALL"
                + " (SELECT * FROM " + SCHEMA_REAL + "." + view
                + "  EXCEPT ALL SELECT * FROM identidade." + view + ")"
                + ") d",
            Long.class);

    assertThat(diferencas).as("linhas diferentes entre a cópia e a VIEW real").isZero();
    assertThat(naCopia).isEqualTo(naReal);
    // A massa exercita o filtro: a VIEW real deixa algumas linhas de fora e mostra outras.
    long base =
        "v_seguimento_aceito_v1".equals(view)
            ? jdbc.queryForObject("SELECT count(*) FROM identidade.seguidor", Long.class)
            : jdbc.queryForObject("SELECT count(*) FROM identidade.usuario", Long.class);
    assertThat(naReal).isPositive().isLessThan(base);
  }

  /** O corpo ({@code SELECT ...}) da última {@code CREATE [OR REPLACE] VIEW} da VIEW no identidade. */
  static String ultimaDefinicao(String view) {
    Pattern criacao =
        Pattern.compile(
            "CREATE\\s+(?:OR\\s+REPLACE\\s+)?VIEW\\s+(?:identidade\\.)?"
                + Pattern.quote(view)
                + "\\s+AS\\s+(.*?);",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    String ultima = null;
    try (Stream<Path> arquivos = Files.list(MIGRATIONS_DO_IDENTIDADE)) {
      // V<timestamp>__: a ordem do nome é a ordem do Flyway.
      for (Path arquivo :
          arquivos.filter(p -> p.getFileName().toString().endsWith(".sql")).sorted().toList()) {
        Matcher m = criacao.matcher(Files.readString(arquivo, StandardCharsets.UTF_8));
        while (m.find()) {
          ultima = m.group(1);
        }
      }
    } catch (IOException erro) {
      throw new UncheckedIOException(
          "Migrations do identidade não encontradas em " + MIGRATIONS_DO_IDENTIDADE.toAbsolutePath(),
          erro);
    }
    assertThat(ultima).as("definição de %s nas migrations do identidade", view).isNotNull();
    return ultima;
  }

  /** Cria a VIEW real com os nomes resolvidos no schema {@code identidade}, como na migration. */
  private void criarViewReal(String view, String corpo) {
    jdbc.execute(
        (ConnectionCallback<Void>)
            conexao -> {
              // A conexão volta ao pool: o search_path dela (o schema do social) é restaurado,
              // e não resetado para o padrão do servidor.
              String original;
              try (Statement comando = conexao.createStatement();
                  ResultSet linha = comando.executeQuery("SHOW search_path")) {
                linha.next();
                original = linha.getString(1);
              }
              try (Statement comando = conexao.createStatement()) {
                comando.execute("SET search_path TO identidade");
                try {
                  comando.execute("CREATE VIEW " + SCHEMA_REAL + "." + view + " AS " + corpo);
                } finally {
                  try (PreparedStatement restaurar =
                      conexao.prepareStatement("SELECT set_config('search_path', ?, false)")) {
                    restaurar.setString(1, original);
                    restaurar.execute();
                  }
                }
              }
              return null;
            });
  }

  private List<String> colunas(String schema, String view) {
    return jdbc.queryForList(
        "SELECT column_name || ':' || data_type FROM information_schema.columns"
            + " WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position",
        String.class,
        schema,
        view);
  }

  private UUID conta(String username, String privacidade, boolean suspensa, boolean emExclusao) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO identidade.usuario (id, username, nome_exibicao, privacidade, suspenso,"
            + " suspenso_em, exclusao_solicitada_em) VALUES (?, ?, ?, ?, ?,"
            + " CASE WHEN ? THEN now() END, CASE WHEN ? THEN now() END)",
        id,
        username,
        "Conta " + username,
        privacidade,
        suspensa,
        suspensa,
        emExclusao);
    return id;
  }
}
