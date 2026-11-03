package br.com.leai.social.lista.repository;

import br.com.leai.social.lista.model.ItemDaLista;
import br.com.leai.social.lista.model.Lista;
import br.com.leai.social.lista.model.LivroDeReferencia;
import br.com.leai.social.lista.model.ResumoDaLista;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/**
 * Acesso a {@code social.lista} e {@code social.lista_item} por SQL parametrizado (RNF-SEC-12), e
 * não por JPA, como em {@code NotificacaoRepository}: adicionar usa {@code ON CONFLICT DO NOTHING},
 * as escritas travam a linha da lista com {@code FOR UPDATE} e mover/remover deslocam várias
 * posições num só {@code UPDATE}, o que uma entidade em cache não acompanharia.
 *
 * <p>Os livros vêm de {@code acervo.v_livro_referencia_v1}, sempre qualificado: o {@code
 * search_path} do serviço é {@code social}.
 */
@Repository
public class ListaRepository {

  private static final String COLUNAS_LISTA =
      "id, usuario_id, titulo, descricao, ativo, criado_em, atualizado_em";

  /**
   * {@code posicao} é a posição visível: quantos livros ativos da lista estão até este item,
   * inclusive. Num item de livro inativo o valor não tem uso (o serviço o trata como ausente).
   */
  private static final String SELECT_ITEM =
      "SELECT li.id, li.lista_id, li.ordem, li.adicionado_em, v.livro_id, v.tipo, v.dono_id,"
          + " v.titulo, v.autor_exibicao, v.capa_resolvida, v.ativo,"
          + " (SELECT count(*) FROM lista_item o"
          + " JOIN acervo.v_livro_referencia_v1 ov ON ov.livro_id = o.livro_id"
          + " WHERE o.lista_id = li.lista_id AND ov.ativo AND o.ordem <= li.ordem) AS posicao"
          + " FROM lista_item li"
          + " JOIN acervo.v_livro_referencia_v1 v ON v.livro_id = li.livro_id";

  /** Livros ativos de uma lista; é a contagem que o leitor vê. */
  private static final String QUANTIDADE_ATIVA =
      "(SELECT count(*) FROM lista_item li"
          + " JOIN acervo.v_livro_referencia_v1 v ON v.livro_id = li.livro_id"
          + " WHERE li.lista_id = l.id AND v.ativo)";

  private final JdbcTemplate jdbc;

  public ListaRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Lista criar(UUID donoId, String titulo, String descricao) {
    return jdbc.queryForObject(
        "INSERT INTO lista (usuario_id, titulo, descricao) VALUES (?, ?, ?) RETURNING "
            + COLUNAS_LISTA,
        ListaRepository::lista,
        donoId,
        titulo,
        descricao);
  }

  /** Busca a lista, ativa ou não. {@code travar} segura a linha até o fim da transação. */
  public Optional<Lista> buscar(UUID listaId, boolean travar) {
    List<Lista> encontradas =
        jdbc.query(
            "SELECT " + COLUNAS_LISTA + " FROM lista WHERE id = ?" + (travar ? " FOR UPDATE" : ""),
            ListaRepository::lista,
            listaId);
    return encontradas.stream().findFirst();
  }

  public Lista editar(UUID listaId, String titulo, String descricao) {
    return jdbc.queryForObject(
        "UPDATE lista SET titulo = ?, descricao = ?, atualizado_em = now() WHERE id = ? RETURNING "
            + COLUNAS_LISTA,
        ListaRepository::lista,
        titulo,
        descricao,
        listaId);
  }

  public void desativar(UUID listaId) {
    jdbc.update("UPDATE lista SET ativo = false, atualizado_em = now() WHERE id = ?", listaId);
  }

  public void tocar(UUID listaId) {
    jdbc.update("UPDATE lista SET atualizado_em = now() WHERE id = ?", listaId);
  }

  public long quantidadeAtiva(UUID listaId) {
    return jdbc.queryForObject(
        "SELECT " + QUANTIDADE_ATIVA + " FROM lista l WHERE l.id = ?", Long.class, listaId);
  }

  /**
   * Posição gravada do livro ativo que o leitor vê na posição {@code posicaoVisivel}. Mover para
   * ela coloca o item exatamente nesse lugar entre os visíveis, porque os inativos entre um e
   * outro não aparecem.
   */
  public Optional<Integer> ordemDaPosicaoVisivel(UUID listaId, int posicaoVisivel) {
    return jdbc
        .queryForList(
            "SELECT li.ordem FROM lista_item li"
                + " JOIN acervo.v_livro_referencia_v1 v ON v.livro_id = li.livro_id"
                + " WHERE li.lista_id = ? AND v.ativo ORDER BY li.ordem LIMIT 1 OFFSET ?",
            Integer.class,
            listaId,
            posicaoVisivel - 1)
        .stream()
        .findFirst();
  }

  /**
   * Acrescenta o livro na última posição. Devolve vazio quando ele já estava na lista: o {@code ON
   * CONFLICT} cobre só {@code (lista_id, livro_id)}, e o {@code FOR UPDATE} da lista, feito antes
   * pelo serviço, impede duas inclusões simultâneas de calcularem a mesma posição.
   */
  public Optional<UUID> adicionarNoFim(UUID listaId, UUID livroId) {
    List<UUID> inserido =
        jdbc.queryForList(
            "INSERT INTO lista_item (lista_id, livro_id, ordem)"
                + " SELECT ?, ?, coalesce(max(ordem), 0) + 1 FROM lista_item WHERE lista_id = ?"
                + " ON CONFLICT (lista_id, livro_id) DO NOTHING RETURNING id",
            UUID.class,
            listaId,
            livroId,
            listaId);
    return inserido.stream().findFirst();
  }

  public Optional<ItemDaLista> buscarItem(UUID itemId) {
    return jdbc.query(SELECT_ITEM + " WHERE li.id = ?", ListaRepository::item, itemId).stream()
        .findFirst();
  }

  public Optional<ItemDaLista> buscarItemPorLivro(UUID listaId, UUID livroId) {
    return jdbc
        .query(
            SELECT_ITEM + " WHERE li.lista_id = ? AND li.livro_id = ?",
            ListaRepository::item,
            listaId,
            livroId)
        .stream()
        .findFirst();
  }

  /**
   * Remove o livro e fecha o buraco: os itens seguintes sobem uma posição. A unicidade de {@code
   * (lista_id, ordem)} é adiável, então o Postgres a confere no fim do {@code UPDATE}, não linha a
   * linha. Devolve falso quando o livro não estava na lista.
   */
  public boolean remover(UUID listaId, UUID livroId) {
    List<Integer> removida =
        jdbc.queryForList(
            "DELETE FROM lista_item WHERE lista_id = ? AND livro_id = ? RETURNING ordem",
            Integer.class,
            listaId,
            livroId);
    if (removida.isEmpty()) {
      return false;
    }
    jdbc.update(
        "UPDATE lista_item SET ordem = ordem - 1 WHERE lista_id = ? AND ordem > ?",
        listaId,
        removida.get(0));
    return true;
  }

  /**
   * Leva o item de {@code de} para {@code para}, deslocando uma casa os itens do intervalo. A
   * constraint de ordem fica adiada até o commit, para a troca não esbarrar nela no meio.
   */
  public void mover(UUID listaId, UUID itemId, int de, int para) {
    jdbc.execute("SET CONSTRAINTS lista_item_ordem_unica DEFERRED");
    if (para < de) {
      jdbc.update(
          "UPDATE lista_item SET ordem = ordem + 1 WHERE lista_id = ? AND ordem >= ? AND ordem < ?",
          listaId,
          para,
          de);
    } else {
      jdbc.update(
          "UPDATE lista_item SET ordem = ordem - 1 WHERE lista_id = ? AND ordem > ? AND ordem <= ?",
          listaId,
          de,
          para);
    }
    jdbc.update("UPDATE lista_item SET ordem = ? WHERE id = ?", para, itemId);
  }

  /** Itens de livros ativos, em ordem, a partir do cursor (exclusivo). */
  public List<ItemDaLista> itensAtivos(UUID listaId, CursorItemDeLista cursor, int limite) {
    if (cursor == null) {
      return jdbc.query(
          SELECT_ITEM + " WHERE li.lista_id = ? AND v.ativo ORDER BY li.ordem, li.id LIMIT ?",
          ListaRepository::item,
          listaId,
          limite);
    }
    return jdbc.query(
        SELECT_ITEM
            + " WHERE li.lista_id = ? AND v.ativo AND (li.ordem, li.id) > (?, ?)"
            + " ORDER BY li.ordem, li.id LIMIT ?",
        ListaRepository::item,
        listaId,
        cursor.ordem(),
        cursor.id(),
        limite);
  }

  /**
   * Listas ativas do dono, da alterada mais recentemente para a mais antiga. Com {@code livroId},
   * cada uma traz se contém o livro; sem ele, {@code contemLivro} fica nulo.
   */
  public List<ResumoDaLista> resumos(UUID donoId, UUID livroId, int pagina, int tamanho) {
    String contem =
        livroId == null
            ? "NULL::boolean"
            : "EXISTS (SELECT 1 FROM lista_item c WHERE c.lista_id = l.id AND c.livro_id = ?)";
    List<Object> parametros = new ArrayList<>();
    if (livroId != null) {
      parametros.add(livroId);
    }
    parametros.add(donoId);
    parametros.add(tamanho);
    parametros.add((long) pagina * tamanho);
    return jdbc.query(
        "SELECT l.id, l.titulo, l.descricao, l.atualizado_em, "
            + QUANTIDADE_ATIVA
            + " AS quantidade, "
            + contem
            + " AS contem_livro"
            + " FROM lista l WHERE l.usuario_id = ? AND l.ativo"
            + " ORDER BY l.atualizado_em DESC, l.id DESC LIMIT ? OFFSET ?",
        (rs, linha) ->
            new ResumoDaLista(
                rs.getObject("id", UUID.class),
                rs.getString("titulo"),
                rs.getString("descricao"),
                rs.getLong("quantidade"),
                instante(rs.getTimestamp("atualizado_em")),
                (Boolean) rs.getObject("contem_livro")),
        parametros.toArray());
  }

  public long totalAtivas(UUID donoId) {
    return jdbc.queryForObject(
        "SELECT count(*) FROM lista WHERE usuario_id = ? AND ativo", Long.class, donoId);
  }

  /** Até três livros ativos por lista, pela ordem do dono, em uma consulta para a página toda. */
  public Map<UUID, List<LivroDeReferencia>> capas(Collection<UUID> listaIds) {
    if (listaIds.isEmpty()) {
      return Map.of();
    }
    List<UUID> ids = List.copyOf(listaIds);
    return jdbc.query(
        "SELECT lista_id, livro_id, tipo, dono_id, titulo, autor_exibicao, capa_resolvida, ativo"
            + " FROM (SELECT li.lista_id, li.ordem, v.*,"
            + " row_number() OVER (PARTITION BY li.lista_id ORDER BY li.ordem) AS n"
            + " FROM lista_item li"
            + " JOIN acervo.v_livro_referencia_v1 v ON v.livro_id = li.livro_id"
            + " WHERE v.ativo AND li.lista_id IN ("
            + String.join(", ", Collections.nCopies(ids.size(), "?"))
            + ")) primeiros"
            + " WHERE n <= 3 ORDER BY lista_id, ordem",
        rs -> {
          Map<UUID, List<LivroDeReferencia>> mapa = new HashMap<>();
          while (rs.next()) {
            mapa.computeIfAbsent(rs.getObject("lista_id", UUID.class), id -> new ArrayList<>())
                .add(livro(rs));
          }
          return mapa;
        },
        ids.toArray());
  }

  private static Lista lista(ResultSet rs, int linha) throws SQLException {
    return new Lista(
        rs.getObject("id", UUID.class),
        rs.getObject("usuario_id", UUID.class),
        rs.getString("titulo"),
        rs.getString("descricao"),
        rs.getBoolean("ativo"),
        instante(rs.getTimestamp("criado_em")),
        instante(rs.getTimestamp("atualizado_em")));
  }

  private static ItemDaLista item(ResultSet rs, int linha) throws SQLException {
    return new ItemDaLista(
        rs.getObject("id", UUID.class),
        rs.getObject("lista_id", UUID.class),
        rs.getInt("ordem"),
        rs.getInt("posicao"),
        instante(rs.getTimestamp("adicionado_em")),
        livro(rs));
  }

  static LivroDeReferencia livro(ResultSet rs) throws SQLException {
    return new LivroDeReferencia(
        rs.getObject("livro_id", UUID.class),
        rs.getString("tipo"),
        rs.getObject("dono_id", UUID.class),
        rs.getString("titulo"),
        rs.getString("autor_exibicao"),
        rs.getString("capa_resolvida"),
        rs.getBoolean("ativo"));
  }

  static final RowMapper<LivroDeReferencia> LIVRO = (rs, linha) -> livro(rs);

  private static Instant instante(Timestamp timestamp) {
    return timestamp == null ? null : timestamp.toInstant();
  }
}
