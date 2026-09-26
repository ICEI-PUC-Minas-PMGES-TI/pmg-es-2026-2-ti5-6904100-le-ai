/**
 * Máquina de estados da leitura (RN-04) e regra de inatividade (RN-05).
 * Domínio puro: sem I/O e sem Nest. Os valores espelham os CHECKs de
 * `estante.status` e `leitura.status` em `src/db/schema.ts`.
 */

export const STATUS_ESTANTE = [
  'quero_ler',
  'lendo',
  'lido',
  'relendo',
  'abandonado',
] as const;
export type StatusEstante = (typeof STATUS_ESTANTE)[number];

export const STATUS_LEITURA = ['lendo', 'lido', 'abandonado'] as const;
export type StatusLeitura = (typeof STATUS_LEITURA)[number];

export type EventoEstante =
  | 'adicionar'
  | 'remover'
  | 'iniciar'
  | 'iniciarReleitura'
  | 'finalizar'
  | 'abandonar'
  | 'retomar';

export type EventoPublicado =
  | 'livro.adicionado_a_estante'
  | 'leitura.iniciada'
  | 'leitura.finalizada'
  | 'leitura.abandonada'
  | 'leitura.retomada';

export interface OcorrenciaLeitura {
  status: StatusLeitura;
  releitura: boolean;
  incompleta: boolean;
  paginaAtual: number;
}

export interface SnapshotEstante {
  /** `null` quando o livro não está na estante do usuário. */
  status: StatusEstante | null;
  vezesLido: number;
  /** Ocorrência de leitura mais recente, se houver. */
  leituraAtual: OcorrenciaLeitura | null;
  possuiHistorico: boolean;
}

export type MudancaLeitura =
  | { acao: 'criar'; releitura: boolean }
  /** status `lido`, grava data de fim/finalização. */
  | { acao: 'finalizar' }
  /**
   * Primeira leitura: status `abandonado`, retomável.
   * Releitura: status `lido` com `incompleta`, sem data de fim, não retomável.
   */
  | { acao: 'abandonar'; incompleta: boolean; retomavel: boolean }
  /** status volta a `lendo`, preservando a página registrada. */
  | { acao: 'retomar'; paginaAtual: number };

export interface Transicao {
  /** `null` = vínculo de estante removido. */
  statusEstante: StatusEstante | null;
  deltaVezesLido: 0 | 1;
  leitura: MudancaLeitura | null;
  eventoPublicado: EventoPublicado | null;
}

export type CodigoTransicaoInvalida =
  | 'JA_NA_ESTANTE'
  | 'FORA_DA_ESTANTE'
  | 'POSSUI_HISTORICO'
  | 'REMOCAO_NAO_PERMITIDA'
  | 'LEITURA_EM_ANDAMENTO'
  | 'LIVRO_JA_CONCLUIDO'
  | 'LEITURA_ABANDONADA_RETOMAVEL'
  | 'LIVRO_NAO_CONCLUIDO'
  | 'SEM_LEITURA_EM_ANDAMENTO'
  | 'NADA_A_RETOMAR';

export interface TransicaoInvalida {
  tipo: 'TRANSICAO_INVALIDA';
  codigo: CodigoTransicaoInvalida;
  evento: EventoEstante;
  statusAtual: StatusEstante | null;
  motivo: string;
}

export type ResultadoTransicao =
  { ok: true; transicao: Transicao } | { ok: false; erro: TransicaoInvalida };

const MOTIVOS: Record<CodigoTransicaoInvalida, string> = {
  JA_NA_ESTANTE: 'O livro já está na estante.',
  FORA_DA_ESTANTE: 'O livro não está na estante.',
  POSSUI_HISTORICO: 'Não é possível remover um livro com histórico de leitura.',
  REMOCAO_NAO_PERMITIDA: 'Só é possível remover livros em "Quero ler".',
  LEITURA_EM_ANDAMENTO: 'Já existe uma leitura em andamento para este livro.',
  LIVRO_JA_CONCLUIDO:
    'O livro já foi concluído; inicie uma releitura em vez de uma nova leitura.',
  LEITURA_ABANDONADA_RETOMAVEL:
    'A leitura abandonada deve ser retomada em vez de iniciada novamente.',
  LIVRO_NAO_CONCLUIDO: 'Só é possível reler um livro já concluído.',
  SEM_LEITURA_EM_ANDAMENTO: 'Não há leitura em andamento para este livro.',
  NADA_A_RETOMAR: 'Não há leitura abandonada retomável para este livro.',
};

function invalida(
  snapshot: SnapshotEstante,
  evento: EventoEstante,
  codigo: CodigoTransicaoInvalida,
): ResultadoTransicao {
  return {
    ok: false,
    erro: {
      tipo: 'TRANSICAO_INVALIDA',
      codigo,
      evento,
      statusAtual: snapshot.status,
      motivo: MOTIVOS[codigo],
    },
  };
}

function valida(transicao: Transicao): ResultadoTransicao {
  return { ok: true, transicao };
}

function emAndamento(snapshot: SnapshotEstante): boolean {
  return (
    (snapshot.status === 'lendo' || snapshot.status === 'relendo') &&
    snapshot.leituraAtual?.status === 'lendo'
  );
}

function retomavel(snapshot: SnapshotEstante): boolean {
  const atual = snapshot.leituraAtual;
  return (
    snapshot.status === 'abandonado' &&
    atual?.status === 'abandonado' &&
    !atual.releitura
  );
}

function adicionar(snapshot: SnapshotEstante): ResultadoTransicao {
  if (snapshot.status !== null) {
    return invalida(snapshot, 'adicionar', 'JA_NA_ESTANTE');
  }
  return valida({
    statusEstante: 'quero_ler',
    deltaVezesLido: 0,
    leitura: null,
    eventoPublicado: 'livro.adicionado_a_estante',
  });
}

function remover(snapshot: SnapshotEstante): ResultadoTransicao {
  if (snapshot.status === null) {
    return invalida(snapshot, 'remover', 'FORA_DA_ESTANTE');
  }
  if (snapshot.status !== 'quero_ler') {
    return invalida(snapshot, 'remover', 'REMOCAO_NAO_PERMITIDA');
  }
  if (snapshot.possuiHistorico) {
    return invalida(snapshot, 'remover', 'POSSUI_HISTORICO');
  }
  return valida({
    statusEstante: null,
    deltaVezesLido: 0,
    leitura: null,
    eventoPublicado: null,
  });
}

function iniciar(snapshot: SnapshotEstante): ResultadoTransicao {
  if (snapshot.status === 'lendo' || snapshot.status === 'relendo') {
    return invalida(snapshot, 'iniciar', 'LEITURA_EM_ANDAMENTO');
  }
  if (snapshot.vezesLido > 0 || snapshot.status === 'lido') {
    return invalida(snapshot, 'iniciar', 'LIVRO_JA_CONCLUIDO');
  }
  if (snapshot.status === 'abandonado') {
    return invalida(snapshot, 'iniciar', 'LEITURA_ABANDONADA_RETOMAVEL');
  }
  return valida({
    statusEstante: 'lendo',
    deltaVezesLido: 0,
    leitura: { acao: 'criar', releitura: false },
    eventoPublicado: 'leitura.iniciada',
  });
}

function iniciarReleitura(snapshot: SnapshotEstante): ResultadoTransicao {
  if (snapshot.status === 'lendo' || snapshot.status === 'relendo') {
    return invalida(snapshot, 'iniciarReleitura', 'LEITURA_EM_ANDAMENTO');
  }
  if (snapshot.status !== 'lido' || snapshot.vezesLido === 0) {
    return invalida(snapshot, 'iniciarReleitura', 'LIVRO_NAO_CONCLUIDO');
  }
  return valida({
    statusEstante: 'relendo',
    deltaVezesLido: 0,
    leitura: { acao: 'criar', releitura: true },
    eventoPublicado: 'leitura.iniciada',
  });
}

function finalizar(snapshot: SnapshotEstante): ResultadoTransicao {
  if (!emAndamento(snapshot)) {
    return invalida(snapshot, 'finalizar', 'SEM_LEITURA_EM_ANDAMENTO');
  }
  return valida({
    statusEstante: 'lido',
    deltaVezesLido: 1,
    leitura: { acao: 'finalizar' },
    eventoPublicado: 'leitura.finalizada',
  });
}

function abandonar(snapshot: SnapshotEstante): ResultadoTransicao {
  if (!emAndamento(snapshot)) {
    return invalida(snapshot, 'abandonar', 'SEM_LEITURA_EM_ANDAMENTO');
  }
  const eraReleitura = snapshot.status === 'relendo';
  return valida({
    statusEstante: eraReleitura ? 'lido' : 'abandonado',
    deltaVezesLido: 0,
    leitura: {
      acao: 'abandonar',
      incompleta: eraReleitura,
      retomavel: !eraReleitura,
    },
    eventoPublicado: 'leitura.abandonada',
  });
}

function retomar(snapshot: SnapshotEstante): ResultadoTransicao {
  if (!retomavel(snapshot) || snapshot.leituraAtual === null) {
    return invalida(snapshot, 'retomar', 'NADA_A_RETOMAR');
  }
  return valida({
    statusEstante: 'lendo',
    deltaVezesLido: 0,
    leitura: {
      acao: 'retomar',
      paginaAtual: snapshot.leituraAtual.paginaAtual,
    },
    eventoPublicado: 'leitura.retomada',
  });
}

const TRANSICOES: Record<
  EventoEstante,
  (snapshot: SnapshotEstante) => ResultadoTransicao
> = {
  adicionar,
  remover,
  iniciar,
  iniciarReleitura,
  finalizar,
  abandonar,
  retomar,
};

export function aplicarEvento(
  snapshot: SnapshotEstante,
  evento: EventoEstante,
): ResultadoTransicao {
  return TRANSICOES[evento](snapshot);
}

// ---------------------------------------------------------------- RN-05

export const LIMIARES_RISCO_DIAS = [20, 30] as const;
export const LIMIAR_EXPIRACAO_DIAS = 40;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export type TipoLimiar = 'risco' | 'expiracao';

export interface LimiarInatividade {
  dias: number;
  tipo: TipoLimiar;
}

const LIMIARES: readonly LimiarInatividade[] = [
  ...LIMIARES_RISCO_DIAS.map((dias) => ({ dias, tipo: 'risco' as const })),
  { dias: LIMIAR_EXPIRACAO_DIAS, tipo: 'expiracao' },
];

export interface EntradaInatividade {
  dataInicio: Date;
  ultimaAtividadeEm: Date | null;
  dataReferencia: Date;
}

export interface ResultadoInatividade {
  /** Dias completos desde a última atividade (ou desde o início). */
  diasInativo: number;
  /** Limiares já atingidos, em ordem crescente; o job filtra os já processados. */
  limiaresDevidos: LimiarInatividade[];
}

export function avaliarInatividade({
  dataInicio,
  ultimaAtividadeEm,
  dataReferencia,
}: EntradaInatividade): ResultadoInatividade {
  const base = ultimaAtividadeEm ?? dataInicio;
  const decorrido = dataReferencia.getTime() - base.getTime();
  const diasInativo = Math.max(0, Math.floor(decorrido / MS_POR_DIA));
  return {
    diasInativo,
    limiaresDevidos: LIMIARES.filter(({ dias }) => diasInativo >= dias),
  };
}
