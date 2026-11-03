package br.com.leai.social.recomendacao.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.common.LimitePorUsuario;
import br.com.leai.social.common.Paginacao;
import br.com.leai.social.feed.dto.AutorSnapshotResposta;
import br.com.leai.social.feed.dto.LinkLivroResposta;
import br.com.leai.social.feed.dto.LivroSnapshotResposta;
import br.com.leai.social.recomendacao.dto.CandidatoResposta;
import br.com.leai.social.recomendacao.dto.CriarRecomendacaoRequisicao;
import br.com.leai.social.recomendacao.dto.ListaCandidatosResposta;
import br.com.leai.social.recomendacao.dto.PaginaRecomendacoesResposta;
import br.com.leai.social.recomendacao.dto.RecomendacaoRecebidaResposta;
import br.com.leai.social.recomendacao.dto.ResultadoPorDestinatarioResposta;
import br.com.leai.social.recomendacao.dto.ResultadoRecomendacaoResposta;
import br.com.leai.social.recomendacao.repository.RecomendacaoRepository;
import br.com.leai.social.recomendacao.repository.RecomendacaoRepository.LivroDeReferencia;
import br.com.leai.social.recomendacao.repository.RecomendacaoRepository.Perfil;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ServicoDeRecomendacao {

  public static final int LIMITE_ATIVAS_POR_PAR = 50;

  public static final int CANDIDATOS_MAXIMO = 500;

  static final String SEM_MUTUO = "SEM_MUTUO";
  static final String JA_TEM_LIVRO = "JA_TEM_LIVRO";
  static final String LIMITE_ATINGIDO = "LIMITE_ATINGIDO";
  static final String JA_RECOMENDADO = "JA_RECOMENDADO";

  private static final String VIA_CATALOGO = "catalogo";

  private final RecomendacaoRepository repositorio;
  private final EventosDeRecomendacao eventos;
  private final LimitePorUsuario limiteDeRecomendar;

  public ServicoDeRecomendacao(
      RecomendacaoRepository repositorio,
      EventosDeRecomendacao eventos,
      @Qualifier("limiteDeRecomendar") LimitePorUsuario limiteDeRecomendar) {
    this.repositorio = repositorio;
    this.eventos = eventos;
    this.limiteDeRecomendar = limiteDeRecomendar;
  }

  @Transactional
  public ResultadoRecomendacaoResposta recomendar(UUID remetenteId, CriarRecomendacaoRequisicao pedido) {
    List<UUID> destinatarios = semRepeticao(pedido.destinatarios());
    String mensagem = normalizarMensagem(pedido.mensagem());
    limiteDeRecomendar.registrar(remetenteId);
    LivroDeReferencia livro = livroRecomendavel(pedido.livroId());

    repositorio.travarRemetente(remetenteId);
    Set<UUID> mutuos = repositorio.mutuos(remetenteId, destinatarios);
    Set<UUID> comLivro = repositorio.comLivroNaEstante(livro.id(), destinatarios);
    Set<UUID> jaRecomendados = repositorio.jaRecomendados(remetenteId, livro.id(), destinatarios);
    Map<UUID, Long> ativas = repositorio.ativasPorDestinatario(remetenteId, destinatarios);

    Map<String, Object> remetente = null;
    List<ResultadoPorDestinatarioResposta> resultados = new ArrayList<>();
    int criadas = 0;
    for (UUID destinatario : destinatarios) {
      String motivo =
          motivoDeBloqueio(
              mutuos.contains(destinatario),
              comLivro.contains(destinatario),
              jaRecomendados.contains(destinatario),
              ativas.getOrDefault(destinatario, 0L));
      if (motivo != null) {
        resultados.add(ResultadoPorDestinatarioResposta.bloqueada(destinatario.toString(), motivo));
        continue;
      }
      if (remetente == null) {
        remetente = eventos.remetente(remetenteId);
      }
      UUID recomendacaoId = UUID.randomUUID();
      UUID eventId =
          eventos.recomendacaoRecebida(recomendacaoId, destinatario, livro, remetente, mensagem);
      repositorio.inserir(recomendacaoId, remetenteId, destinatario, livro.id(), mensagem, eventId);
      resultados.add(
          ResultadoPorDestinatarioResposta.criada(destinatario.toString(), recomendacaoId.toString()));
      criadas++;
    }
    return new ResultadoRecomendacaoResposta(resultados, criadas);
  }

  @Transactional(readOnly = true)
  public ListaCandidatosResposta candidatos(UUID remetenteId, UUID livroId) {
    LivroDeReferencia livro = livroRecomendavel(livroId);
    return new ListaCandidatosResposta(
        repositorio.candidatos(remetenteId, livro.id(), LIMITE_ATIVAS_POR_PAR, CANDIDATOS_MAXIMO).stream()
            .map(
                candidato ->
                    new CandidatoResposta(
                        autor(candidato.leitor()), candidato.jaTemLivro(), candidato.limiteAtingido()))
            .toList());
  }

  @Transactional(readOnly = true)
  public PaginaRecomendacoesResposta recebidas(UUID destinatarioId, int page, int size) {
    Paginacao.validar(page, size);
    long total = repositorio.contarRecebidas(destinatarioId);
    List<RecomendacaoRecebidaResposta> itens =
        repositorio.recebidas(destinatarioId, page, size).stream()
            .map(
                recebida ->
                    new RecomendacaoRecebidaResposta(
                        recebida.id().toString(),
                        autor(recebida.remetente()),
                        livro(recebida.livro()),
                        recebida.mensagem(),
                        recebida.criadoEm(),
                        recebida.expiraEm()))
            .toList();
    int totalPaginas = (int) ((total + size - 1) / size);
    return new PaginaRecomendacoesResposta(
        itens, page, size, total, totalPaginas, page >= totalPaginas - 1);
  }

  @Transactional
  public void descartar(UUID destinatarioId, UUID recomendacaoId) {
    if (!repositorio.removerDoDestinatario(recomendacaoId, destinatarioId)) {
      throw new ErroDeNegocioException(
          CodigoErro.RECURSO_NAO_ENCONTRADO, "Esta recomendação não está mais disponível.");
    }
  }

  private LivroDeReferencia livroRecomendavel(UUID livroId) {
    LivroDeReferencia livro =
        repositorio
            .livro(livroId)
            .orElseThrow(
                () ->
                    new ErroDeNegocioException(
                        CodigoErro.RECURSO_NAO_ENCONTRADO, "Não encontramos esse livro."));
    if (livro.pessoal()) {
      throw new ErroDeNegocioException(
          CodigoErro.ENTIDADE_NAO_PROCESSAVEL, "Livros pessoais não podem ser recomendados.");
    }
    return livro;
  }

  private static String motivoDeBloqueio(
      boolean mutuo, boolean temLivro, boolean jaRecomendado, long ativasNoPar) {
    if (!mutuo) {
      return SEM_MUTUO;
    }
    if (temLivro) {
      return JA_TEM_LIVRO;
    }
    if (jaRecomendado) {
      return JA_RECOMENDADO;
    }
    if (ativasNoPar >= LIMITE_ATIVAS_POR_PAR) {
      return LIMITE_ATINGIDO;
    }
    return null;
  }

  private static List<UUID> semRepeticao(List<UUID> destinatarios) {
    if (new HashSet<>(destinatarios).size() != destinatarios.size()) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Cada leitor só pode aparecer uma vez no envio.");
    }
    return destinatarios;
  }

  private static String normalizarMensagem(String bruta) {
    if (bruta == null || bruta.isBlank()) {
      return null;
    }
    String mensagem = bruta.strip();
    if (mensagem.codePointCount(0, mensagem.length()) > CriarRecomendacaoRequisicao.MENSAGEM_MAXIMA) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "A mensagem pode ter até 280 caracteres.");
    }
    return mensagem;
  }

  private static AutorSnapshotResposta autor(Perfil perfil) {
    return new AutorSnapshotResposta(
        perfil.id().toString(), perfil.username(), perfil.nomeExibicao(), perfil.avatarUrl());
  }

  private static LivroSnapshotResposta livro(LivroDeReferencia livro) {
    return new LivroSnapshotResposta(
        livro.id().toString(),
        livro.tipo().toUpperCase(Locale.ROOT),
        livro.titulo(),
        livro.autor(),
        livro.capaUrl(),
        new LinkLivroResposta(livro.id().toString(), VIA_CATALOGO, null));
  }
}
