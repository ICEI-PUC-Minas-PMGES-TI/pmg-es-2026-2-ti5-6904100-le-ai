package br.com.leai.social.recomendacao.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Acesso a {@code social.recomendacao} e às VIEWs de outros serviços que as regras de RN-22
 * consultam: {@code identidade.v_seguimento_aceito_v1} (mútuo), {@code
 * identidade.v_perfil_referencia_v1} (remetente), {@code acervo.v_livro_referencia_v1} (livro) e
 * {@code leitura.v_estante_publica_v1} (destinatário já tem o livro). Nenhuma tabela crua de outro
 * schema é lida.
 *
 * <p>Ativa é a recomendação com {@code expira_em > now()}: a expiração vale pela consulta, antes da
 * remoção física (RN-22.9).
 */
@Repository
public class RecomendacaoRepository {

  private static final String MUTUO =
      """
      identidade.v_seguimento_aceito_v1 ida
      JOIN identidade.v_seguimento_aceito_v1 volta
        ON volta.seguidor_id = ida.seguido_id AND volta.seguido_id = ida.seguidor_id
      """;

  private static final String RECEBIDAS =
      " FROM recomendacao r"
          + " JOIN identidade.v_perfil_referencia_v1 p ON p.id = r.remetente_id"
          + " JOIN acervo.v_livro_referencia_v1 l ON l.livro_id = r.livro_id AND l.ativo"
          + " WHERE r.destinatario_id = ? AND r.expira_em > now()";

  private final JdbcTemplate jdbc;

  public RecomendacaoRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** Livro ativo no acervo; ausente quando não existe ou foi desativado. */
  public Optional<LivroDeReferencia> livro(UUID livroId) {
    return jdbc
        .query(
            "SELECT livro_id, tipo, titulo, autor_exibicao, capa_resolvida"
                + " FROM acervo.v_livro_referencia_v1 WHERE livro_id = ? AND ativo",
            (rs, n) -> livroDe(rs),
            livroId)
        .stream()
        .findFirst();
  }

  /** Dos leitores informados, os que têm seguimento mútuo com o remetente (RN-22.1). */
  public Set<UUID> mutuos(UUID remetenteId, Collection<UUID> leitores) {
    return ids(
        "SELECT ida.seguido_id FROM " + MUTUO
            + " WHERE ida.seguidor_id = ? AND ida.seguido_id IN (" + placeholders(leitores) + ")",
        remetenteId,
        leitores);
  }

  /** Dos leitores informados, os que já têm o livro na estante em qualquer status (RN-22.3). */
  public Set<UUID> comLivroNaEstante(UUID livroId, Collection<UUID> leitores) {
    return ids(
        "SELECT usuario_id FROM leitura.v_estante_publica_v1"
            + " WHERE livro_id = ? AND usuario_id IN (" + placeholders(leitores) + ")",
        livroId,
        leitores);
  }

  /** Dos leitores informados, os que já têm recomendação ativa deste livro vinda do remetente. */
  public Set<UUID> jaRecomendados(UUID remetenteId, UUID livroId, Collection<UUID> leitores) {
    List<Object> parametros = new ArrayList<>(List.of(remetenteId, livroId));
    parametros.addAll(leitores);
    return new HashSet<>(
        jdbc.queryForList(
            "SELECT destinatario_id FROM recomendacao"
                + " WHERE remetente_id = ? AND livro_id = ? AND expira_em > now()"
                + " AND destinatario_id IN (" + placeholders(leitores) + ")",
            UUID.class,
            parametros.toArray()));
  }

  /** Recomendações ativas do remetente para cada destinatário informado (RN-22.4). */
  public Map<UUID, Long> ativasPorDestinatario(UUID remetenteId, Collection<UUID> leitores) {
    List<Object> parametros = new ArrayList<>(List.of(remetenteId));
    parametros.addAll(leitores);
    return jdbc.query(
        "SELECT destinatario_id, count(*) AS total FROM recomendacao"
            + " WHERE remetente_id = ? AND expira_em > now()"
            + " AND destinatario_id IN (" + placeholders(leitores) + ")"
            + " GROUP BY destinatario_id",
        rs -> {
          Map<UUID, Long> mapa = new HashMap<>();
          while (rs.next()) {
            mapa.put(rs.getObject("destinatario_id", UUID.class), rs.getLong("total"));
          }
          return mapa;
        },
        parametros.toArray());
  }

  /**
   * Serializa envios concorrentes do mesmo remetente até o fim da transação, para que a contagem
   * do limite e a checagem de recomendação repetida não sejam furadas por duas requisições ao mesmo
   * tempo (o limite é por par e o remetente é o mesmo em todos os pares do envio).
   */
  public void travarRemetente(UUID remetenteId) {
    jdbc.queryForList(
        "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", "recomendacao:" + remetenteId);
  }

  public void inserir(
      UUID id, UUID remetenteId, UUID destinatarioId, UUID livroId, String mensagem, UUID eventId) {
    jdbc.update(
        "INSERT INTO recomendacao (id, remetente_id, destinatario_id, livro_id, mensagem, event_id)"
            + " VALUES (?, ?, ?, ?, ?, ?)",
        id,
        remetenteId,
        destinatarioId,
        livroId,
        mensagem,
        eventId);
  }

  /**
   * Mútuos do remetente com a situação de cada um para o livro, em ordem de nome. O teto protege a
   * resposta; seguimento mútuo é pequeno por natureza.
   */
  public List<Candidato> candidatos(UUID remetenteId, UUID livroId, int limiteDoPar, int teto) {
    return jdbc.query(
        "SELECT p.id, p.username::text AS username, p.nome_exibicao, p.avatar_url,"
            + " EXISTS (SELECT 1 FROM leitura.v_estante_publica_v1 e"
            + "          WHERE e.usuario_id = p.id AND e.livro_id = ?) AS ja_tem_livro,"
            + " (SELECT count(*) FROM recomendacao r"
            + "   WHERE r.remetente_id = ida.seguidor_id AND r.destinatario_id = p.id"
            + "     AND r.expira_em > now()) >= ? AS limite_atingido"
            + " FROM " + MUTUO
            + " JOIN identidade.v_perfil_referencia_v1 p ON p.id = ida.seguido_id"
            + " WHERE ida.seguidor_id = ?"
            + " ORDER BY p.nome_exibicao, p.username::text, p.id"
            + " LIMIT ?",
        (rs, n) ->
            new Candidato(
                perfilDe(rs, "id"),
                rs.getBoolean("ja_tem_livro"),
                rs.getBoolean("limite_atingido")),
        livroId,
        limiteDoPar,
        remetenteId,
        teto);
  }

  /**
   * Recebidas ativas do destinatário, da mais recente para a mais antiga. Remetente fora de {@code
   * v_perfil_referencia_v1} (suspenso ou em exclusão) e livro desativado saem da lista.
   */
  public List<Recebida> recebidas(UUID destinatarioId, int pagina, int tamanho) {
    return jdbc.query(
        "SELECT r.id, r.mensagem, r.criado_em, r.expira_em,"
            + " p.id AS remetente_id, p.username::text AS username, p.nome_exibicao, p.avatar_url,"
            + " l.livro_id, l.tipo, l.titulo, l.autor_exibicao, l.capa_resolvida"
            + RECEBIDAS
            + " ORDER BY r.criado_em DESC, r.id DESC LIMIT ? OFFSET ?",
        (rs, n) ->
            new Recebida(
                rs.getObject("id", UUID.class),
                perfilDe(rs, "remetente_id"),
                livroDe(rs),
                rs.getString("mensagem"),
                instante(rs, "criado_em"),
                instante(rs, "expira_em")),
        destinatarioId,
        tamanho,
        (long) pagina * tamanho);
  }

  public long contarRecebidas(UUID destinatarioId) {
    return jdbc.queryForObject("SELECT count(*)" + RECEBIDAS, Long.class, destinatarioId);
  }

  /** Descarte pelo destinatário (RN-22.11): só remove a recomendação ativa que é dele. */
  public boolean removerDoDestinatario(UUID recomendacaoId, UUID destinatarioId) {
    return jdbc.update(
            "DELETE FROM recomendacao WHERE id = ? AND destinatario_id = ? AND expira_em > now()",
            recomendacaoId,
            destinatarioId)
        > 0;
  }

  /** Adição à estante (RN-22.10): remove todas as recomendações do livro recebidas pelo leitor. */
  public int removerDoLivroNaEstante(UUID destinatarioId, UUID livroId) {
    return jdbc.update(
        "DELETE FROM recomendacao WHERE destinatario_id = ? AND livro_id = ?",
        destinatarioId,
        livroId);
  }

  /** Expiração (RN-22.9): remove fisicamente até {@code lote} recomendações já vencidas. */
  public int removerExpiradas(int lote) {
    return jdbc.update(
        "DELETE FROM recomendacao WHERE id IN ("
            + " SELECT id FROM recomendacao WHERE expira_em <= now() LIMIT ?)",
        lote);
  }

  /**
   * Reconciliação de RN-22.10: remove até {@code lote} recomendações cujo livro já está na estante
   * do destinatário. Cobre o que o consumidor de {@code livro.adicionado_a_estante} não viu, como o
   * intervalo antes de a fila existir.
   */
  public int removerJaNaEstante(int lote) {
    return jdbc.update(
        "DELETE FROM recomendacao WHERE id IN ("
            + " SELECT r.id FROM recomendacao r"
            + " JOIN leitura.v_estante_publica_v1 e"
            + "   ON e.usuario_id = r.destinatario_id AND e.livro_id = r.livro_id"
            + " LIMIT ?)",
        lote);
  }

  private Set<UUID> ids(String sql, UUID primeiro, Collection<UUID> leitores) {
    Object[] parametros = Stream.concat(Stream.of(primeiro), leitores.stream()).toArray();
    return new HashSet<>(jdbc.queryForList(sql, UUID.class, parametros));
  }

  private static LivroDeReferencia livroDe(ResultSet rs) throws SQLException {
    return new LivroDeReferencia(
        rs.getObject("livro_id", UUID.class),
        rs.getString("tipo"),
        rs.getString("titulo"),
        rs.getString("autor_exibicao"),
        rs.getString("capa_resolvida"));
  }

  private static Perfil perfilDe(ResultSet rs, String colunaId) throws SQLException {
    return new Perfil(
        rs.getObject(colunaId, UUID.class),
        rs.getString("username"),
        rs.getString("nome_exibicao"),
        rs.getString("avatar_url"));
  }

  private static Instant instante(ResultSet rs, String coluna) throws SQLException {
    return rs.getTimestamp(coluna).toInstant();
  }

  private static String placeholders(Collection<?> valores) {
    return String.join(", ", Collections.nCopies(valores.size(), "?"));
  }

  public record LivroDeReferencia(
      UUID id, String tipo, String titulo, String autor, String capaUrl) {

    public static final String TIPO_PESSOAL = "pessoal";

    public boolean pessoal() {
      return TIPO_PESSOAL.equals(tipo);
    }
  }

  public record Perfil(UUID id, String username, String nomeExibicao, String avatarUrl) {}

  public record Candidato(Perfil leitor, boolean jaTemLivro, boolean limiteAtingido) {}

  public record Recebida(
      UUID id,
      Perfil remetente,
      LivroDeReferencia livro,
      String mensagem,
      Instant criadoEm,
      Instant expiraEm) {}
}
