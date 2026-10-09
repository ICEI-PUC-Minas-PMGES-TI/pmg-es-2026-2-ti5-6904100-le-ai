/**
 * Operações idempotentes de `leitura`, pelos `operationId` de
 * `docs/api/leitura.yaml`. Cada feature acrescenta as suas aqui.
 *
 * Os nomes são os do contrato, de propósito: o índice único é
 * `(subject_ref, operacao, chave)`, então o nome da operação é parte da
 * identidade do registro e precisa ser estável e rastreável ao spec.
 */
export const OPERACOES = {
  SALVAR_NOTA: 'salvarNota',
  EXCLUIR_NOTA: 'excluirNota',
  SALVAR_RESENHA: 'salvarResenha',
  EXCLUIR_RESENHA: 'excluirResenha',
  REAGIR_RESENHA: 'reagirResenha',
  REMOVER_REACAO_RESENHA: 'removerReacaoResenha',
  ADICIONAR_LIVRO_ESTANTE: 'adicionarLivroEstante',
  REMOVER_LIVRO_ESTANTE: 'removerLivroEstante',
  INICIAR_LEITURA: 'iniciarLeitura',
  INICIAR_RELEITURA: 'iniciarReleitura',
  FINALIZAR_LEITURA: 'finalizarLeitura',
  ABANDONAR_LEITURA: 'abandonarLeitura',
  RETOMAR_LEITURA: 'retomarLeitura',
  PROCESSAR_INATIVIDADE_LEITURAS: 'processarInatividadeLeituras',
  REGISTRAR_PROGRESSO: 'registrarProgresso',
  EXCLUIR_TRECHO_PROGRESSO: 'excluirTrechoProgresso',
} as const;

export type Operacao = (typeof OPERACOES)[keyof typeof OPERACOES];

/**
 * Escopo gravado em `idempotencia_leitura.operacao`: a operação mais os ids do
 * caminho, por exemplo `salvarNota:<livroId>`.
 *
 * O `leitura.yaml` define o escopo da chave como "ator autenticado, método e
 * caminho canônico". O caminho canônico inclui o id do recurso, então a mesma
 * chave em outro livro é **outra** operação, não um 409. É aqui que `leitura`
 * difere do `acervo`, onde o id vai para o hash do payload e reusar a chave em
 * outro livro dá 409.
 */
export function operacaoNoCaminho(
  operacao: Operacao,
  ...idsDoCaminho: string[]
): string {
  return [operacao, ...idsDoCaminho.map((id) => id.toLowerCase())].join(':');
}

/**
 * Janela de replay da resposta gravada.
 *
 * 24 horas cobre com folga a retentativa do cliente HTTP central (RNF-ERR-03) e
 * mantém a tabela pequena. A anonimização das linhas vencidas é assunto de
 * LGPD — o CHECK `idempotencia_leitura_anonimizacao_ck` já prevê o estado
 * anonimizado.
 */
export const JANELA_REPLAY_HORAS = 24;
