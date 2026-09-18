/**
 * Escopo da chave de idempotência: usuário autenticado + operação
 * (`docs/api/acervo.yaml`, parâmetro `IdempotencyKey`).
 *
 * Os nomes são os `operationId` do contrato, de propósito: o índice único é
 * `(subject_ref, operacao, chave)`, então o nome da operação é parte da
 * identidade do registro e precisa ser estável e rastreável ao spec.
 *
 * O id do recurso **não** entra aqui — ele entra no hash do payload. Reusar a
 * mesma chave em outro livro dá 409, que é o comportamento contratado.
 */
export const OPERACOES = {
  SOLICITAR_IMPORTACAO: 'solicitarImportacaoPorIsbn',
  REPROCESSAR_IMPORTACAO: 'reprocessarImportacaoPorIsbn',
  CRIAR_LIVRO_PESSOAL: 'criarLivroPessoal',
  ATUALIZAR_LIVRO_PESSOAL: 'atualizarLivroPessoal',
  EXCLUIR_LIVRO_PESSOAL: 'excluirLivroPessoal',
} as const;

export type Operacao = (typeof OPERACOES)[keyof typeof OPERACOES];

/**
 * Janela de replay da resposta gravada.
 *
 * 24 horas cobre com folga a retentativa do cliente HTTP central (RNF-ERR-03) e
 * mantém a tabela pequena. A anonimização das linhas vencidas é assunto de
 * LGPD, não desta feature — o CHECK `idempotencia_acervo_anonimizacao_ck` já
 * prevê o estado anonimizado.
 */
export const JANELA_REPLAY_HORAS = 24;
