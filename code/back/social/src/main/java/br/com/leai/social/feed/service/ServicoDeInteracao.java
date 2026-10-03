package br.com.leai.social.feed.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.common.LimitePorUsuario;
import br.com.leai.social.common.Paginacao;
import br.com.leai.social.feed.controller.InteracaoController;
import br.com.leai.social.feed.dto.AutorSnapshotResposta;
import br.com.leai.social.feed.dto.ComentarioResposta;
import br.com.leai.social.feed.dto.EstadoCurtidaResposta;
import br.com.leai.social.feed.dto.ListaRespostasResposta;
import br.com.leai.social.feed.dto.MencaoResposta;
import br.com.leai.social.feed.dto.PaginaComentariosResposta;
import br.com.leai.social.feed.entity.Atividade;
import br.com.leai.social.feed.entity.Comentario;
import br.com.leai.social.feed.repository.ComentarioRepository;
import br.com.leai.social.feed.repository.CursorComentario;
import br.com.leai.social.feed.repository.CursorInvalidoException;
import br.com.leai.social.feed.repository.CurtidaAtividadeRepository;
import br.com.leai.social.feed.repository.MencaoDeComentarioRepository;
import br.com.leai.social.feed.repository.MencaoDeComentarioRepository.Mencao;
import br.com.leai.social.feed.service.ResolvedorDeMencoes.MencaoResolvida;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Curtir/descurtir e comentar/responder (RF-SOC-11/12), com a raiz e o usuário respondido sempre
 * derivados no servidor (RN-10 — nunca aninha um terceiro nível). Revalida visibilidade via {@link
 * ServicoDeFeed#validarVisivel} antes de qualquer escrita ou leitura, exatamente como o feed.
 *
 * <p>Chamado de dentro do fluxo de idempotência ({@code ServicoDeIdempotencia.executar}, Task 1)
 * pelo {@link InteracaoController} — este serviço não conhece {@code Idempotency-Key}.
 *
 * <p>Publica exatamente um evento por escrita bem-sucedida (nunca dois, nunca replay): curtir novo
 * grava {@code atividade.curtida}; comentar grava {@code atividade.comentada} ou {@code
 * comentario.respondido}, nunca os dois.
 */
@Service
public class ServicoDeInteracao {

  private static final String COMENTARIO_NAO_ENCONTRADO = "Não encontramos o comentário respondido.";
  private static final String COMENTARIO_INEXISTENTE =
      "Este comentário não existe mais. Ele pode ter sido excluído em outro aparelho.";
  private static final String SO_O_AUTOR = "Só quem escreveu o comentário pode alterá-lo.";
  private static final String SQLSTATE_VIOLACAO_CHECK = "23514";

  private final ServicoDeFeed servicoDeFeed;
  private final CurtidaAtividadeRepository curtidaRepository;
  private final ComentarioRepository comentarioRepository;
  private final MencaoDeComentarioRepository mencaoRepository;
  private final EventosDeInteracao eventos;
  private final PerfisDeReferencia perfis;
  private final ResolvedorDeMencoes resolvedorDeMencoes;
  private final JdbcTemplate jdbc;
  private final LimitePorUsuario limiteDeCurtir;
  private final LimitePorUsuario limiteDeComentar;
  private final LimitePorUsuario limiteDeMencionar;

  public ServicoDeInteracao(
      ServicoDeFeed servicoDeFeed,
      CurtidaAtividadeRepository curtidaRepository,
      ComentarioRepository comentarioRepository,
      MencaoDeComentarioRepository mencaoRepository,
      EventosDeInteracao eventos,
      PerfisDeReferencia perfis,
      ResolvedorDeMencoes resolvedorDeMencoes,
      JdbcTemplate jdbc,
      @Qualifier("limiteDeCurtir") LimitePorUsuario limiteDeCurtir,
      @Qualifier("limiteDeComentar") LimitePorUsuario limiteDeComentar,
      @Qualifier("limiteDeMencionar") LimitePorUsuario limiteDeMencionar) {
    this.servicoDeFeed = servicoDeFeed;
    this.curtidaRepository = curtidaRepository;
    this.comentarioRepository = comentarioRepository;
    this.mencaoRepository = mencaoRepository;
    this.eventos = eventos;
    this.perfis = perfis;
    this.resolvedorDeMencoes = resolvedorDeMencoes;
    this.jdbc = jdbc;
    this.limiteDeCurtir = limiteDeCurtir;
    this.limiteDeComentar = limiteDeComentar;
    this.limiteDeMencionar = limiteDeMencionar;
  }

  /**
   * Curte uma atividade visível (RF-SOC-11). No máximo uma curtida por leitor e atividade: a
   * violação do índice único {@code curtida_atividade_usuario_unico} não é erro, é o resultado
   * idempotente esperado de repetir a curtida (o efeito, não só a chave de idempotência, já é
   * idempotente). Evento só sai quando a curtida é efetivamente nova — nunca em replay.
   */
  @Transactional
  public EstadoCurtidaResposta curtir(UUID usuarioId, UUID atividadeId) {
    limiteDeCurtir.registrar(usuarioId);
    Atividade atividade = servicoDeFeed.validarVisivel(usuarioId, atividadeId);

    List<UUID> inserido =
        jdbc.queryForList(
            "INSERT INTO curtida_atividade (id, atividade_id, usuario_id) VALUES (?, ?, ?)"
                + " ON CONFLICT (atividade_id, usuario_id) DO NOTHING RETURNING id",
            UUID.class,
            UUID.randomUUID(),
            atividadeId,
            usuarioId);

    if (!inserido.isEmpty()) {
      eventos.atividadeCurtida(atividadeId, atividade.autorId(), usuarioId);
    }

    long total = curtidaRepository.countByAtividadeId(atividadeId);
    return new EstadoCurtidaResposta(atividadeId.toString(), true, total);
  }

  /**
   * Remove a própria curtida (RF-SOC-11). Ausência da curtida do solicitante é sucesso do mesmo
   * jeito: o estado final é o pedido, sem evento nem erro.
   */
  @Transactional
  public void descurtir(UUID usuarioId, UUID atividadeId) {
    limiteDeCurtir.registrar(usuarioId);
    servicoDeFeed.validarVisivel(usuarioId, atividadeId);
    jdbc.update(
        "DELETE FROM curtida_atividade WHERE atividade_id = ? AND usuario_id = ?",
        atividadeId,
        usuarioId);
  }

  /**
   * Comenta uma atividade ou responde a um comentário (RF-SOC-12). Sem {@code
   * comentarioRespondidoId} cria raiz. Com o campo, a raiz e o usuário respondido nunca vêm do
   * cliente: são derivados do comentário-alvo (RN-10) — se o alvo já é resposta, a nova linha vira
   * irmã sob a mesma raiz, nunca um terceiro nível.
   */
  @Transactional
  public ComentarioResposta comentar(
      UUID usuarioId, UUID atividadeId, String texto, UUID comentarioRespondidoId) {
    limiteDeComentar.registrar(usuarioId);
    Atividade atividade = servicoDeFeed.validarVisivel(usuarioId, atividadeId);

    UUID comentarioRaizId = null;
    UUID respondidoUsuarioId = null;
    if (comentarioRespondidoId != null) {
      Comentario alvo = buscarAlvoNaAtividade(atividadeId, comentarioRespondidoId);
      comentarioRaizId = alvo.ehRaiz() ? alvo.id() : alvo.comentarioRaizId();
      respondidoUsuarioId = alvo.autorId();
    }

    Comentario novo =
        Comentario.novo(
            atividadeId, usuarioId, comentarioRaizId, respondidoUsuarioId, comentarioRespondidoId, texto);
    List<MencaoResolvida> mencoes = resolvedorDeMencoes.resolver(texto);
    Set<UUID> aNotificar = destinatariosNovos(novo, mencoes, Set.of());
    limiteDeMencionar.registrar(usuarioId, aNotificar.size());

    try {
      comentarioRepository.saveAndFlush(novo);
    } catch (DataIntegrityViolationException erro) {
      throw traduzirViolacao(erro);
    }
    mencaoRepository.substituir(novo.id(), porPosicao(mencoes));

    if (comentarioRespondidoId != null) {
      eventos.comentarioRespondido(
          atividadeId, novo.id(), comentarioRespondidoId, respondidoUsuarioId, usuarioId);
    } else {
      eventos.atividadeComentada(atividadeId, novo.id(), atividade.autorId(), usuarioId);
    }
    aNotificar.forEach(id -> eventos.usuarioMencionado(atividadeId, novo.id(), id, usuarioId));

    return mapearUm(novo, usuarioId, novo.ehRaiz() ? 0 : null);
  }

  @Transactional
  public ComentarioResposta editar(UUID usuarioId, UUID comentarioId, String texto) {
    limiteDeComentar.registrar(usuarioId);
    Comentario comentario = buscarProprio(usuarioId, comentarioId);
    servicoDeFeed.validarVisivel(usuarioId, comentario.atividadeId());

    List<MencaoResolvida> mencoes = resolvedorDeMencoes.resolver(texto);
    Set<UUID> aNotificar =
        destinatariosNovos(comentario, mencoes, eventos.jaMencionados(comentarioId));
    limiteDeMencionar.registrar(usuarioId, aNotificar.size());

    comentario.editar(texto);
    comentarioRepository.saveAndFlush(comentario);
    mencaoRepository.substituir(comentarioId, porPosicao(mencoes));
    aNotificar.forEach(
        id -> eventos.usuarioMencionado(comentario.atividadeId(), comentarioId, id, usuarioId));

    Integer totalRespostas =
        comentario.ehRaiz() ? (int) comentarioRepository.countByComentarioRaizId(comentarioId) : null;
    return mapearUm(comentario, usuarioId, totalRespostas);
  }

  @Transactional
  public void excluir(UUID usuarioId, UUID comentarioId) {
    comentarioRepository.delete(buscarProprio(usuarioId, comentarioId));
  }

  /** Comentários-raiz de uma atividade (RF-SOC-15), revalidando visibilidade antes de consultar. */
  @Transactional(readOnly = true)
  public PaginaComentariosResposta listarComentariosRaiz(
      UUID usuarioId, UUID atividadeId, int page, int size) {
    Paginacao.validar(page, size);
    servicoDeFeed.validarVisivel(usuarioId, atividadeId);

    Page<Comentario> pagina =
        comentarioRepository.buscarRaizesPorAtividade(atividadeId, PageRequest.of(page, size));
    List<Comentario> raizes = pagina.getContent();
    Map<UUID, Long> totalRespostas = contarRespostas(raizes);

    List<ComentarioResposta> itens =
        mapearVarios(
            raizes, usuarioId, c -> totalRespostas.getOrDefault(c.id(), 0L).intValue());

    return new PaginaComentariosResposta(
        itens, page, size, pagina.getTotalElements(), pagina.getTotalPages(), pagina.isLast());
  }

  /**
   * Respostas diretas de uma raiz (RF-SOC-18), paginadas por cursor, revalidando visibilidade da
   * atividade dona do comentário-raiz antes de consultar.
   */
  @Transactional(readOnly = true)
  public ListaRespostasResposta listarRespostas(
      UUID usuarioId, UUID comentarioRaizId, String cursor, int limit) {
    validarLimite(limit);
    Comentario raiz =
        comentarioRepository
            .findById(comentarioRaizId)
            .orElseThrow(
                () -> new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, COMENTARIO_NAO_ENCONTRADO));
    servicoDeFeed.validarVisivel(usuarioId, raiz.atividadeId());

    // Busca um a mais que o limite só para saber se há próxima página, sem contar tudo.
    List<Comentario> pagina;
    try {
      pagina = comentarioRepository.buscarRespostasPorRaiz(comentarioRaizId, cursor, limit + 1);
    } catch (CursorInvalidoException erro) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Cursor de paginação inválido.");
    }

    boolean temMais = pagina.size() > limit;
    List<Comentario> respostas = temMais ? pagina.subList(0, limit) : pagina;
    List<ComentarioResposta> itens = mapearVarios(respostas, usuarioId, c -> null);

    String proximoCursor =
        temMais
            ? new CursorComentario(
                    respostas.get(respostas.size() - 1).criadoEm(),
                    respostas.get(respostas.size() - 1).id())
                .codificar()
            : null;

    return new ListaRespostasResposta(itens, proximoCursor, temMais);
  }

  private Comentario buscarAlvoNaAtividade(UUID atividadeId, UUID comentarioId) {
    Comentario alvo =
        comentarioRepository
            .findById(comentarioId)
            .orElseThrow(
                () -> new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, COMENTARIO_NAO_ENCONTRADO));
    if (!alvo.atividadeId().equals(atividadeId)) {
      throw new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, COMENTARIO_NAO_ENCONTRADO);
    }
    return alvo;
  }

  private Comentario buscarProprio(UUID usuarioId, UUID comentarioId) {
    Comentario comentario =
        comentarioRepository
            .findById(comentarioId)
            .orElseThrow(
                () -> new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, COMENTARIO_INEXISTENTE));
    if (!comentario.autorId().equals(usuarioId)) {
      throw new ErroDeNegocioException(CodigoErro.ACESSO_NEGADO, SO_O_AUTOR);
    }
    return comentario;
  }

  private static Set<UUID> destinatariosNovos(
      Comentario comentario, List<MencaoResolvida> mencoes, Set<UUID> jaMencionados) {
    Set<UUID> ids = ResolvedorDeMencoes.destinatarios(mencoes);
    ids.remove(comentario.autorId());
    if (comentario.respondidoUsuarioId() != null) {
      ids.remove(comentario.respondidoUsuarioId());
    }
    ids.removeAll(jaMencionados);
    return ids;
  }

  private static Map<Integer, UUID> porPosicao(List<MencaoResolvida> mencoes) {
    Map<Integer, UUID> mapa = new LinkedHashMap<>();
    mencoes.forEach(m -> mapa.put(m.posicao(), m.mencionadoId()));
    return mapa;
  }

  /**
   * Cinto de segurança do trigger {@code validar_comentario_raiz} (SQLState {@code 23514}): não
   * deveria disparar, já que a raiz é sempre resolvida antes do INSERT, mas se disparar vira 422
   * de regra de negócio — nunca deixa vazar {@link SQLException}.
   */
  private static ErroDeNegocioException traduzirViolacao(DataIntegrityViolationException erro) {
    Throwable causa = erro;
    while (causa != null) {
      if (causa instanceof SQLException sql && SQLSTATE_VIOLACAO_CHECK.equals(sql.getSQLState())) {
        return new ErroDeNegocioException(
            CodigoErro.ENTIDADE_NAO_PROCESSAVEL, "Não foi possível aninhar esta resposta.");
      }
      causa = causa.getCause();
    }
    throw erro;
  }

  private Map<UUID, Long> contarRespostas(Collection<Comentario> raizes) {
    Map<UUID, Long> mapa = new HashMap<>();
    for (Comentario raiz : raizes) {
      mapa.put(raiz.id(), comentarioRepository.countByComentarioRaizId(raiz.id()));
    }
    return mapa;
  }

  private ComentarioResposta mapearUm(Comentario comentario, UUID solicitanteId, Integer totalRespostas) {
    return mapearVarios(List.of(comentario), solicitanteId, c -> totalRespostas).get(0);
  }

  private List<ComentarioResposta> mapearVarios(
      List<Comentario> comentarios,
      UUID solicitanteId,
      Function<Comentario, Integer> totalRespostas) {
    Map<UUID, List<Mencao>> mencoes =
        mencaoRepository.porComentarios(comentarios.stream().map(Comentario::id).toList());
    Map<UUID, AutorSnapshotResposta> perfisPorId =
        perfis.porIds(
            Stream.concat(
                    comentarios.stream()
                        .flatMap(c -> Stream.of(c.autorId(), c.respondidoUsuarioId())),
                    mencoes.values().stream().flatMap(List::stream).map(Mencao::mencionadoId))
                .filter(Objects::nonNull)
                .toList());
    return comentarios.stream()
        .map(
            c ->
                mapear(
                    c,
                    solicitanteId,
                    perfisPorId,
                    mencoesVisiveis(c, mencoes.getOrDefault(c.id(), List.of()), perfisPorId),
                    totalRespostas.apply(c)))
        .toList();
  }

  private static List<MencaoResposta> mencoesVisiveis(
      Comentario comentario, List<Mencao> mencoes, Map<UUID, AutorSnapshotResposta> perfisPorId) {
    List<MencaoResposta> visiveis = new ArrayList<>();
    for (Mencao mencao : mencoes) {
      AutorSnapshotResposta perfil = perfisPorId.get(mencao.mencionadoId());
      int comprimento = ResolvedorDeMencoes.comprimentoEm(comentario.texto(), mencao.posicao());
      if (perfil != null && comprimento > 0) {
        visiveis.add(new MencaoResposta(mencao.posicao(), comprimento, perfil.id(), perfil.username()));
      }
    }
    return visiveis;
  }

  private static ComentarioResposta mapear(
      Comentario comentario,
      UUID solicitanteId,
      Map<UUID, AutorSnapshotResposta> autores,
      List<MencaoResposta> mencoes,
      Integer totalRespostas) {
    AutorSnapshotResposta autor = autores.get(comentario.autorId());
    AutorSnapshotResposta usuarioRespondido =
        comentario.respondidoUsuarioId() == null ? null : autores.get(comentario.respondidoUsuarioId());

    return new ComentarioResposta(
        comentario.id().toString(),
        comentario.atividadeId().toString(),
        comentario.comentarioRaizId() == null ? null : comentario.comentarioRaizId().toString(),
        comentario.comentarioRespondidoId() == null ? null : comentario.comentarioRespondidoId().toString(),
        usuarioRespondido,
        autor,
        comentario.texto(),
        mencoes,
        comentario.ehRaiz() ? "RAIZ" : "RESPOSTA",
        totalRespostas,
        comentario.autorId().equals(solicitanteId),
        comentario.foiEditado(),
        comentario.criadoEm(),
        comentario.atualizadoEm());
  }

  private static void validarLimite(int limit) {
    if (limit < 1 || limit > ServicoDeFeed.TAMANHO_MAXIMO) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Limite de 1 a " + ServicoDeFeed.TAMANHO_MAXIMO + ".");
    }
  }
}
