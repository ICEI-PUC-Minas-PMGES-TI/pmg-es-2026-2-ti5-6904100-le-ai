package br.com.leai.identidade.auth.dto;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Resposta de {@code POST /auth/login}: a sessão normal ou, para conta com exclusão pendente, o
 * acesso de recuperação (F-CONTA-2, RN-23.3). O cliente distingue as duas pelo campo {@code tipo}.
 *
 * <p>A informação de tipo é o próprio campo {@code tipo} dos dois records, e não uma propriedade
 * extra: o replay da idempotência relê a resposta gravada por esta interface. {@code defaultImpl}
 * cobre os recibos de login gravados antes de F-CONTA-2, que não tinham {@code tipo}.
 */
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.EXISTING_PROPERTY,
    property = "tipo",
    visible = true,
    defaultImpl = SessaoResposta.class)
@JsonSubTypes({
  @JsonSubTypes.Type(value = SessaoResposta.class, name = SessaoResposta.TIPO_SESSAO),
  @JsonSubTypes.Type(
      value = AcessoDeRecuperacaoResposta.class,
      name = AcessoDeRecuperacaoResposta.TIPO_RECUPERACAO)
})
public sealed interface RespostaDeLogin permits SessaoResposta, AcessoDeRecuperacaoResposta {

  String tipo();

  String accessToken();
}
