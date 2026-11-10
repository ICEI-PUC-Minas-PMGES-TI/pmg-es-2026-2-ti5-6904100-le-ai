package br.com.leai.social.recomendacao.repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Sugestões algorítmicas (F-REC-ALG), calculadas em tempo de consulta (REQUISITOS §10.7): não há
 * tabela de similaridade, só {@code sugestao_descartada}. Tudo o que vem de outro schema entra por
 * VIEW de contrato.
 *
 * <p>As duas consultas escolhem primeiro os ids (com as exclusões de RF-REC-10 e a página) e só
 * depois buscam título, autor e capa: a VIEW do acervo monta o autor por subconsulta, e isso não
 * pode rodar para cada candidato.
 */
@Repository
public class SugestaoRepository {

  /** RF-REC-10/12: fora o que já está na estante do leitor, em qualquer status, e o descartado. */
  private static final String FORA_ESTANTE_E_DESCARTADOS =
      """
      NOT EXISTS (SELECT 1 FROM leitura.v_estante_publica_v1 minha
                   WHERE minha.usuario_id = :eu AND minha.livro_id = c.livro_id)
      AND NOT EXISTS (SELECT 1 FROM sugestao_descartada d
                       WHERE d.usuario_id = :eu AND d.livro_id = c.livro_id)
      """;

  /** Uma linha por livro: a VIEW tem uma por livro-assunto. */
  private static final String EXIBICAO =
      """
      JOIN LATERAL (
        SELECT v.titulo, v.autor_exibicao, v.capa_resolvida
          FROM acervo.v_livro_recomendacao_v1 v
         WHERE v.livro_id = x.livro_id
         LIMIT 1
      ) r ON true
      """;

  /**
   * RF-REC-09. O sinal é a leitura concluída de quem o leitor segue com seguimento aceito, o que
   * satisfaz a RN-08 por construção. Sai do sinal quem pediu opt-out, e a VIEW de perfil já omite
   * conta suspensa ou em exclusão. A VIEW de recomendação só tem livro oficial ativo, então livro
   * pessoal nunca entra (RN-15, RNF-SEC-06).
   */
  private static final String SEGUIDOS =
      """
      WITH sinal AS (
        SELECT e.livro_id, count(*) AS leitores, avg(n.valor) AS media
          FROM identidade.v_seguimento_aceito_v1 sg
          JOIN identidade.v_perfil_referencia_v1 p
            ON p.id = sg.seguido_id AND NOT p.opt_out_recomendacao
          JOIN leitura.v_estante_publica_v1 e
            ON e.usuario_id = sg.seguido_id AND (e.status = 'lido' OR e.vezes_lido > 0)
          LEFT JOIN leitura.v_nota_publicacao_v1 n
            ON n.usuario_id = e.usuario_id AND n.livro_id = e.livro_id
         WHERE sg.seguidor_id = :eu
         GROUP BY e.livro_id
        HAVING count(*) >= :minimoDeLeitores AND avg(n.valor) >= :notaMediaMinima
      ),
      x AS (
        SELECT c.livro_id, c.leitores, c.media
          FROM sinal c
         WHERE EXISTS (SELECT 1 FROM acervo.v_livro_recomendacao_v1 v WHERE v.livro_id = c.livro_id)
           AND %s
         ORDER BY c.leitores DESC, c.media DESC, c.livro_id
         LIMIT :limite OFFSET :deslocamento
      )
      SELECT x.livro_id, r.titulo, r.autor_exibicao, r.capa_resolvida,
             'SEGUIDOS' AS tipo, x.leitores AS quantidade, NULL::text AS referencia
        FROM x
        %s
       ORDER BY x.leitores DESC, x.media DESC, x.livro_id
      """
          .formatted(FORA_ESTANTE_E_DESCARTADOS, EXIBICAO);

  /**
   * RF-REC-08. O gosto sai da estante do próprio leitor (menos o abandonado): séries, autores e os
   * assuntos mais frequentes. Cada livro fica com o motivo mais forte (série, autor, assunto), e é
   * esse motivo que ordena, para o texto exibido ser o critério que trouxe o livro (RF-REC-11).
   */
  private static final String GOSTO =
      """
      WITH minha AS (
        SELECT e.livro_id FROM leitura.v_estante_publica_v1 e
         WHERE e.usuario_id = :eu AND e.status <> 'abandonado'
      ),
      series AS (
        SELECT DISTINCT v.serie_id, v.serie_nome
          FROM minha m JOIN acervo.v_livro_recomendacao_v1 v ON v.livro_id = m.livro_id
         WHERE v.serie_id IS NOT NULL
      ),
      autores AS (
        SELECT la.autor_id, min(t.titulo) AS titulo
          FROM minha m
          JOIN acervo.v_livro_autor_recomendacao_v1 la ON la.livro_id = m.livro_id
          JOIN LATERAL (
            SELECT v.titulo FROM acervo.v_livro_recomendacao_v1 v
             WHERE v.livro_id = m.livro_id LIMIT 1
          ) t ON true
         GROUP BY la.autor_id
      ),
      assuntos AS (
        SELECT v.assunto_id, v.assunto_nome, count(*) AS frequencia
          FROM minha m JOIN acervo.v_livro_recomendacao_v1 v ON v.livro_id = m.livro_id
         WHERE v.assunto_id IS NOT NULL
         GROUP BY v.assunto_id, v.assunto_nome
        HAVING count(*) >= :minimoPorAssunto
         ORDER BY count(*) DESC, v.assunto_nome
         LIMIT :assuntosConsiderados
      ),
      candidatos AS (
        SELECT v.livro_id, 3 AS prioridade, 0::bigint AS peso, 'SERIE' AS tipo,
               s.serie_nome AS referencia
          FROM series s JOIN acervo.v_livro_recomendacao_v1 v ON v.serie_id = s.serie_id
        UNION ALL
        SELECT la.livro_id, 2, 0::bigint, 'AUTOR', a.titulo
          FROM autores a
          JOIN acervo.v_livro_autor_recomendacao_v1 la ON la.autor_id = a.autor_id
        UNION ALL
        SELECT v.livro_id, 1, s.frequencia, 'ASSUNTO', s.assunto_nome
          FROM assuntos s JOIN acervo.v_livro_recomendacao_v1 v ON v.assunto_id = s.assunto_id
      ),
      melhores AS (
        SELECT DISTINCT ON (c.livro_id) c.livro_id, c.prioridade, c.peso, c.tipo, c.referencia
          FROM candidatos c
         WHERE %s
         ORDER BY c.livro_id, c.prioridade DESC, c.peso DESC, c.referencia
      ),
      x AS (
        SELECT * FROM melhores
         ORDER BY prioridade DESC, peso DESC, livro_id
         LIMIT :limite OFFSET :deslocamento
      )
      SELECT x.livro_id, r.titulo, r.autor_exibicao, r.capa_resolvida,
             x.tipo, NULL::bigint AS quantidade, x.referencia
        FROM x
        %s
       ORDER BY x.prioridade DESC, x.peso DESC, x.livro_id
      """
          .formatted(FORA_ESTANTE_E_DESCARTADOS, EXIBICAO);

  private final JdbcTemplate jdbc;
  private final NamedParameterJdbcTemplate nomeado;

  public SugestaoRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
    this.nomeado = new NamedParameterJdbcTemplate(jdbc);
  }

  public List<Sugestao> lidosPorQuemSigo(
      UUID leitorId, int minimoDeLeitores, BigDecimal notaMediaMinima, int limite, int deslocamento) {
    return nomeado.query(
        SEGUIDOS,
        new MapSqlParameterSource()
            .addValue("eu", leitorId)
            .addValue("minimoDeLeitores", minimoDeLeitores)
            .addValue("notaMediaMinima", notaMediaMinima)
            .addValue("limite", limite)
            .addValue("deslocamento", deslocamento),
        (rs, n) -> sugestaoDe(rs));
  }

  public List<Sugestao> doMeuGosto(
      UUID leitorId, int minimoPorAssunto, int assuntosConsiderados, int limite, int deslocamento) {
    return nomeado.query(
        GOSTO,
        new MapSqlParameterSource()
            .addValue("eu", leitorId)
            .addValue("minimoPorAssunto", minimoPorAssunto)
            .addValue("assuntosConsiderados", assuntosConsiderados)
            .addValue("limite", limite)
            .addValue("deslocamento", deslocamento),
        (rs, n) -> sugestaoDe(rs));
  }

  /** Só livro oficial ativo vira sugestão; o resto não tem o que descartar. */
  public boolean sugerivel(UUID livroId) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM acervo.v_livro_referencia_v1"
                + " WHERE livro_id = ? AND tipo = 'oficial' AND ativo)",
            Boolean.class,
            livroId));
  }

  /** RF-REC-12: a unicidade (usuario, livro) faz da repetição um no-op. */
  public void descartar(UUID leitorId, UUID livroId) {
    jdbc.update(
        "INSERT INTO sugestao_descartada (usuario_id, livro_id) VALUES (?, ?)"
            + " ON CONFLICT (usuario_id, livro_id) DO NOTHING",
        leitorId,
        livroId);
  }

  private static Sugestao sugestaoDe(ResultSet rs) throws SQLException {
    long quantidade = rs.getLong("quantidade");
    return new Sugestao(
        rs.getObject("livro_id", UUID.class),
        rs.getString("titulo"),
        rs.getString("autor_exibicao"),
        rs.getString("capa_resolvida"),
        rs.getString("tipo"),
        rs.wasNull() ? null : quantidade,
        rs.getString("referencia"));
  }

  /** {@code tipo}: SEGUIDOS (com {@code quantidade}) ou SERIE, AUTOR e ASSUNTO (com {@code referencia}). */
  public record Sugestao(
      UUID livroId,
      String titulo,
      String autor,
      String capaUrl,
      String tipo,
      Long quantidade,
      String referencia) {}
}
