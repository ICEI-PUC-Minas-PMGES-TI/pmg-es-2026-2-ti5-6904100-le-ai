package br.com.leai.social.common.idempotencia;

/**
 * Operações que aceitam {@code Idempotency-Key} (RNF-ERR-04). Porte de {@code
 * identidade.common.idempotencia.OperacaoIdempotente}, sem {@code respostaSensivel}: nenhuma
 * resposta de {@code social} carrega token ou segredo, então o recibo nunca precisa de cifra.
 *
 * <p>O nome gravado é o {@code operationId} de {@code docs/api/social.yaml}, de propósito: o
 * índice único é {@code (subject_ref, operacao, chave)}, então o nome da operação faz parte da
 * identidade do recibo e precisa ser estável e rastreável ao contrato.
 *
 * <p>Começa com as três operações de escrita que {@code docs/api/social.yaml} já define; as
 * próximas tasks (feed, comentário, curtida) usam estes valores.
 */
public enum OperacaoIdempotente {
  CURTIR_ATIVIDADE("curtirAtividade"),
  DESCURTIR_ATIVIDADE("descurtirAtividade"),
  CRIAR_COMENTARIO("criarComentario");

  private final String operationId;

  OperacaoIdempotente(String operationId) {
    this.operationId = operationId;
  }

  public String operationId() {
    return operationId;
  }
}
