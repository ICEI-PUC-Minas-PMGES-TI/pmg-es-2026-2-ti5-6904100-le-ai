package br.com.leai.social.integracao;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Massa dos testes de F-REC-P2P contra Postgres real: recria o mínimo de {@code identidade},
 * {@code acervo} e {@code leitura} que as VIEWs consumidas pela recomendação exigem, e insere
 * leitores, seguimentos, livros, estante e recomendações. As VIEWs têm a mesma definição, coluna a
 * coluna, das outras classes de teste: {@code CREATE OR REPLACE VIEW} não remove colunas e o
 * contexto do Spring é compartilhado.
 */
public final class MassaDeRecomendacao {

  private final JdbcTemplate jdbc;

  public MassaDeRecomendacao(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** Cria schemas, tabelas e VIEWs de outros serviços e começa de tabelas vazias. */
  public void preparar() {
    jdbc.execute("CREATE SCHEMA IF NOT EXISTS identidade");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS identidade.usuario (
          id uuid PRIMARY KEY,
          suspenso boolean NOT NULL DEFAULT false,
          exclusao_solicitada_em timestamptz
        )
        """);
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS username text");
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS nome_exibicao text");
    jdbc.execute("ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS avatar_url text");
    jdbc.execute(
        "ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS privacidade text NOT NULL DEFAULT 'publico'");
    jdbc.execute(
        "ALTER TABLE identidade.usuario ADD COLUMN IF NOT EXISTS opt_out_recomendacao boolean NOT NULL DEFAULT false");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS identidade.seguidor (
          seguidor_id uuid NOT NULL,
          seguido_id uuid NOT NULL,
          PRIMARY KEY (seguidor_id, seguido_id)
        )
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW identidade.v_seguimento_aceito_v1 AS
        SELECT s.seguidor_id, s.seguido_id
          FROM identidade.seguidor s
          JOIN identidade.usuario u_seguidor ON u_seguidor.id = s.seguidor_id
          JOIN identidade.usuario u_seguido ON u_seguido.id = s.seguido_id
         WHERE u_seguidor.suspenso = false AND u_seguidor.exclusao_solicitada_em IS NULL
           AND u_seguido.suspenso = false AND u_seguido.exclusao_solicitada_em IS NULL
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW identidade.v_perfil_referencia_v1 AS
        SELECT id, username, nome_exibicao, avatar_url, privacidade, opt_out_recomendacao
          FROM identidade.usuario
         WHERE suspenso = false AND exclusao_solicitada_em IS NULL
        """);

    jdbc.execute("CREATE SCHEMA IF NOT EXISTS acervo");
    jdbc.execute("CREATE TABLE IF NOT EXISTS acervo.autor (id uuid PRIMARY KEY, nome text NOT NULL)");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS acervo.livro (
          id uuid PRIMARY KEY,
          tipo text NOT NULL,
          dono_id uuid,
          paginas integer,
          titulo text NOT NULL,
          autor_informado text,
          capa_url_propria text,
          capa_url_externa text,
          ativo boolean NOT NULL DEFAULT true
        )
        """);
    jdbc.execute(
        "CREATE TABLE IF NOT EXISTS acervo.livro_autor (livro_id uuid NOT NULL, autor_id uuid NOT NULL)");
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW acervo.v_livro_referencia_v1 AS (
          SELECT
            l.id AS livro_id,
            l.tipo,
            l.dono_id,
            l.paginas,
            l.titulo,
            CASE
              WHEN l.tipo = 'pessoal' THEN l.autor_informado
              ELSE (
                SELECT string_agg(a.nome, ', ' ORDER BY a.nome)
                FROM acervo.livro_autor la
                JOIN acervo.autor a ON a.id = la.autor_id
                WHERE la.livro_id = l.id
              )
            END AS autor_exibicao,
            coalesce(l.capa_url_propria, l.capa_url_externa) AS capa_resolvida,
            l.ativo
          FROM acervo.livro l
        )
        """);

    jdbc.execute("CREATE SCHEMA IF NOT EXISTS leitura");
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS leitura.estante (
          usuario_id uuid NOT NULL,
          livro_id uuid NOT NULL,
          status text NOT NULL,
          vezes_lido integer NOT NULL DEFAULT 0,
          PRIMARY KEY (usuario_id, livro_id)
        )
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW leitura.v_estante_publica_v1 AS (
          SELECT usuario_id, livro_id, status, vezes_lido FROM leitura.estante
        )
        """);

    jdbc.execute(
        "TRUNCATE identidade.seguidor, identidade.usuario, acervo.livro, leitura.estante CASCADE");
    jdbc.execute("TRUNCATE recomendacao, outbox_social");
  }

  public UUID leitor(String username) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO identidade.usuario (id, username, nome_exibicao) VALUES (?, ?, ?)",
        id,
        username,
        "Leitor " + username);
    return id;
  }

  /** Novo leitor com seguimento aceito nos dois sentidos com {@code outro}. */
  public UUID mutuoDe(UUID outro, String username) {
    UUID id = leitor(username);
    jdbc.update("INSERT INTO identidade.seguidor VALUES (?, ?), (?, ?)", outro, id, id, outro);
    return id;
  }

  public void segue(UUID seguidor, UUID seguido) {
    jdbc.update("INSERT INTO identidade.seguidor VALUES (?, ?)", seguidor, seguido);
  }

  public UUID livroOficial(String titulo) {
    UUID id = UUID.randomUUID();
    jdbc.update("INSERT INTO acervo.livro (id, tipo, titulo) VALUES (?, 'oficial', ?)", id, titulo);
    return id;
  }

  public void naEstante(UUID usuario, UUID livro) {
    jdbc.update(
        "INSERT INTO leitura.estante (usuario_id, livro_id, status) VALUES (?, ?, 'quero_ler')",
        usuario,
        livro);
  }

  /** Recomendação criada há {@code diasAtras} dias; acima de 90 ela já está vencida. */
  public UUID recomendacao(UUID remetente, UUID destinatario, UUID livro, int diasAtras) {
    return jdbc.queryForObject(
        "INSERT INTO recomendacao"
            + " (remetente_id, destinatario_id, livro_id, mensagem, criado_em, expira_em)"
            + " VALUES (?, ?, ?, 'Mensagem de teste', now() - make_interval(days => ?),"
            + "         now() - make_interval(days => ?) + interval '90 days')"
            + " RETURNING id",
        UUID.class,
        remetente,
        destinatario,
        livro,
        diasAtras,
        diasAtras);
  }

  public long contar(String sql, Object... parametros) {
    return jdbc.queryForObject(sql, Long.class, parametros);
  }
}
