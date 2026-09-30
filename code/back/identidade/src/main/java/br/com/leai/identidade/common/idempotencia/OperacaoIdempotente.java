package br.com.leai.identidade.common.idempotencia;

/**
 * Operações que aceitam {@code Idempotency-Key} (RNF-ERR-04).
 *
 * <p>O nome gravado é o {@code operationId} de {@code docs/api/identidade.yaml}, de propósito: o
 * índice único é {@code (subject_ref, operacao, chave)}, então o nome da operação faz parte da
 * identidade do recibo e precisa ser estável e rastreável ao contrato. Mesmo critério do
 * {@code idempotencia.constantes.ts} do {@code acervo}.
 *
 * <p>{@code respostaSensivel} marca as operações cuja resposta carrega token. O replay precisa
 * devolver a mesma sessão, então a resposta tem de ficar gravada; em claro, o refresh gravado no
 * recibo anularia o hash de {@code refresh_token}. Nessas o recibo guarda a resposta cifrada.
 */
public enum OperacaoIdempotente {
  CADASTRAR_USUARIO("cadastrarUsuario", false),
  AUTENTICAR_USUARIO("autenticarUsuario", true),
  RENOVAR_SESSAO("renovarSessao", true),
  ENCERRAR_SESSAO("encerrarSessao", false),
  ALTERAR_SENHA("alterarSenha", false),
  SOLICITAR_RECUPERACAO("solicitarRecuperacaoSenha", false),
  REDEFINIR_SENHA("redefinirSenha", false),
  ATUALIZAR_PERFIL("atualizarMeuPerfil", false),
  SEGUIR_PERFIL("seguirPerfil", false),
  DEIXAR_DE_SEGUIR("deixarDeSeguirPerfil", false),
  REMOVER_SEGUIDOR("removerSeguidor", false),
  ACEITAR_SOLICITACAO("aceitarSolicitacao", false),
  RECUSAR_SOLICITACAO("recusarSolicitacao", false);

  private final String operationId;
  private final boolean respostaSensivel;

  OperacaoIdempotente(String operationId, boolean respostaSensivel) {
    this.operationId = operationId;
    this.respostaSensivel = respostaSensivel;
  }

  public String operationId() {
    return operationId;
  }

  public boolean respostaSensivel() {
    return respostaSensivel;
  }
}
