package br.com.leai.social.recomendacao.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.feed.dto.LinkLivroResposta;
import br.com.leai.social.feed.dto.LivroSnapshotResposta;
import br.com.leai.social.recomendacao.dto.DescarteEmLoteResposta;
import br.com.leai.social.recomendacao.dto.RestantesDoLivroResposta;
import br.com.leai.social.recomendacao.dto.SugestoesResposta;
import br.com.leai.social.recomendacao.repository.RecomendacaoRepository;
import br.com.leai.social.recomendacao.repository.SugestaoRepository;
import br.com.leai.social.recomendacao.repository.SugestaoRepository.Sugestao;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Recomendação algorítmica e descarte em lote (F-REC-ALG, RF-REC-08..12 e 17).
 *
 * <p>Os pisos e os tamanhos vêm de {@code leai.sugestoes.*}, para o grupo calibrar na massa de DES
 * sem mexer em código. O texto do motivo sai da mesma linha que trouxe o livro (RF-REC-11).
 */
@Service
public class ServicoDeSugestao {

  public static final String SECAO_SEGUIDOS = "seguidos";
  public static final String SECAO_GOSTO = "gosto";

  private static final String VIA_CATALOGO = "catalogo";

  private final SugestaoRepository sugestoes;
  private final RecomendacaoRepository recomendacoes;
  private final int minimoDeLeitores;
  private final BigDecimal notaMediaMinima;
  private final int minimoPorAssunto;
  private final int assuntosConsiderados;
  private final int tamanhoDaPagina;
  private final int tetoPorSecao;

  public ServicoDeSugestao(
      SugestaoRepository sugestoes,
      RecomendacaoRepository recomendacoes,
      @Value("${leai.sugestoes.minimo-de-leitores:1}") int minimoDeLeitores,
      @Value("${leai.sugestoes.nota-media-minima:3.5}") BigDecimal notaMediaMinima,
      @Value("${leai.sugestoes.minimo-de-livros-por-assunto:2}") int minimoPorAssunto,
      @Value("${leai.sugestoes.assuntos-considerados:3}") int assuntosConsiderados,
      @Value("${leai.sugestoes.tamanho-da-pagina:4}") int tamanhoDaPagina,
      @Value("${leai.sugestoes.teto-por-secao:24}") int tetoPorSecao) {
    this.sugestoes = sugestoes;
    this.recomendacoes = recomendacoes;
    this.minimoDeLeitores = minimoDeLeitores;
    this.notaMediaMinima = notaMediaMinima;
    this.minimoPorAssunto = minimoPorAssunto;
    this.assuntosConsiderados = assuntosConsiderados;
    this.tamanhoDaPagina = tamanhoDaPagina;
    this.tetoPorSecao = tetoPorSecao;
  }

  @Transactional(readOnly = true)
  public SugestoesResposta sugestoes(UUID leitorId, String secao, int offset) {
    if (offset < 0 || (secao == null && offset != 0)) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Informe a seção para pedir mais sugestões.");
    }
    if (secao == null) {
      return new SugestoesResposta(seguidos(leitorId, 0), gosto(leitorId, 0));
    }
    return switch (secao) {
      case SECAO_SEGUIDOS -> new SugestoesResposta(seguidos(leitorId, offset), null);
      case SECAO_GOSTO -> new SugestoesResposta(null, gosto(leitorId, offset));
      default ->
          throw new ErroDeNegocioException(
              CodigoErro.REQUISICAO_INVALIDA, "Seção de sugestões desconhecida.");
    };
  }

  @Transactional
  public void descartar(UUID leitorId, UUID livroId) {
    if (!sugestoes.sugerivel(livroId)) {
      throw new ErroDeNegocioException(
          CodigoErro.RECURSO_NAO_ENCONTRADO, "Esta sugestão não está mais disponível.");
    }
    sugestoes.descartar(leitorId, livroId);
  }

  @Transactional(readOnly = true)
  public RestantesDoLivroResposta restantes(UUID destinatarioId, UUID livroId) {
    return new RestantesDoLivroResposta(
        recomendacoes.contarRecebidasDoLivro(destinatarioId, livroId));
  }

  /**
   * RF-REC-17: a quarta via de remoção de RN-22, sem aviso ao remetente e sem volta. Devolve as
   * que o leitor via na lista; as de remetente oculto saem junto, para não reaparecerem depois.
   */
  @Transactional
  public DescarteEmLoteResposta descartarLote(UUID destinatarioId, UUID livroId) {
    long visiveis = recomendacoes.contarRecebidasDoLivro(destinatarioId, livroId);
    recomendacoes.removerAtivasDoLivro(destinatarioId, livroId);
    return new DescarteEmLoteResposta(visiveis);
  }

  private SugestoesResposta.Secao seguidos(UUID leitorId, int offset) {
    int limite = limite(offset);
    return secao(
        limite == 0
            ? List.of()
            : sugestoes.lidosPorQuemSigo(
                leitorId, minimoDeLeitores, notaMediaMinima, limite, offset),
        offset);
  }

  private SugestoesResposta.Secao gosto(UUID leitorId, int offset) {
    int limite = limite(offset);
    return secao(
        limite == 0
            ? List.of()
            : sugestoes.doMeuGosto(
                leitorId, minimoPorAssunto, assuntosConsiderados, limite, offset),
        offset);
  }

  /** Uma linha a mais que a página, para saber se há próxima; nunca além do teto da seção. */
  private int limite(int offset) {
    return Math.max(0, Math.min(tamanhoDaPagina + 1, tetoPorSecao - offset));
  }

  private SugestoesResposta.Secao secao(List<Sugestao> linhas, int offset) {
    boolean temMais = linhas.size() > tamanhoDaPagina;
    List<SugestoesResposta.Sugestao> itens =
        linhas.stream().limit(tamanhoDaPagina).map(ServicoDeSugestao::item).toList();
    return new SugestoesResposta.Secao(itens, temMais ? offset + itens.size() : null);
  }

  private static SugestoesResposta.Sugestao item(Sugestao s) {
    String id = s.livroId().toString();
    return new SugestoesResposta.Sugestao(
        new LivroSnapshotResposta(
            id,
            "OFICIAL",
            s.titulo(),
            s.autor(),
            s.capaUrl(),
            new LinkLivroResposta(id, VIA_CATALOGO, null)),
        new SugestoesResposta.Motivo(s.tipo(), textoDoMotivo(s)));
  }

  static String textoDoMotivo(Sugestao s) {
    return switch (s.tipo()) {
      case "SEGUIDOS" ->
          s.quantidade() == 1
              ? "1 pessoa que você segue leu"
              : s.quantidade() + " pessoas que você segue leram";
      case "SERIE" -> "Continuação de " + s.referencia();
      case "AUTOR" -> "Do mesmo autor de " + s.referencia();
      case "ASSUNTO" -> "Você lê muito " + s.referencia();
      default -> throw new IllegalStateException("Motivo de sugestão desconhecido: " + s.tipo());
    };
  }
}
