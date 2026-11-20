package br.com.leai.social.integracao;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Massa de F-REC-ALG, sobre a {@link MassaDeRecomendacao}: série, assunto e autor do acervo, as
 * duas VIEWs de recomendação e a nota do {@code leitura}. As VIEWs copiam as migrations dos donos.
 */
public final class MassaDeSugestao {

  private final JdbcTemplate jdbc;
  private final MassaDeRecomendacao base;

  public MassaDeSugestao(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
    this.base = new MassaDeRecomendacao(jdbc);
  }

  public MassaDeRecomendacao base() {
    return base;
  }

  public void preparar() {
    base.preparar();
    jdbc.execute("CREATE TABLE IF NOT EXISTS acervo.serie (id uuid PRIMARY KEY, nome text NOT NULL)");
    jdbc.execute(
        "CREATE TABLE IF NOT EXISTS acervo.assunto (id uuid PRIMARY KEY, nome text NOT NULL)");
    jdbc.execute(
        "CREATE TABLE IF NOT EXISTS acervo.livro_assunto"
            + " (livro_id uuid NOT NULL, assunto_id uuid NOT NULL)");
    jdbc.execute("ALTER TABLE acervo.livro ADD COLUMN IF NOT EXISTS serie_id uuid");
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW acervo.v_livro_recomendacao_v1 AS (
          SELECT
            l.id AS livro_id,
            l.titulo,
            (
              SELECT string_agg(a.nome, ', ' ORDER BY a.nome)
              FROM acervo.livro_autor la
              JOIN acervo.autor a ON a.id = la.autor_id
              WHERE la.livro_id = l.id
            ) AS autor_exibicao,
            coalesce(l.capa_url_propria, l.capa_url_externa) AS capa_resolvida,
            l.serie_id,
            s.nome AS serie_nome,
            la.assunto_id,
            a.nome AS assunto_nome
          FROM acervo.livro l
          LEFT JOIN acervo.serie s ON s.id = l.serie_id
          LEFT JOIN acervo.livro_assunto la ON la.livro_id = l.id
          LEFT JOIN acervo.assunto a ON a.id = la.assunto_id
          WHERE l.tipo = 'oficial' AND l.ativo
        )
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW acervo.v_livro_autor_recomendacao_v1 AS (
          SELECT la.livro_id, la.autor_id
          FROM acervo.livro_autor la
          JOIN acervo.livro l ON l.id = la.livro_id
          WHERE l.tipo = 'oficial' AND l.ativo
        )
        """);
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS leitura.nota (
          usuario_id uuid NOT NULL,
          livro_id uuid NOT NULL,
          valor numeric(2, 1) NOT NULL,
          UNIQUE (usuario_id, livro_id)
        )
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW leitura.v_nota_publicacao_v1 AS (
          SELECT n.usuario_id, n.livro_id, n.valor FROM leitura.nota n
        )
        """);
    jdbc.execute(
        "TRUNCATE acervo.serie, acervo.assunto, acervo.livro_assunto, acervo.livro_autor,"
            + " acervo.autor, leitura.nota");
    jdbc.execute("TRUNCATE sugestao_descartada, idempotencia_social");
  }

  public UUID leitor(String username) {
    return base.leitor(username);
  }

  /** {@code seguidor} passa a seguir {@code seguido}, com o seguimento já aceito. */
  public void segue(UUID seguidor, UUID seguido) {
    base.segue(seguidor, seguido);
  }

  public void optOut(UUID usuario) {
    jdbc.update("UPDATE identidade.usuario SET opt_out_recomendacao = true WHERE id = ?", usuario);
  }

  public UUID livro(String titulo) {
    return base.livroOficial(titulo);
  }

  public UUID livroPessoal(UUID dono, String titulo) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, dono_id, titulo) VALUES (?, 'pessoal', ?, ?)",
        id,
        dono,
        titulo);
    return id;
  }

  public void inativar(UUID livro) {
    jdbc.update("UPDATE acervo.livro SET ativo = false WHERE id = ?", livro);
  }

  public UUID autor(String nome, UUID... livros) {
    UUID id = UUID.randomUUID();
    jdbc.update("INSERT INTO acervo.autor (id, nome) VALUES (?, ?)", id, nome);
    for (UUID livro : livros) {
      jdbc.update("INSERT INTO acervo.livro_autor (livro_id, autor_id) VALUES (?, ?)", livro, id);
    }
    return id;
  }

  public UUID serie(String nome, UUID... livros) {
    UUID id = UUID.randomUUID();
    jdbc.update("INSERT INTO acervo.serie (id, nome) VALUES (?, ?)", id, nome);
    for (UUID livro : livros) {
      jdbc.update("UPDATE acervo.livro SET serie_id = ? WHERE id = ?", id, livro);
    }
    return id;
  }

  public UUID assunto(String nome, UUID... livros) {
    UUID id = UUID.randomUUID();
    jdbc.update("INSERT INTO acervo.assunto (id, nome) VALUES (?, ?)", id, nome);
    for (UUID livro : livros) {
      jdbc.update(
          "INSERT INTO acervo.livro_assunto (livro_id, assunto_id) VALUES (?, ?)", livro, id);
    }
    return id;
  }

  public void naEstante(UUID usuario, UUID livro, String status) {
    jdbc.update(
        "INSERT INTO leitura.estante (usuario_id, livro_id, status) VALUES (?, ?, ?)",
        usuario,
        livro,
        status);
  }

  /** Leitura concluída, com nota quando {@code nota} não é nula. */
  public void leu(UUID usuario, UUID livro, String nota) {
    jdbc.update(
        "INSERT INTO leitura.estante (usuario_id, livro_id, status, vezes_lido)"
            + " VALUES (?, ?, 'lido', 1)",
        usuario,
        livro);
    if (nota != null) {
      jdbc.update(
          "INSERT INTO leitura.nota (usuario_id, livro_id, valor) VALUES (?, ?, ?::numeric)",
          usuario,
          livro,
          nota);
    }
  }

  public long contar(String sql, Object... parametros) {
    return base.contar(sql, parametros);
  }
}
