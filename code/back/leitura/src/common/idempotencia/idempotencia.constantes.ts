/**
 * Janela de replay da resposta gravada.
 *
 * 24 horas cobre com folga a retentativa do cliente HTTP central (RNF-ERR-03) e
 * a fila offline do mobile (RNF-ERR-05), e mantém a tabela pequena. A
 * anonimização das linhas vencidas é assunto de LGPD — o CHECK
 * `idempotencia_leitura_anonimizacao_ck` já prevê o estado anonimizado.
 */
export const JANELA_REPLAY_HORAS = 24;

/**
 * Índice único parcial `(subject_ref, operacao, chave)` de
 * `idempotencia_leitura`. É por ele que a corrida entre duas requisições com a
 * mesma chave é detectada.
 */
export const INDICE_UNICO_IDEMPOTENCIA =
  'idempotencia_leitura_subject_operacao_chave_uk';
