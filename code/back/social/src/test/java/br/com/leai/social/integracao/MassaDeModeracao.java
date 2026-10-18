package br.com.leai.social.integracao;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Massa da F-MOD: as VIEWs de {@code identidade} e {@code acervo} vêm de {@link
 * MassaDeRecomendacao}; aqui entram as de {@code leitura} (resenha e nota) e as linhas do próprio
 * {@code social}. As VIEWs repetem coluna a coluna as de {@code ServicoDeFeedIntegracaoTest}, porque
 * o contexto do Spring é compartilhado e {@code CREATE OR REPLACE VIEW} não remove colunas.
 */
public final class MassaDeModeracao {

  private final JdbcTemplate jdbc;
  private final MassaDeRecomendacao base;

  public MassaDeModeracao(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
    this.base = new MassaDeRecomendacao(jdbc);
  }

  public void preparar() {
    base.preparar();
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS leitura.resenha (
          id uuid PRIMARY KEY,
          usuario_id uuid NOT NULL,
          livro_id uuid NOT NULL,
          texto text NOT NULL,
          spoiler boolean NOT NULL DEFAULT false,
          criado_em timestamptz NOT NULL DEFAULT now(),
          atualizado_em timestamptz NOT NULL DEFAULT now()
        )
        """);
    jdbc.execute(
        """
        CREATE TABLE IF NOT EXISTS leitura.reacao_resenha (
          id uuid PRIMARY KEY,
          resenha_id uuid NOT NULL,
          usuario_id uuid NOT NULL,
          tipo text NOT NULL,
          ativa boolean NOT NULL DEFAULT true
        )
        """);
    jdbc.execute(
        """
        CREATE OR REPLACE VIEW leitura.v_resenha_publicacao_v1 AS (
          SELECT
            r.id AS resenha_id,
            r.usuario_id,
            r.livro_id,
            r.texto,
            r.spoiler,
            r.criado_em,
            r.atualizado_em,
            count(rr.id) FILTER (WHERE rr.ativa AND rr.tipo = 'curtida') AS curtidas,
            count(rr.id) FILTER (WHERE rr.ativa AND rr.tipo = 'descurtida') AS descurtidas
          FROM leitura.resenha r
          LEFT JOIN leitura.reacao_resenha rr ON rr.resenha_id = r.id
          GROUP BY r.id
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
    jdbc.execute("TRUNCATE leitura.resenha, leitura.reacao_resenha, leitura.nota");
    jdbc.execute("TRUNCATE log_moderacao, denuncia, atividade, lista, idempotencia_social CASCADE");
  }

  public UUID leitor(String username) {
    return base.leitor(username);
  }

  public UUID leitorPrivado(String username) {
    UUID id = base.leitor(username);
    jdbc.update("UPDATE identidade.usuario SET privacidade = 'privado' WHERE id = ?", id);
    return id;
  }

  /** Conta em exclusão: some de {@code v_perfil_referencia_v1} e do seguimento. */
  public void emExclusao(UUID usuario) {
    jdbc.update("UPDATE identidade.usuario SET exclusao_solicitada_em = now() WHERE id = ?", usuario);
  }

  public void segue(UUID seguidor, UUID seguido) {
    base.segue(seguidor, seguido);
  }

  public UUID livroOficial(String titulo) {
    return base.livroOficial(titulo);
  }

  public UUID livroPessoal(UUID dono, String titulo) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO acervo.livro (id, tipo, dono_id, titulo, autor_informado)"
            + " VALUES (?, 'pessoal', ?, ?, 'Autora')",
        id,
        dono,
        titulo);
    return id;
  }

  public void desativarLivro(UUID livro) {
    jdbc.update("UPDATE acervo.livro SET ativo = false WHERE id = ?", livro);
  }

  public UUID resenha(UUID autor, UUID livro, String texto) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO leitura.resenha (id, usuario_id, livro_id, texto) VALUES (?, ?, ?, ?)",
        id,
        autor,
        livro,
        texto);
    return id;
  }

  public void nota(UUID autor, UUID livro, String valor) {
    jdbc.update(
        "INSERT INTO leitura.nota (usuario_id, livro_id, valor) VALUES (?, ?, ?::numeric)",
        autor,
        livro,
        valor);
  }

  public void apagarResenha(UUID resenha) {
    jdbc.update("DELETE FROM leitura.resenha WHERE id = ?", resenha);
  }

  /** Atividade de {@code resenha_publicada}, como a que o consumidor de feed cria. */
  public UUID atividadeDeResenha(UUID autor, UUID livro, UUID resenha) {
    return atividade(autor, livro, "resenha_publicada", "resenha", resenha);
  }

  public UUID atividadeDeLeitura(UUID autor, UUID livro) {
    return atividade(autor, livro, "leitura_iniciada", "leitura", UUID.randomUUID());
  }

  private UUID atividade(UUID autor, UUID livro, String tipo, String origemTipo, UUID origemId) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO atividade (id, autor_id, tipo, livro_id, event_id, chave_fato, origem_tipo,"
            + " origem_id, snap_usuario_nome, snap_usuario_username, snap_livro_titulo,"
            + " snap_livro_autor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Nome', 'nome', 'Livro', 'Autor')",
        id,
        autor,
        tipo,
        livro,
        UUID.randomUUID(),
        "fato:" + id,
        origemTipo,
        origemId);
    return id;
  }

  public UUID comentario(UUID atividade, UUID autor, UUID raiz, String texto) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO comentario (id, atividade_id, autor_id, comentario_raiz_id, texto)"
            + " VALUES (?, ?, ?, ?, ?)",
        id,
        atividade,
        autor,
        raiz,
        texto);
    return id;
  }

  public UUID lista(UUID dono, UUID livro) {
    UUID id =
        jdbc.queryForObject(
            "INSERT INTO lista (usuario_id, titulo) VALUES (?, 'Favoritos') RETURNING id",
            UUID.class,
            dono);
    jdbc.update(
        "INSERT INTO lista_item (lista_id, livro_id, ordem) VALUES (?, ?, 1)", id, livro);
    return id;
  }

  public long contar(String sql, Object... parametros) {
    return base.contar(sql, parametros);
  }
}
