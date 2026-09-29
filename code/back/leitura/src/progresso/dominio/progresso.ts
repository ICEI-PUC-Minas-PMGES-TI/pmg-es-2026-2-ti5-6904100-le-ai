export const SEM_TEMPO = 0;
export const MINUTOS_MAXIMOS = 720;
export const PAGINA_SEM_PROGRESSO = 0;
export const PERCENTUAL_MAXIMO = 100;

export type CodigoProgressoInvalido =
  | 'PAGINA_NAO_AVANCA'
  | 'PAGINA_ACIMA_DO_TOTAL'
  | 'MINUTOS_FORA_DO_INTERVALO'
  | 'PROGRESSO_NAO_ENCONTRADO'
  | 'ULTIMO_PROGRESSO_DIVERGENTE';

export interface ProgressoInvalido {
  tipo: 'PROGRESSO_INVALIDO';
  codigo: CodigoProgressoInvalido;
  motivo: string;
}

export type Falha = { ok: false; erro: ProgressoInvalido };

export type ResultadoPagina = { ok: true; paginasLidas: number } | Falha;

export type ResultadoMinutos = { ok: true } | Falha;

export type ResultadoExclusao =
  { ok: true; idsRemovidos: string[]; paginaAtual: number } | Falha;

export interface RegistroOrdenado {
  id: string;
  ordem: number;
  pagina: number;
}

export interface ResumoProgresso {
  paginaAtual: number;
  totalPaginas: number;
  percentualConcluido: number;
  minutosTotais: number;
}

const MOTIVOS: Record<CodigoProgressoInvalido, string> = {
  PAGINA_NAO_AVANCA: 'A página informada deve ser maior que a página anterior.',
  PAGINA_ACIMA_DO_TOTAL:
    'A página informada não pode superar o total de páginas do livro.',
  MINUTOS_FORA_DO_INTERVALO: `Os minutos devem ser um inteiro entre ${SEM_TEMPO} e ${MINUTOS_MAXIMOS}.`,
  PROGRESSO_NAO_ENCONTRADO: 'Progresso não encontrado nesta leitura.',
  ULTIMO_PROGRESSO_DIVERGENTE:
    'O último progresso mudou desde a confirmação; revise antes de excluir.',
};

function falha(codigo: CodigoProgressoInvalido): Falha {
  return {
    ok: false,
    erro: { tipo: 'PROGRESSO_INVALIDO', codigo, motivo: MOTIVOS[codigo] },
  };
}

export function paginasLidas(anterior: number, nova: number): number {
  return nova - anterior;
}

export function validarNovaPagina(
  paginaAtual: number,
  totalPaginas: number,
  pagina: number,
): ResultadoPagina {
  if (pagina <= paginaAtual) return falha('PAGINA_NAO_AVANCA');
  if (pagina > totalPaginas) return falha('PAGINA_ACIMA_DO_TOTAL');
  return { ok: true, paginasLidas: paginasLidas(paginaAtual, pagina) };
}

export function validarMinutos(minutos: number): ResultadoMinutos {
  const valido =
    Number.isInteger(minutos) &&
    minutos >= SEM_TEMPO &&
    minutos <= MINUTOS_MAXIMOS;
  return valido ? { ok: true } : falha('MINUTOS_FORA_DO_INTERVALO');
}

export function percentualConcluido(
  paginaAtual: number,
  totalPaginas: number,
): number {
  return Math.min(
    PERCENTUAL_MAXIMO,
    (paginaAtual / totalPaginas) * PERCENTUAL_MAXIMO,
  );
}

export function resumo(
  paginaAtual: number,
  totalPaginas: number,
  minutosTotais: number,
): ResumoProgresso {
  return {
    paginaAtual,
    totalPaginas,
    percentualConcluido: percentualConcluido(paginaAtual, totalPaginas),
    minutosTotais,
  };
}

export function alcanceDaExclusao(
  registros: readonly RegistroOrdenado[],
  progressoId: string,
  ultimoProgressoIdConfirmado: string,
): ResultadoExclusao {
  const ordenados = [...registros].sort((a, b) => a.ordem - b.ordem);
  const indice = ordenados.findIndex((registro) => registro.id === progressoId);
  if (indice < 0) return falha('PROGRESSO_NAO_ENCONTRADO');
  if (ordenados[ordenados.length - 1].id !== ultimoProgressoIdConfirmado) {
    return falha('ULTIMO_PROGRESSO_DIVERGENTE');
  }
  const restante = ordenados[indice - 1];
  return {
    ok: true,
    idsRemovidos: ordenados.slice(indice).map((registro) => registro.id),
    paginaAtual: restante?.pagina ?? PAGINA_SEM_PROGRESSO,
  };
}

export function dataLocal(instante: Date, fusoIana: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoIana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}
