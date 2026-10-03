package br.com.leai.social.notificacao.repository;

import br.com.leai.social.notificacao.model.DadosDeNotificacao;
import br.com.leai.social.notificacao.model.Notificacao;
import br.com.leai.social.notificacao.model.NovaNotificacao;
import br.com.leai.social.notificacao.model.TipoNotificacao;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * Acesso a {@code social.notificacao} por SQL parametrizado (RNF-SEC-12), e não por JPA: a
 * gravação precisa de {@code ON CONFLICT DO NOTHING} sobre as duas unicidades da tabela ({@code
 * event_id} e {@code (destinatario_id, tipo, chave_negocio)}), e uma violação de constraint dentro
 * da transação do consumidor abortaria também o recibo de {@code mensagem_processada}. O snapshot
 * {@code dados} é {@code jsonb}.
 *
 * <p>Toda leitura e escrita por destinatário filtra por {@code destinatario_id} (RNF-SEC-02).
 */
@Repository
public class NotificacaoRepository {

  private static final TypeReference<Map<String, Object>> TIPO_DADOS = new TypeReference<>() {};

  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  public NotificacaoRepository(JdbcTemplate jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  /** Grava a notificação; vazio quando o mesmo evento ou o mesmo fato já foi gravado. */
  public Optional<UUID> inserir(NovaNotificacao nova) {
    return jdbc
        .query(
            """
            INSERT INTO notificacao
              (destinatario_id, tipo, dados, leitura_ref, event_id, chave_negocio)
            VALUES (?, ?, ?::jsonb, ?, ?, ?)
            ON CONFLICT DO NOTHING
            RETURNING id
            """,
            (rs, linha) -> rs.getObject("id", UUID.class),
            nova.destinatarioId(),
            nova.tipo().literal(),
            objectMapper.writeValueAsString(nova.dados()),
            nova.leituraRef(),
            nova.eventId(),
            nova.chaveNegocio())
        .stream()
        .findFirst();
  }

  /**
   * Contexto da atividade alvo de curtida/comentário/resposta, lido da tabela do próprio {@code
   * social} no consumo: tipo, título do livro e autor, para a frase da notificação.
   */
  public Optional<Map<String, Object>> contextoDaAtividade(UUID atividadeId) {
    return jdbc
        .query(
            "SELECT tipo, snap_livro_titulo, autor_id, snap_usuario_nome FROM atividade WHERE id = ?",
            (rs, linha) -> {
              Map<String, Object> contexto = new LinkedHashMap<>();
              contexto.put(DadosDeNotificacao.ATIVIDADE_TIPO, rs.getString("tipo"));
              contexto.put(
                  DadosDeNotificacao.ATIVIDADE_LIVRO_TITULO, rs.getString("snap_livro_titulo"));
              contexto.put(
                  DadosDeNotificacao.ATIVIDADE_AUTOR_ID,
                  rs.getObject("autor_id", UUID.class).toString());
              contexto.put(
                  DadosDeNotificacao.ATIVIDADE_AUTOR_NOME, rs.getString("snap_usuario_nome"));
              return contexto;
            },
            atividadeId)
        .stream()
        .findFirst();
  }

  /** Página em ordem cronológica decrescente, com {@code id} como desempate estável. */
  public List<Notificacao> listar(UUID destinatarioId, int pagina, int tamanho) {
    return jdbc.query(
        """
        SELECT id, tipo, dados, leitura_ref, lida_em, criado_em
          FROM notificacao
         WHERE destinatario_id = ?
         ORDER BY criado_em DESC, id DESC
         LIMIT ? OFFSET ?
        """,
        this::mapear,
        destinatarioId,
        tamanho,
        (long) pagina * tamanho);
  }

  public Optional<Notificacao> buscar(UUID destinatarioId, UUID id) {
    return jdbc
        .query(
            """
            SELECT id, tipo, dados, leitura_ref, lida_em, criado_em
              FROM notificacao
             WHERE destinatario_id = ? AND id = ?
            """,
            this::mapear,
            destinatarioId,
            id)
        .stream()
        .findFirst();
  }

  public long contar(UUID destinatarioId) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notificacao WHERE destinatario_id = ?", Long.class, destinatarioId);
  }

  public long contarNaoLidas(UUID destinatarioId) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notificacao WHERE destinatario_id = ? AND lida_em IS NULL",
        Long.class,
        destinatarioId);
  }

  /** Quantos dos {@code ids} pertencem ao destinatário, lidos ou não. */
  public int contarDoDestinatario(UUID destinatarioId, Collection<UUID> ids) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM notificacao WHERE destinatario_id = ? AND id IN ("
            + marcadores(ids)
            + ")",
        Integer.class,
        parametros(destinatarioId, ids));
  }

  /** Marca como lidas as ainda não lidas entre {@code ids}; já lidas ficam como estão. */
  public int marcarLidas(UUID destinatarioId, Collection<UUID> ids) {
    return jdbc.update(
        "UPDATE notificacao SET lida_em = now()"
            + " WHERE destinatario_id = ? AND lida_em IS NULL AND id IN ("
            + marcadores(ids)
            + ")",
        parametros(destinatarioId, ids));
  }

  public int marcarTodasLidas(UUID destinatarioId) {
    return jdbc.update(
        "UPDATE notificacao SET lida_em = now() WHERE destinatario_id = ? AND lida_em IS NULL",
        destinatarioId);
  }

  /**
   * Quem, entre {@code usuarioIds}, ainda é um perfil visível: {@code
   * identidade.v_perfil_referencia_v1} já exclui conta suspensa ou em exclusão.
   */
  public Set<UUID> atoresVisiveis(Collection<UUID> usuarioIds) {
    return idsExistentes(
        "SELECT id FROM identidade.v_perfil_referencia_v1 WHERE id IN (", usuarioIds);
  }

  /** Atividades que ainda existem (resenha excluída remove a atividade fisicamente). */
  public Set<UUID> atividadesExistentes(Collection<UUID> atividadeIds) {
    return idsExistentes("SELECT id FROM atividade WHERE id IN (", atividadeIds);
  }

  private Set<UUID> idsExistentes(String consultaAteIn, Collection<UUID> ids) {
    if (ids.isEmpty()) {
      return Set.of();
    }
    return new HashSet<>(
        jdbc.query(
            consultaAteIn + marcadores(ids) + ")",
            (rs, linha) -> rs.getObject("id", UUID.class),
            ids.toArray()));
  }

  private Notificacao mapear(ResultSet rs, int linha) throws SQLException {
    return new Notificacao(
        rs.getObject("id", UUID.class),
        TipoNotificacao.deLiteral(rs.getString("tipo")),
        objectMapper.readValue(rs.getString("dados"), TIPO_DADOS),
        rs.getObject("leitura_ref", UUID.class),
        instante(rs.getTimestamp("lida_em")),
        instante(rs.getTimestamp("criado_em")));
  }

  private static Instant instante(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toInstant();
  }

  private static String marcadores(Collection<UUID> ids) {
    return String.join(", ", Collections.nCopies(ids.size(), "?"));
  }

  private static Object[] parametros(UUID destinatarioId, Collection<UUID> ids) {
    Object[] parametros = new Object[ids.size() + 1];
    parametros[0] = destinatarioId;
    int i = 1;
    for (UUID id : ids) {
      parametros[i++] = id;
    }
    return parametros;
  }
}
