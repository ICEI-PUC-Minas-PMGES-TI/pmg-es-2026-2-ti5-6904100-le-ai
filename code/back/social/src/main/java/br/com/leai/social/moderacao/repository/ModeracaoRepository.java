package br.com.leai.social.moderacao.repository;

import br.com.leai.social.feed.repository.CursorComentario;
import br.com.leai.social.moderacao.dto.LivroDaDenuncia;
import br.com.leai.social.moderacao.dto.PessoaDaModeracao;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/**
 * Leituras e escritas do painel de moderação (F-MOD). As outras pessoas, livros e resenhas vêm
 * pelas VIEWs de contrato (AGENTS.md §3); denúncia, log, comentário e atividade são do próprio
 * {@code social}.
 *
 * <p>Os cursores reaproveitam {@link CursorComentario}: é o mesmo par {@code (criadoEm, id)}.
 */
@Repository
public class ModeracaoRepository {

  /** Linha de {@code denuncia} com o contexto gravado na criação. */
  public record Denuncia(
      UUID id,
      UUID denuncianteId,
      String alvoTipo,
      UUID alvoId,
      String motivo,
      String estado,
      Instant criadoEm,
      UUID alvoAutorId,
      UUID alvoLivroId,
      UUID atividadeId,
      UUID atividadeAutorId,
      boolean remocaoSolicitada) {}

  public record Comentario(String texto, Instant criadoEm, int respostas) {}

  public record Resenha(
      UUID autorId, UUID livroId, String texto, boolean spoiler, Instant publicadoEm) {}

  public record Atividade(UUID id, UUID autorId, String tipo, String autorNome, String livroTitulo) {}

  public record Registro(
      UUID id,
      Instant criadoEm,
      String acao,
      String alvoTipo,
      boolean comDenuncia,
      UUID alvoAutorId,
      UUID atividadeAutorId,
      UUID alvoLivroId,
      boolean anonimizado) {}

  private static final String COLUNAS_DA_DENUNCIA =
      "d.id, d.denunciante_id, d.alvo_tipo, d.alvo_id, d.motivo, d.estado, d.criado_em,"
          + " d.alvo_autor_id, d.alvo_livro_id, d.atividade_id, d.atividade_autor_id,"
          + " EXISTS (SELECT 1 FROM denuncia m WHERE m.alvo_tipo = d.alvo_tipo"
          + " AND m.alvo_id = d.alvo_id AND m.estado = 'pendente'"
          + " AND m.remocao_solicitada_em IS NOT NULL) AS remocao_solicitada";

  private static final RowMapper<Denuncia> DENUNCIA = ModeracaoRepository::denuncia;

  private final JdbcTemplate jdbc;

  public ModeracaoRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  // ------------------------------------------------------------------ fila

  /** Pendentes da mais antiga para a mais recente, a partir do cursor; uma a mais para o temMais. */
  public List<Denuncia> pendentes(CursorComentario depoisDe, int limite) {
    if (depoisDe == null) {
      return jdbc.query(
          "SELECT " + COLUNAS_DA_DENUNCIA + " FROM denuncia d WHERE d.estado = 'pendente'"
              + " ORDER BY d.criado_em, d.id LIMIT ?",
          DENUNCIA,
          limite + 1);
    }
    return jdbc.query(
        "SELECT " + COLUNAS_DA_DENUNCIA + " FROM denuncia d WHERE d.estado = 'pendente'"
            + " AND (d.criado_em, d.id) > (?, ?) ORDER BY d.criado_em, d.id LIMIT ?",
        DENUNCIA,
        Timestamp.from(depoisDe.criadoEm()),
        depoisDe.id(),
        limite + 1);
  }

  public Optional<Denuncia> denuncia(UUID id) {
    return jdbc.query("SELECT " + COLUNAS_DA_DENUNCIA + " FROM denuncia d WHERE d.id = ?", DENUNCIA, id)
        .stream()
        .findFirst();
  }

  /** A denúncia travada até o fim da transação: duas ações sobre ela não se cruzam. */
  public Optional<Denuncia> travar(UUID id) {
    return jdbc.query(
            "SELECT " + COLUNAS_DA_DENUNCIA + " FROM denuncia d WHERE d.id = ? FOR UPDATE OF d",
            DENUNCIA,
            id)
        .stream()
        .findFirst();
  }

  public Map<UUID, PessoaDaModeracao> perfis(Collection<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, PessoaDaModeracao> perfis = new HashMap<>();
    jdbc.query(
        "SELECT id, username, nome_exibicao, avatar_url FROM identidade.v_perfil_referencia_v1"
            + " WHERE id IN (" + marcadores(ids.size()) + ")",
        rs -> {
          UUID id = rs.getObject("id", UUID.class);
          perfis.put(
              id,
              new PessoaDaModeracao(
                  id.toString(),
                  rs.getString("username"),
                  rs.getString("nome_exibicao"),
                  rs.getString("avatar_url")));
        },
        ids.toArray());
    return perfis;
  }

  public Map<UUID, LivroDaDenuncia> livros(Collection<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, LivroDaDenuncia> livros = new HashMap<>();
    jdbc.query(
        "SELECT livro_id, titulo, tipo FROM acervo.v_livro_referencia_v1"
            + " WHERE livro_id IN (" + marcadores(ids.size()) + ")",
        rs -> {
          UUID id = rs.getObject("livro_id", UUID.class);
          livros.put(
              id,
              new LivroDaDenuncia(
                  id.toString(), rs.getString("titulo"), "pessoal".equals(rs.getString("tipo"))));
        },
        ids.toArray());
    return livros;
  }

  public Map<UUID, Comentario> comentarios(Collection<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, Comentario> comentarios = new HashMap<>();
    jdbc.query(
        "SELECT c.id, c.texto, c.criado_em,"
            + " (SELECT count(*) FROM comentario r WHERE r.comentario_raiz_id = c.id) AS respostas"
            + " FROM comentario c WHERE c.id IN (" + marcadores(ids.size()) + ")",
        rs -> {
          comentarios.put(
              rs.getObject("id", UUID.class),
              new Comentario(
                  rs.getString("texto"),
                  rs.getTimestamp("criado_em").toInstant(),
                  rs.getInt("respostas")));
        },
        ids.toArray());
    return comentarios;
  }

  public Map<UUID, Resenha> resenhas(Collection<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, Resenha> resenhas = new HashMap<>();
    jdbc.query(
        "SELECT resenha_id, usuario_id, livro_id, texto, spoiler, criado_em"
            + " FROM leitura.v_resenha_publicacao_v1"
            + " WHERE resenha_id IN (" + marcadores(ids.size()) + ")",
        rs -> {
          resenhas.put(
              rs.getObject("resenha_id", UUID.class),
              new Resenha(
                  rs.getObject("usuario_id", UUID.class),
                  rs.getObject("livro_id", UUID.class),
                  rs.getString("texto"),
                  rs.getBoolean("spoiler"),
                  rs.getTimestamp("criado_em").toInstant()));
        },
        ids.toArray());
    return resenhas;
  }

  public Optional<BigDecimal> nota(UUID usuarioId, UUID livroId) {
    return jdbc.queryForList(
            "SELECT valor FROM leitura.v_nota_publicacao_v1 WHERE usuario_id = ? AND livro_id = ?",
            BigDecimal.class,
            usuarioId,
            livroId)
        .stream()
        .findFirst();
  }

  public Map<UUID, Atividade> atividades(Collection<UUID> ids) {
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, Atividade> atividades = new HashMap<>();
    jdbc.query(
        "SELECT id, autor_id, tipo, snap_usuario_nome, snap_livro_titulo FROM atividade"
            + " WHERE id IN (" + marcadores(ids.size()) + ")",
        rs -> {
          UUID id = rs.getObject("id", UUID.class);
          atividades.put(
              id,
              new Atividade(
                  id,
                  rs.getObject("autor_id", UUID.class),
                  rs.getString("tipo"),
                  rs.getString("snap_usuario_nome"),
                  rs.getString("snap_livro_titulo")));
        },
        ids.toArray());
    return atividades;
  }

  // ------------------------------------------------------------------ ações

  /** Marca a remoção pedida ao {@code leitura} em todas as pendentes do alvo. */
  public void marcarRemocao(String alvoTipo, UUID alvoId) {
    jdbc.update(
        "UPDATE denuncia SET remocao_solicitada_em = now()"
            + " WHERE estado = 'pendente' AND alvo_tipo = ? AND alvo_id = ?",
        alvoTipo,
        alvoId);
  }

  public void limparMarca(String alvoTipo, UUID alvoId) {
    jdbc.update(
        "UPDATE denuncia SET remocao_solicitada_em = NULL"
            + " WHERE estado = 'pendente' AND alvo_tipo = ? AND alvo_id = ?",
        alvoTipo,
        alvoId);
  }

  public List<String> arquivar(UUID denunciaId) {
    return jdbc.queryForList(
        "UPDATE denuncia SET estado = 'arquivada', resolvido_em = now()"
            + " WHERE id = ? AND estado = 'pendente' RETURNING id::text",
        String.class,
        denunciaId);
  }

  /** Fecha como removidas as pendentes de um ou mais alvos do mesmo tipo. */
  public List<String> fecharPendentes(String alvoTipo, Collection<UUID> alvoIds) {
    if (alvoIds.isEmpty()) {
      return List.of();
    }
    List<Object> parametros = new ArrayList<>();
    parametros.add(alvoTipo);
    parametros.addAll(alvoIds);
    return jdbc.queryForList(
        "UPDATE denuncia SET estado = 'removida', resolvido_em = now(), remocao_solicitada_em = NULL"
            + " WHERE estado = 'pendente' AND alvo_tipo = ? AND alvo_id IN ("
            + marcadores(alvoIds.size())
            + ") RETURNING id::text",
        String.class,
        parametros.toArray());
  }

  /** Fecha as denúncias de comentários de atividades que saíram com a resenha. */
  public List<String> fecharPendentesDeComentariosDasAtividades(Collection<UUID> atividadeIds) {
    if (atividadeIds.isEmpty()) {
      return List.of();
    }
    return jdbc.queryForList(
        "UPDATE denuncia SET estado = 'removida', resolvido_em = now(), remocao_solicitada_em = NULL"
            + " WHERE estado = 'pendente' AND alvo_tipo = 'comentario' AND atividade_id IN ("
            + marcadores(atividadeIds.size())
            + ") RETURNING id::text",
        String.class,
        atividadeIds.toArray());
  }

  public boolean comentarioExiste(UUID comentarioId) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM comentario WHERE id = ?)", Boolean.class, comentarioId));
  }

  /** As respostas de um comentário-raiz, que o CASCADE leva junto. */
  public List<UUID> respostas(UUID comentarioId) {
    return jdbc.queryForList(
        "SELECT id FROM comentario WHERE comentario_raiz_id = ?", UUID.class, comentarioId);
  }

  public void apagarComentario(UUID comentarioId) {
    jdbc.update("DELETE FROM comentario WHERE id = ?", comentarioId);
  }

  public List<UUID> atividadesDaResenha(UUID resenhaId) {
    return jdbc.queryForList(
        "SELECT id FROM atividade WHERE tipo = 'resenha_publicada' AND origem_id = ?",
        UUID.class,
        resenhaId);
  }

  /**
   * Por SQL, e não pela entidade: o consumidor de {@code resenha.excluida} pode ter apagado a
   * linha antes, e um {@code delete} da entidade falharia no flush.
   */
  public void apagarAtividadesDaResenha(UUID resenhaId) {
    jdbc.update(
        "DELETE FROM atividade WHERE tipo = 'resenha_publicada' AND origem_id = ?", resenhaId);
  }

  /**
   * Grava o log. A remoção é única por alvo (índice {@code log_moderacao_remocao_uk}): dois
   * cliques ou o reenvio depois de um timeout não duplicam a auditoria.
   */
  public void registrar(
      String admin,
      String acao,
      String alvoTipo,
      UUID alvoId,
      UUID denunciaId,
      UUID alvoAutorId,
      UUID alvoLivroId,
      UUID atividadeAutorId) {
    jdbc.update(
        "INSERT INTO log_moderacao (admin, acao, alvo_tipo, alvo_id, denuncia_id, alvo_autor_id,"
            + " alvo_livro_id, atividade_autor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            + " ON CONFLICT (alvo_tipo, alvo_id)"
            + " WHERE acao = 'remover_conteudo' AND alvo_id IS NOT NULL DO NOTHING",
        admin,
        acao,
        alvoTipo,
        alvoId,
        denunciaId,
        alvoAutorId,
        alvoLivroId,
        atividadeAutorId);
  }

  // ------------------------------------------------------------------ registro

  /** Da ação mais recente para a mais antiga, a partir do cursor; uma a mais para o temMais. */
  public List<Registro> registros(CursorComentario antesDe, int limite) {
    String colunas =
        "SELECT id, criado_em, acao, alvo_tipo, denuncia_id IS NOT NULL AS com_denuncia,"
            + " alvo_autor_id, atividade_autor_id, alvo_livro_id,"
            + " anonimizado_em IS NOT NULL AS anonimizado FROM log_moderacao";
    RowMapper<Registro> mapa =
        (rs, n) ->
            new Registro(
                rs.getObject("id", UUID.class),
                rs.getTimestamp("criado_em").toInstant(),
                rs.getString("acao"),
                rs.getString("alvo_tipo"),
                rs.getBoolean("com_denuncia"),
                rs.getObject("alvo_autor_id", UUID.class),
                rs.getObject("atividade_autor_id", UUID.class),
                rs.getObject("alvo_livro_id", UUID.class),
                rs.getBoolean("anonimizado"));
    if (antesDe == null) {
      return jdbc.query(colunas + " ORDER BY criado_em DESC, id DESC LIMIT ?", mapa, limite + 1);
    }
    return jdbc.query(
        colunas + " WHERE (criado_em, id) < (?, ?) ORDER BY criado_em DESC, id DESC LIMIT ?",
        mapa,
        Timestamp.from(antesDe.criadoEm()),
        antesDe.id(),
        limite + 1);
  }

  private static String marcadores(int quantidade) {
    return java.util.Collections.nCopies(quantidade, "?").stream().collect(Collectors.joining(", "));
  }

  private static Denuncia denuncia(ResultSet rs, int linha) throws SQLException {
    return new Denuncia(
        rs.getObject("id", UUID.class),
        rs.getObject("denunciante_id", UUID.class),
        rs.getString("alvo_tipo"),
        rs.getObject("alvo_id", UUID.class),
        rs.getString("motivo"),
        rs.getString("estado"),
        rs.getTimestamp("criado_em").toInstant(),
        rs.getObject("alvo_autor_id", UUID.class),
        rs.getObject("alvo_livro_id", UUID.class),
        rs.getObject("atividade_id", UUID.class),
        rs.getObject("atividade_autor_id", UUID.class),
        rs.getBoolean("remocao_solicitada"));
  }
}
