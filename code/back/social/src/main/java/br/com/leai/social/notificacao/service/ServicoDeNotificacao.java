package br.com.leai.social.notificacao.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.common.Paginacao;
import br.com.leai.social.feed.dto.AutorSnapshotResposta;
import br.com.leai.social.notificacao.dto.AcaoNotificacaoResposta;
import br.com.leai.social.notificacao.dto.LivroDaNotificacaoResposta;
import br.com.leai.social.notificacao.dto.MarcarLidasRequisicao;
import br.com.leai.social.notificacao.dto.MarcarLidasRequisicao.ModoMarcarLidas;
import br.com.leai.social.notificacao.dto.NotificacaoResposta;
import br.com.leai.social.notificacao.dto.PaginaNotificacoesResposta;
import br.com.leai.social.notificacao.dto.ResultadoMarcarLidasResposta;
import br.com.leai.social.notificacao.model.DadosDeNotificacao;
import br.com.leai.social.notificacao.model.Notificacao;
import br.com.leai.social.notificacao.model.TipoNotificacao;
import br.com.leai.social.notificacao.repository.NotificacaoRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lista paginada com não lidas (RF-NOT-02) e marcação individual/em lote (RF-NOT-03) das
 * notificações do leitor autenticado. Só o destinatário lê e marca as suas (RNF-SEC-02): id de
 * outro leitor responde como inexistente, sem alterar nada e sem confirmar que existe.
 */
@Service
public class ServicoDeNotificacao {

  private static final String NAO_ENCONTRADA = "Não encontramos uma ou mais notificações.";

  private final NotificacaoRepository notificacoes;

  public ServicoDeNotificacao(NotificacaoRepository notificacoes) {
    this.notificacoes = notificacoes;
  }

  @Transactional(readOnly = true)
  public PaginaNotificacoesResposta listar(UUID destinatarioId, int page, int size) {
    Paginacao.validar(page, size);

    List<Notificacao> pagina = notificacoes.listar(destinatarioId, page, size);
    Set<UUID> atoresVisiveis =
        notificacoes.atoresVisiveis(idsDe(pagina, DadosDeNotificacao.ATOR));
    Set<UUID> atividadesExistentes =
        notificacoes.atividadesExistentes(idsDe(pagina, DadosDeNotificacao.ATIVIDADE_ID));
    long totalItens = notificacoes.contar(destinatarioId);
    int totalPaginas = (int) ((totalItens + size - 1) / size);

    return new PaginaNotificacoesResposta(
        pagina.stream()
            .map(n -> mapear(n, destinatarioId, atoresVisiveis, atividadesExistentes))
            .toList(),
        page,
        size,
        totalItens,
        totalPaginas,
        page >= totalPaginas - 1,
        notificacoes.contarNaoLidas(destinatarioId));
  }

  /**
   * SELECIONADAS com um id é a marcação individual; com vários, o lote escolhido; TODAS zera as
   * não lidas. Já lida continua lida, então repetir a operação é idempotente no efeito.
   */
  @Transactional
  public ResultadoMarcarLidasResposta marcarLidas(
      UUID destinatarioId, MarcarLidasRequisicao requisicao) {
    int marcadas =
        requisicao.modo() == ModoMarcarLidas.TODAS
            ? marcarTodas(destinatarioId, requisicao.ids())
            : marcarSelecionadas(destinatarioId, requisicao.ids());
    return new ResultadoMarcarLidasResposta(marcadas, notificacoes.contarNaoLidas(destinatarioId));
  }

  private int marcarTodas(UUID destinatarioId, List<UUID> ids) {
    if (ids != null) {
      throw invalida("Não envie ids ao marcar todas como lidas.");
    }
    return notificacoes.marcarTodasLidas(destinatarioId);
  }

  private int marcarSelecionadas(UUID destinatarioId, List<UUID> ids) {
    if (ids == null) {
      throw invalida("Informe ao menos uma notificação.");
    }
    Set<UUID> unicos = new HashSet<>(ids);
    if (unicos.size() != ids.size() || unicos.contains(null)) {
      throw invalida("Não repita notificações na mesma marcação.");
    }
    if (notificacoes.contarDoDestinatario(destinatarioId, unicos) != unicos.size()) {
      throw new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, NAO_ENCONTRADA);
    }
    return notificacoes.marcarLidas(destinatarioId, unicos);
  }

  private static NotificacaoResposta mapear(
      Notificacao notificacao,
      UUID destinatarioId,
      Set<UUID> atoresVisiveis,
      Set<UUID> atividadesExistentes) {
    Map<String, Object> dados = notificacao.dados();
    AutorSnapshotResposta ator = ator(dados, atoresVisiveis);
    UUID atividadeId = uuid(dados, DadosDeNotificacao.ATIVIDADE_ID);
    boolean atividadeExiste = atividadeId != null && atividadesExistentes.contains(atividadeId);
    String leituraId =
        notificacao.leituraRef() == null ? null : notificacao.leituraRef().toString();

    return new NotificacaoResposta(
        notificacao.id().toString(),
        notificacao.tipo(),
        RedacaoDeNotificacao.mensagem(
            notificacao.tipo(),
            dados,
            ator == null ? RedacaoDeNotificacao.ATOR_OCULTO : ator.nomeExibicao(),
            destinatarioId),
        ator,
        atividadeExiste ? (String) dados.get(DadosDeNotificacao.ATIVIDADE_ID) : null,
        atividadeExiste ? (String) dados.get(DadosDeNotificacao.COMENTARIO_ID) : null,
        leituraId,
        (Integer) dados.get(DadosDeNotificacao.LIMIAR_DIAS),
        livro(dados),
        notificacao.tipo() == TipoNotificacao.LEITURA_EM_RISCO
            ? AcaoNotificacaoResposta.abandonarLeitura(leituraId)
            : null,
        notificacao.lidaEm() != null,
        notificacao.lidaEm(),
        notificacao.criadoEm());
  }

  private static AutorSnapshotResposta ator(Map<String, Object> dados, Set<UUID> visiveis) {
    Map<String, Object> ator = mapa(dados, DadosDeNotificacao.ATOR);
    if (ator == null || !visiveis.contains(uuid(ator, DadosDeNotificacao.ATOR_ID))) {
      return null;
    }
    return new AutorSnapshotResposta(
        (String) ator.get(DadosDeNotificacao.ATOR_ID),
        (String) ator.get(DadosDeNotificacao.ATOR_USERNAME),
        (String) ator.get(DadosDeNotificacao.ATOR_NOME),
        (String) ator.get(DadosDeNotificacao.ATOR_AVATAR));
  }

  private static LivroDaNotificacaoResposta livro(Map<String, Object> dados) {
    Map<String, Object> livro = mapa(dados, DadosDeNotificacao.LIVRO);
    if (livro == null) {
      return null;
    }
    return new LivroDaNotificacaoResposta(
        (String) livro.get(DadosDeNotificacao.LIVRO_ID),
        (String) livro.get(DadosDeNotificacao.LIVRO_TIPO),
        (String) livro.get(DadosDeNotificacao.LIVRO_TITULO));
  }

  /** Ids de ator ({@code dados.ator.id}) ou de atividade ({@code dados.atividadeId}) da página. */
  private static Set<UUID> idsDe(List<Notificacao> pagina, String campo) {
    Set<UUID> ids = new HashSet<>();
    for (Notificacao notificacao : pagina) {
      Object valor = notificacao.dados().get(campo);
      UUID id =
          valor instanceof Map<?, ?> ator
              ? uuid(ator, DadosDeNotificacao.ATOR_ID)
              : uuid(notificacao.dados(), campo);
      ids.add(id);
    }
    ids.remove(null);
    return ids;
  }

  private static UUID uuid(Map<?, ?> origem, String campo) {
    Object valor = origem.get(campo);
    return valor instanceof String texto ? UUID.fromString(texto) : null;
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> mapa(Map<String, Object> dados, String campo) {
    return (Map<String, Object>) dados.get(campo);
  }

  private static ErroDeNegocioException invalida(String mensagem) {
    return new ErroDeNegocioException(CodigoErro.REQUISICAO_INVALIDA, mensagem);
  }
}
