package br.com.leai.social.feed.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.feed.dto.AtividadeResposta;
import br.com.leai.social.feed.dto.AutorSnapshotResposta;
import br.com.leai.social.feed.dto.LinkLivroResposta;
import br.com.leai.social.feed.dto.LivroSnapshotResposta;
import br.com.leai.social.feed.dto.PaginaAtividadesResposta;
import br.com.leai.social.feed.dto.ResenhaSnapshotResposta;
import br.com.leai.social.feed.entity.Atividade;
import br.com.leai.social.feed.entity.TipoAtividade;
import br.com.leai.social.feed.repository.AtividadeRepository;
import br.com.leai.social.feed.repository.ComentarioRepository;
import br.com.leai.social.feed.repository.CurtidaAtividadeRepository;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Leitura do feed (RF-SOC-09) e do detalhe de uma atividade (RN-08/RN-09): monta {@link
 * AtividadeResposta} a partir do snapshot imutável gravado por {@code social} mais dois pequenos
 * enriquecimentos batidos em outros schemas (tipo do livro em {@code acervo}, texto/spoiler da
 * resenha em {@code leitura}) — nunca curtir/comentar, que é a Task 4.
 *
 * <p><b>Decisão documentada — {@code LivroSnapshotResposta.link}:</b> a tabela {@code atividade}
 * não guarda se o livro é {@code OFICIAL} ou {@code PESSOAL} (só {@code snap_livro_titulo/autor}).
 * Em vez de assumir um default às cegas, este serviço consulta {@code acervo.v_livro_referencia_v1}
 * — a mesma view cross-schema que {@link AtividadeRepository#buscarFeed} já usa para saber se o
 * livro está ativo — que expõe a coluna {@code tipo} (confirmado em {@code
 * acervo/drizzle/0001_20260916110700_modelo_der.sql}). Quando o tipo é {@code pessoal}, o link sai
 * como {@code via=feed, referenciaId=<atividadeId>} (RN-15); quando é {@code oficial}, sai como
 * {@code via=catalogo, referenciaId=null}. Se a view não trouxer o livro por algum motivo (situação
 * que não deveria ocorrer, já que {@code buscarFeed} faz INNER JOIN nela), o tipo cai em {@code
 * OFICIAL} como default seguro — pendência a reavaliar apenas se essa lacuna vier a se manifestar
 * de fato em produção.
 *
 * <p>Pelo mesmo racional, o texto/spoiler de uma resenha (schema {@code Atividade.resenha}) não têm
 * coluna própria em {@code atividade}: vêm de {@code leitura.v_resenha_publicacao_v1}, resolvidos
 * em lote por {@code origemId} apenas quando {@code tipo == RESENHA_PUBLICADA}.
 */
@Service
public class ServicoDeFeed {

  public static final int TAMANHO_PADRAO = 20;
  public static final int TAMANHO_MAXIMO = 50;

  private static final String NAO_ENCONTRADO = "Não encontramos o que você procura.";
  private static final String TIPO_LIVRO_PADRAO = "oficial";

  private final AtividadeRepository atividadeRepository;
  private final CurtidaAtividadeRepository curtidaRepository;
  private final ComentarioRepository comentarioRepository;
  private final JdbcTemplate jdbc;

  public ServicoDeFeed(
      AtividadeRepository atividadeRepository,
      CurtidaAtividadeRepository curtidaRepository,
      ComentarioRepository comentarioRepository,
      JdbcTemplate jdbc) {
    this.atividadeRepository = atividadeRepository;
    this.curtidaRepository = curtidaRepository;
    this.comentarioRepository = comentarioRepository;
    this.jdbc = jdbc;
  }

  /** Feed cronológico de quem {@code usuarioId} segue (RF-SOC-09), revalidado a cada consulta. */
  @Transactional(readOnly = true)
  public PaginaAtividadesResposta listar(UUID usuarioId, int page, int size) {
    validarPaginacao(page, size);

    Page<Atividade> pagina = atividadeRepository.buscarFeed(usuarioId, PageRequest.of(page, size));
    List<Atividade> atividades = pagina.getContent();

    Map<UUID, String> tiposLivro =
        buscarTiposLivro(atividades.stream().map(Atividade::livroId).distinct().toList());
    Map<UUID, ResenhaSnapshotResposta> resenhas =
        buscarResenhas(
            atividades.stream()
                .filter(a -> a.tipo() == TipoAtividade.RESENHA_PUBLICADA)
                .map(Atividade::origemId)
                .distinct()
                .toList());

    List<AtividadeResposta> itens =
        atividades.stream().map(a -> mapear(a, usuarioId, tiposLivro, resenhas)).toList();

    return new PaginaAtividadesResposta(
        itens, page, size, pagina.getTotalElements(), pagina.getTotalPages(), pagina.isLast());
  }

  /**
   * Detalhe de uma atividade (RN-08/RN-09): reusa exatamente o mesmo critério de visibilidade do
   * feed — se a atividade não apareceria em {@link #listar}, responde como inexistente (nunca
   * {@code 403}), para não confirmar a terceiros a existência de conteúdo alheio.
   */
  @Transactional(readOnly = true)
  public AtividadeResposta obter(UUID usuarioId, UUID atividadeId) {
    Atividade atividade = validarVisivel(usuarioId, atividadeId);

    Map<UUID, String> tiposLivro = buscarTiposLivro(List.of(atividade.livroId()));
    Map<UUID, ResenhaSnapshotResposta> resenhas =
        atividade.tipo() == TipoAtividade.RESENHA_PUBLICADA
            ? buscarResenhas(List.of(atividade.origemId()))
            : Map.of();

    return mapear(atividade, usuarioId, tiposLivro, resenhas);
  }

  /**
   * Revalidação de visibilidade (RN-08/RN-09), reusada pelas escritas de {@code
   * ServicoDeInteracao} (Task 4): curtir/comentar exigem a mesma checagem de {@link #obter} antes
   * de gravar — atividade inexistente ou não visível respondem {@code 404}, nunca {@code 403},
   * para não confirmar a terceiros a existência de conteúdo alheio.
   */
  Atividade validarVisivel(UUID usuarioId, UUID atividadeId) {
    Atividade atividade =
        atividadeRepository
            .findById(atividadeId)
            .orElseThrow(
                () -> new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, NAO_ENCONTRADO));

    if (!atividadeRepository.visivelNoFeed(usuarioId, atividadeId)) {
      throw new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, NAO_ENCONTRADO);
    }
    return atividade;
  }

  private AtividadeResposta mapear(
      Atividade atividade,
      UUID usuarioId,
      Map<UUID, String> tiposLivro,
      Map<UUID, ResenhaSnapshotResposta> resenhas) {
    long totalCurtidas = curtidaRepository.countByAtividadeId(atividade.id());
    long totalComentarios = comentarioRepository.countByAtividadeId(atividade.id());
    boolean curtidaPeloSolicitante =
        curtidaRepository.existsByAtividadeIdAndUsuarioId(atividade.id(), usuarioId);

    String tipoLivro = tiposLivro.getOrDefault(atividade.livroId(), TIPO_LIVRO_PADRAO);
    boolean pessoal = "pessoal".equalsIgnoreCase(tipoLivro);
    LinkLivroResposta link =
        pessoal
            ? new LinkLivroResposta(
                atividade.livroId().toString(), "feed", atividade.id().toString())
            : new LinkLivroResposta(atividade.livroId().toString(), "catalogo", null);

    LivroSnapshotResposta livro =
        new LivroSnapshotResposta(
            atividade.livroId().toString(),
            tipoLivro.toUpperCase(Locale.ROOT),
            atividade.snapLivroTitulo(),
            atividade.snapLivroAutor(),
            atividade.snapLivroCapa(),
            link);

    AutorSnapshotResposta autor =
        new AutorSnapshotResposta(
            atividade.autorId().toString(),
            atividade.snapUsuarioUsername(),
            atividade.snapUsuarioNome(),
            atividade.snapUsuarioAvatar());

    ResenhaSnapshotResposta resenha =
        atividade.tipo() == TipoAtividade.RESENHA_PUBLICADA ? resenhas.get(atividade.origemId()) : null;

    return new AtividadeResposta(
        atividade.id().toString(),
        atividade.tipo().name(),
        autor,
        livro,
        resenha,
        atividade.criadoEm(),
        totalCurtidas,
        totalComentarios,
        curtidaPeloSolicitante);
  }

  /** Resposta `PaginacaoInvalida`: página negativa ou tamanho fora de 1 a {@link #TAMANHO_MAXIMO}. */
  private static void validarPaginacao(int page, int size) {
    if (page < 0 || size < 1 || size > TAMANHO_MAXIMO) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA,
          "Página a partir de 0 e tamanho de 1 a " + TAMANHO_MAXIMO + ".");
    }
  }

  /** {@code tipo} de cada livro em lote, batido contra {@code acervo.v_livro_referencia_v1}. */
  private Map<UUID, String> buscarTiposLivro(Collection<UUID> livroIds) {
    if (livroIds.isEmpty()) {
      return Map.of();
    }
    String placeholders = "?, ".repeat(livroIds.size());
    placeholders = placeholders.substring(0, placeholders.length() - 2);
    String sql =
        "SELECT livro_id, tipo FROM acervo.v_livro_referencia_v1 WHERE livro_id IN (" + placeholders + ")";
    return jdbc.query(
        sql,
        rs -> {
          Map<UUID, String> mapa = new HashMap<>();
          while (rs.next()) {
            mapa.put(rs.getObject("livro_id", UUID.class), rs.getString("tipo"));
          }
          return mapa;
        },
        livroIds.toArray());
  }

  /** Texto/spoiler de cada resenha em lote, batido contra {@code leitura.v_resenha_publicacao_v1}. */
  private Map<UUID, ResenhaSnapshotResposta> buscarResenhas(Collection<UUID> resenhaIds) {
    if (resenhaIds.isEmpty()) {
      return Map.of();
    }
    String placeholders = "?, ".repeat(resenhaIds.size());
    placeholders = placeholders.substring(0, placeholders.length() - 2);
    String sql =
        "SELECT resenha_id, texto, spoiler FROM leitura.v_resenha_publicacao_v1"
            + " WHERE resenha_id IN ("
            + placeholders
            + ")";
    return jdbc.query(
        sql,
        rs -> {
          Map<UUID, ResenhaSnapshotResposta> mapa = new HashMap<>();
          while (rs.next()) {
            UUID id = rs.getObject("resenha_id", UUID.class);
            mapa.put(id, new ResenhaSnapshotResposta(id.toString(), rs.getString("texto"), rs.getBoolean("spoiler")));
          }
          return mapa;
        },
        resenhaIds.toArray());
  }
}
