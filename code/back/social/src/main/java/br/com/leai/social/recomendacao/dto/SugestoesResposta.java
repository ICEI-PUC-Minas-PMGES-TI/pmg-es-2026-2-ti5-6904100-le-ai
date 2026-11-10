package br.com.leai.social.recomendacao.dto;

import br.com.leai.social.feed.dto.LivroSnapshotResposta;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * As duas seções de sugestão (RF-REC-08/09). Sem {@code secao} na consulta vêm as duas; com ela,
 * só a pedida, e a outra fica nula. Seção sem itens vem com a lista vazia, e o cliente a esconde.
 */
@Schema(name = "Sugestoes")
public record SugestoesResposta(Secao seguidos, Secao gosto) {

  /** {@code proximoOffset} é o que o cliente manda para pedir mais; nulo quando a seção acabou. */
  @Schema(name = "SecaoDeSugestoes")
  public record Secao(List<Sugestao> itens, Integer proximoOffset) {}

  @Schema(name = "Sugestao")
  public record Sugestao(LivroSnapshotResposta livro, Motivo motivo) {}

  /** {@code tipo}: SEGUIDOS, SERIE, AUTOR ou ASSUNTO. {@code texto} já vem pronto para exibir. */
  @Schema(name = "MotivoDaSugestao")
  public record Motivo(String tipo, String texto) {}
}
