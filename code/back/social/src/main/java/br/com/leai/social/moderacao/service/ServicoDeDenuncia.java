package br.com.leai.social.moderacao.service;

import br.com.leai.social.common.CodigoErro;
import br.com.leai.social.common.ErroDeNegocioException;
import br.com.leai.social.common.LimitePorUsuario;
import br.com.leai.social.feed.repository.AtividadeRepository;
import br.com.leai.social.lista.model.LivroDeReferencia;
import br.com.leai.social.lista.model.PerfilDoDono;
import br.com.leai.social.lista.repository.ReferenciasDeLista;
import br.com.leai.social.moderacao.dto.CriarDenunciaRequisicao;
import br.com.leai.social.moderacao.dto.DenunciaResposta;
import br.com.leai.social.moderacao.model.AlvoDaDenuncia;
import br.com.leai.social.moderacao.repository.ConteudoDenunciavel;
import br.com.leai.social.moderacao.repository.DenunciaRepository;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

/**
 * Denúncia de resenha e comentário pelo leitor (RF-MOD-01). O servidor confere o acesso atual ao
 * alvo: conhecer o id não autoriza a denúncia (RN-08, RN-15.4). Sem acesso, 404, como em toda
 * leitura de conteúdo alheio; conteúdo próprio, 422.
 *
 * <p>Roda dentro da transação do recibo de idempotência ({@code ServicoDeIdempotencia}).
 */
@Service
public class ServicoDeDenuncia {

  static final String NAO_ENCONTRADO = "Este conteúdo não está mais disponível.";

  private final ConteudoDenunciavel conteudo;
  private final ReferenciasDeLista referencias;
  private final AtividadeRepository atividades;
  private final DenunciaRepository denuncias;
  private final LimitePorUsuario limiteDeDenunciar;

  public ServicoDeDenuncia(
      ConteudoDenunciavel conteudo,
      ReferenciasDeLista referencias,
      AtividadeRepository atividades,
      DenunciaRepository denuncias,
      @Qualifier("limiteDeDenunciar") LimitePorUsuario limiteDeDenunciar) {
    this.conteudo = conteudo;
    this.referencias = referencias;
    this.atividades = atividades;
    this.denuncias = denuncias;
    this.limiteDeDenunciar = limiteDeDenunciar;
  }

  /** Denúncia criada ou a pendente que o leitor já tinha sobre o alvo. */
  public record Resultado(DenunciaResposta denuncia, boolean nova) {}

  public Resultado denunciar(UUID eu, CriarDenunciaRequisicao pedido) {
    String motivo = normalizarMotivo(pedido.motivo());
    limiteDeDenunciar.registrar(eu);

    AlvoDaDenuncia alvo =
        "comentario".equals(pedido.alvoTipo())
            ? comentarioAcessivel(eu, pedido.alvoId())
            : resenhaAcessivel(eu, pedido);

    return denuncias
        .criarSeNaoExiste(eu, alvo, motivo)
        .map(criada -> new Resultado(criada, true))
        .orElseGet(
            () ->
                new Resultado(
                    denuncias
                        .pendenteDe(eu, alvo.tipo(), alvo.id())
                        .orElseThrow(
                            () ->
                                new IllegalStateException(
                                    "Denúncia pendente sumiu entre o INSERT e a releitura")),
                    false));
  }

  static String normalizarMotivo(String bruto) {
    if (bruto == null || bruto.isBlank()) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "Escreva o motivo da denúncia para continuar.");
    }
    String motivo = bruto.strip();
    if (motivo.codePointCount(0, motivo.length()) > CriarDenunciaRequisicao.MOTIVO_MAXIMO) {
      throw new ErroDeNegocioException(
          CodigoErro.REQUISICAO_INVALIDA, "O motivo passou do limite de 500 caracteres.");
    }
    return motivo;
  }

  /** O comentário segue a visibilidade da atividade dele (RN-08/RN-09). */
  private AlvoDaDenuncia comentarioAcessivel(UUID eu, UUID comentarioId) {
    ConteudoDenunciavel.Comentario comentario =
        conteudo.comentario(comentarioId).orElseThrow(ServicoDeDenuncia::naoEncontrado);
    if (comentario.autorId().equals(eu)) {
      throw proprio("Você não pode denunciar o seu próprio comentário.");
    }
    if (!atividades.visivelPara(eu, comentario.atividadeId())) {
      throw naoEncontrado();
    }
    return new AlvoDaDenuncia(
        "comentario",
        comentario.id(),
        comentario.autorId(),
        comentario.livroId(),
        comentario.atividadeId(),
        comentario.atividadeAutorId());
  }

  /**
   * Porte da ordem de {@code leitura/src/reacoes/reacoes.service.ts#exigirAcesso}: a resenha
   * existe; o livro está ativo; ela é de outro leitor (422); o autor está na VIEW de perfil; quem
   * denuncia também está (403); e quem denuncia tem acesso à resenha. Livro oficial: perfil
   * público ou seguimento aceito. Livro pessoal: só pela via de RN-15 informada.
   */
  private AlvoDaDenuncia resenhaAcessivel(UUID eu, CriarDenunciaRequisicao pedido) {
    ConteudoDenunciavel.Resenha resenha =
        conteudo.resenha(pedido.alvoId()).orElseThrow(ServicoDeDenuncia::naoEncontrado);
    LivroDeReferencia livro =
        referencias
            .livro(resenha.livroId())
            .filter(LivroDeReferencia::ativo)
            .orElseThrow(ServicoDeDenuncia::naoEncontrado);
    if (resenha.autorId().equals(eu)) {
      throw proprio("Você não pode denunciar a sua própria resenha.");
    }
    PerfilDoDono autor = referencias.perfil(resenha.autorId()).orElseThrow(ServicoDeDenuncia::naoEncontrado);
    if (referencias.perfil(eu).isEmpty()) {
      throw new ErroDeNegocioException(
          CodigoErro.ACESSO_NEGADO, "Sua conta não pode enviar denúncias agora.");
    }

    boolean liberado =
        livro.pessoal()
            ? liberadoPelaVia(eu, resenha, livro, pedido)
            : autor.publico() || referencias.segue(eu, resenha.autorId());
    if (!liberado) {
      throw naoEncontrado();
    }
    UUID atividadeId = conteudo.atividadeDaResenha(resenha.id()).orElse(null);
    return new AlvoDaDenuncia(
        "resenha",
        resenha.id(),
        resenha.autorId(),
        resenha.livroId(),
        atividadeId,
        atividadeId == null ? null : resenha.autorId());
  }

  /** Livro pessoal: só o dono escreve resenha (RN-07), e terceiros chegam pelo feed ou pela lista. */
  private boolean liberadoPelaVia(
      UUID eu,
      ConteudoDenunciavel.Resenha resenha,
      LivroDeReferencia livro,
      CriarDenunciaRequisicao pedido) {
    if (pedido.via() == null
        || pedido.referenciaId() == null
        || !resenha.autorId().equals(livro.donoId())) {
      return false;
    }
    return "feed".equals(pedido.via())
        ? conteudo.viaFeed(pedido.referenciaId(), livro.id(), resenha.autorId(), eu)
        : conteudo.viaLista(pedido.referenciaId(), livro.id(), resenha.autorId(), eu);
  }

  private static ErroDeNegocioException naoEncontrado() {
    return new ErroDeNegocioException(CodigoErro.RECURSO_NAO_ENCONTRADO, NAO_ENCONTRADO);
  }

  private static ErroDeNegocioException proprio(String mensagem) {
    return new ErroDeNegocioException(CodigoErro.ENTIDADE_NAO_PROCESSAVEL, mensagem);
  }
}
