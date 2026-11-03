package br.com.leai.social.lista.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.common.LimitePorUsuario;
import br.com.leai.social.common.Paginacao;
import br.com.leai.social.feed.dto.LinkLivroResposta;
import br.com.leai.social.lista.dto.CapaDaListaResposta;
import br.com.leai.social.lista.dto.DonoDaListaResposta;
import br.com.leai.social.lista.dto.ItemDeListaResposta;
import br.com.leai.social.lista.dto.ListaItensResposta;
import br.com.leai.social.lista.dto.ListaResposta;
import br.com.leai.social.lista.dto.ListaResumoResposta;
import br.com.leai.social.lista.dto.LivroDaListaResposta;
import br.com.leai.social.lista.dto.PaginaListasResposta;
import br.com.leai.social.lista.model.ItemDaLista;
import br.com.leai.social.lista.model.Lista;
import br.com.leai.social.lista.model.LivroDeReferencia;
import br.com.leai.social.lista.model.PerfilDoDono;
import br.com.leai.social.lista.model.ResumoDaLista;
import br.com.leai.social.lista.repository.CursorItemDeLista;
import br.com.leai.social.lista.repository.ListaRepository;
import br.com.leai.social.lista.repository.ReferenciasDeLista;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Listas de livros (RF-LST-01..06). Escrita é owner-only: lista alheia responde 404, sem confirmar
 * que existe. Leitura segue RN-08: o dono sempre vê; terceiros veem perfil público ou, se privado,
 * só com seguimento aceito, e o contrário é 403 com a mensagem de perfil privado. Conta suspensa
 * ou em exclusão some de {@code v_perfil_referencia_v1} e vira 404 para todos.
 *
 * <p>Toda escrita trava a linha da lista ({@code FOR UPDATE}) antes de mexer nos itens, o que
 * serializa inclusões, remoções e movimentos simultâneos na mesma lista e mantém as posições
 * contínuas. Chamado de dentro da idempotência pelo {@code ListaController}; este serviço não
 * conhece {@code Idempotency-Key}.
 */
@Service
public class ServicoDeListas {

  static final String LISTA_NAO_ENCONTRADA = "Não encontramos esta lista.";
  static final String LEITOR_NAO_ENCONTRADO = "Não encontramos este leitor.";
  static final String ITEM_NAO_ENCONTRADO = "Não encontramos este livro na lista.";
  static final String PERFIL_PRIVADO = "Este perfil é privado. Siga para ver as listas.";
  static final String LIVRO_RECUSADO = "Este livro não pode entrar na lista.";

  private final ListaRepository listas;
  private final ReferenciasDeLista referencias;
  private final LimitePorUsuario limite;

  public ServicoDeListas(
      ListaRepository listas,
      ReferenciasDeLista referencias,
      @Qualifier("limiteDeListas") LimitePorUsuario limite) {
    this.listas = listas;
    this.referencias = referencias;
    this.limite = limite;
  }

  /** Resultado de adicionar: {@code novo} falso quando o livro já estava na lista (200, não 201). */
  public record Inclusao(ItemDeListaResposta item, boolean novo) {}

  @Transactional
  public ListaResposta criar(UUID eu, String titulo, String descricao, UUID livroId) {
    limite.registrar(eu);
    PerfilDoDono dono = perfilOu404(eu, LEITOR_NAO_ENCONTRADO);
    if (livroId != null) {
      exigirLivroAceito(eu, livroId);
    }
    Lista lista = listas.criar(eu, titulo.strip(), normalizarDescricao(descricao));
    if (livroId != null) {
      listas.adicionarNoFim(lista.id(), livroId);
    }
    return mapear(lista, dono, eu);
  }

  @Transactional(readOnly = true)
  public ListaResposta obter(UUID eu, UUID listaId) {
    Lista lista = ativaOu404(listaId, false);
    PerfilDoDono dono = exigirVisivel(eu, lista.donoId(), LISTA_NAO_ENCONTRADA);
    return mapear(lista, dono, eu);
  }

  /**
   * Edita título e/ou descrição. {@code tituloInformado}/{@code descricaoInformada} distinguem o
   * campo omitido (mantém) do nulo (na descrição, apaga).
   */
  @Transactional
  public ListaResposta editar(
      UUID eu,
      UUID listaId,
      String titulo,
      boolean tituloInformado,
      String descricao,
      boolean descricaoInformada) {
    if (!tituloInformado && !descricaoInformada) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Informe o título ou a descrição.");
    }
    if (tituloInformado && (titulo == null || titulo.isBlank())) {
      throw new ErroDeNegocioException(CodigoErro.REQUISICAO_INVALIDA, "Informe o título da lista.");
    }
    limite.registrar(eu);
    Lista atual = propriaAtivaOu404(eu, listaId);
    PerfilDoDono dono = perfilOu404(eu, LISTA_NAO_ENCONTRADA);
    Lista editada =
        listas.editar(
            listaId,
            tituloInformado ? titulo.strip() : atual.titulo(),
            descricaoInformada ? normalizarDescricao(descricao) : atual.descricao());
    return mapear(editada, dono, eu);
  }

  /** Exclusão lógica; repetir sobre lista própria já excluída mantém o 204. */
  @Transactional
  public void excluir(UUID eu, UUID listaId) {
    limite.registrar(eu);
    Lista lista =
        listas
            .buscar(listaId, true)
            .filter(l -> l.pertenceA(eu))
            .orElseThrow(() -> naoEncontrado(LISTA_NAO_ENCONTRADA));
    if (lista.ativo()) {
      listas.desativar(listaId);
    }
  }

  @Transactional
  public Inclusao adicionar(UUID eu, UUID listaId, UUID livroId) {
    limite.registrar(eu);
    propriaAtivaOu404(eu, listaId);
    exigirLivroAceito(eu, livroId);

    Optional<UUID> novoItem = listas.adicionarNoFim(listaId, livroId);
    if (novoItem.isPresent()) {
      listas.tocar(listaId);
      return new Inclusao(mapear(listas.buscarItem(novoItem.get()).orElseThrow()), true);
    }
    return new Inclusao(mapear(listas.buscarItemPorLivro(listaId, livroId).orElseThrow()), false);
  }

  /** Livro ausente da lista também responde 204: o estado final é o pedido. */
  @Transactional
  public void remover(UUID eu, UUID listaId, UUID livroId) {
    limite.registrar(eu);
    propriaAtivaOu404(eu, listaId);
    if (listas.remover(listaId, livroId)) {
      listas.tocar(listaId);
    }
  }

  /**
   * Move o item para a {@code posicao} que o leitor vê, contada só entre os livros ativos. Livro
   * inativo continua gravado (com posição interna própria) mas não aparece, então a posição pedida
   * é traduzida para a posição gravada do livro visível que ocupa aquele lugar. Item de livro
   * inativo não é visível e responde como ausente.
   */
  @Transactional
  public ItemDeListaResposta mover(UUID eu, UUID listaId, UUID itemId, int posicao) {
    limite.registrar(eu);
    propriaAtivaOu404(eu, listaId);
    ItemDaLista item =
        listas
            .buscarItem(itemId)
            .filter(i -> i.listaId().equals(listaId) && i.livro().ativo())
            .orElseThrow(() -> naoEncontrado(ITEM_NAO_ENCONTRADO));

    long visiveis = listas.quantidadeAtiva(listaId);
    if (posicao < 1 || posicao > visiveis) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Escolha uma posição de 1 a " + visiveis + ".");
    }
    if (posicao == item.posicao()) {
      return mapear(item);
    }
    int destino = listas.ordemDaPosicaoVisivel(listaId, posicao).orElseThrow();
    listas.mover(listaId, itemId, item.ordem(), destino);
    listas.tocar(listaId);
    return mapear(listas.buscarItem(itemId).orElseThrow());
  }

  @Transactional(readOnly = true)
  public ListaItensResposta listarItens(UUID eu, UUID listaId, String cursor, int limit) {
    if (limit < 1 || limit > Paginacao.TAMANHO_MAXIMO) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Limite de 1 a " + Paginacao.TAMANHO_MAXIMO + ".");
    }
    CursorItemDeLista inicio = decodificar(cursor);
    Lista lista = ativaOu404(listaId, false);
    exigirVisivel(eu, lista.donoId(), LISTA_NAO_ENCONTRADA);

    // Um a mais que o limite, só para saber se há próximo segmento.
    List<ItemDaLista> segmento = listas.itensAtivos(listaId, inicio, limit + 1);
    boolean temMais = segmento.size() > limit;
    List<ItemDaLista> itens = temMais ? segmento.subList(0, limit) : segmento;
    ItemDaLista ultimo = itens.isEmpty() ? null : itens.get(itens.size() - 1);
    String proximoCursor =
        temMais ? new CursorItemDeLista(ultimo.ordem(), ultimo.id()).codificar() : null;
    return new ListaItensResposta(
        itens.stream().map(this::mapear).toList(), proximoCursor, temMais);
  }

  /** Índice das listas de um leitor (RF-LST-04, RF-SOC-02), sob RN-08. */
  @Transactional(readOnly = true)
  public PaginaListasResposta listarDoPerfil(UUID eu, UUID usuarioId, int page, int size) {
    Paginacao.validar(page, size);
    exigirVisivel(eu, usuarioId, LEITOR_NAO_ENCONTRADO);
    return pagina(usuarioId, null, page, size);
  }

  /** Listas do próprio leitor para o sheet "Adicionar à lista"; com livro, marca {@code contemLivro}. */
  @Transactional(readOnly = true)
  public PaginaListasResposta listarMinhas(UUID eu, UUID livroId, int page, int size) {
    Paginacao.validar(page, size);
    return pagina(eu, livroId, page, size);
  }

  private PaginaListasResposta pagina(UUID donoId, UUID livroId, int page, int size) {
    List<ResumoDaLista> resumos = listas.resumos(donoId, livroId, page, size);
    Map<UUID, List<LivroDeReferencia>> capas =
        listas.capas(resumos.stream().map(ResumoDaLista::id).toList());
    long total = listas.totalAtivas(donoId);
    int totalPaginas = (int) ((total + size - 1) / size);

    List<ListaResumoResposta> itens =
        resumos.stream()
            .map(
                r ->
                    new ListaResumoResposta(
                        r.id().toString(),
                        r.titulo(),
                        r.descricao(),
                        r.quantidadeLivros(),
                        capas.getOrDefault(r.id(), List.of()).stream()
                            .map(ServicoDeListas::capa)
                            .toList(),
                        r.atualizadoEm(),
                        r.contemLivro()))
            .toList();
    return new PaginaListasResposta(
        itens, page, size, total, totalPaginas, page >= totalPaginas - 1);
  }

  /**
   * RN-08 sobre o dono: devolve o perfil quando {@code eu} pode ver o conteúdo dele. Dono fora da
   * VIEW de perfil (suspenso, em exclusão, inexistente) é 404, inclusive para ele mesmo.
   */
  private PerfilDoDono exigirVisivel(UUID eu, UUID donoId, String mensagemDe404) {
    PerfilDoDono dono = perfilOu404(donoId, mensagemDe404);
    if (donoId.equals(eu) || dono.publico() || referencias.segue(eu, donoId)) {
      return dono;
    }
    throw new ErroDeNegocioException(CodigoErro.ACESSO_NEGADO, PERFIL_PRIVADO);
  }

  /**
   * RN-15.1: livro ativo, oficial ou pessoal do próprio leitor. Livro inexistente e livro pessoal
   * de outra pessoa dão a mesma resposta, para não confirmar que o livro alheio existe.
   */
  private void exigirLivroAceito(UUID eu, UUID livroId) {
    boolean aceito =
        referencias.livro(livroId).map(livro -> livro.podeEntrarNaListaDe(eu)).orElse(false);
    if (!aceito) {
      throw new ErroDeNegocioException(CodigoErro.ENTIDADE_NAO_PROCESSAVEL, LIVRO_RECUSADO);
    }
  }

  private PerfilDoDono perfilOu404(UUID usuarioId, String mensagem) {
    return referencias.perfil(usuarioId).orElseThrow(() -> naoEncontrado(mensagem));
  }

  private Lista ativaOu404(UUID listaId, boolean travar) {
    return listas
        .buscar(listaId, travar)
        .filter(Lista::ativo)
        .orElseThrow(() -> naoEncontrado(LISTA_NAO_ENCONTRADA));
  }

  private Lista propriaAtivaOu404(UUID eu, UUID listaId) {
    Lista lista = ativaOu404(listaId, true);
    if (!lista.pertenceA(eu)) {
      throw naoEncontrado(LISTA_NAO_ENCONTRADA);
    }
    return lista;
  }

  private ListaResposta mapear(Lista lista, PerfilDoDono dono, UUID eu) {
    return new ListaResposta(
        lista.id().toString(),
        new DonoDaListaResposta(
            dono.id().toString(), dono.username(), dono.nomeExibicao(), dono.avatarUrl()),
        lista.titulo(),
        lista.descricao(),
        listas.quantidadeAtiva(lista.id()),
        lista.pertenceA(eu),
        lista.criadoEm(),
        lista.atualizadoEm());
  }

  private ItemDeListaResposta mapear(ItemDaLista item) {
    LivroDeReferencia livro = item.livro();
    // Livro pessoal sai sempre com via=lista: o acervo dispensa a via quando quem abre é o dono.
    LinkLivroResposta link =
        livro.pessoal()
            ? new LinkLivroResposta(livro.id().toString(), "lista", item.listaId().toString())
            : new LinkLivroResposta(livro.id().toString(), "catalogo", null);
    return new ItemDeListaResposta(
        item.id().toString(),
        item.listaId().toString(),
        new LivroDaListaResposta(
            livro.id().toString(),
            livro.tipo().toUpperCase(Locale.ROOT),
            livro.titulo(),
            livro.autor(),
            livro.capaUrl(),
            link),
        item.posicao(),
        item.adicionadoEm());
  }

  private static CapaDaListaResposta capa(LivroDeReferencia livro) {
    return new CapaDaListaResposta(
        livro.id().toString(),
        livro.tipo().toUpperCase(Locale.ROOT),
        livro.titulo(),
        livro.capaUrl());
  }

  /** Descrição vazia ou só com espaços vale como "sem descrição" (contrato {@code CriarLista}). */
  static String normalizarDescricao(String descricao) {
    if (descricao == null) {
      return null;
    }
    String limpa = descricao.strip();
    return limpa.isEmpty() ? null : limpa;
  }

  private static CursorItemDeLista decodificar(String cursor) {
    if (cursor == null) {
      return null;
    }
    try {
      return CursorItemDeLista.decodificar(cursor);
    } catch (IllegalArgumentException erro) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Cursor de paginação inválido.");
    }
  }

  private static ErroDeNegocioException naoEncontrado(String mensagem) {
    return new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, mensagem);
  }
}
