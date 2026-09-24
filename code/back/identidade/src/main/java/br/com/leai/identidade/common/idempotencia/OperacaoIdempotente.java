package br.com.leai.identidade.common.idempotencia;

/**
 * Operações que aceitam {@code Idempotency-Key} (RNF-ERR-04).
 *
 * <p>O nome gravado é o {@code operationId} de {@code docs/api/identidade.yaml}, de propósito: o
 * índice único é {@code (subject_ref, operacao, chave)}, então o nome da operação faz parte da
 * identidade do recibo e precisa ser estável e rastreável ao contrato. Mesmo critério do
 * {@code idempotencia.constantes.ts} do {@code acervo}.
 */
public enum OperacaoIdempotente {
  CADASTRAR_USUARIO("cadastrarUsuario");

  private final String operationId;

  OperacaoIdempotente(String operationId) {
    this.operationId = operationId;
  }

  public String operationId() {
    return operationId;
  }
}
