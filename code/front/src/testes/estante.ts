import type { ItemEstante, Leitura, PaginaEstante, TotaisEstante } from '../services/leitura'

export function itemEstante(livroId: string, titulo: string, extra: Partial<ItemEstante> = {}): ItemEstante {
  return {
    livroId,
    livro: { titulo, autor: 'Itamar Vieira Junior', capaUrl: null },
    status: 'QUERO_LER',
    vezesLido: 0,
    ultimaLeituraId: null,
    retomavel: false,
    adicionadoEm: '2026-09-01T12:00:00Z',
    ...extra,
  }
}

export const TOTAIS_ZERADOS: TotaisEstante = { QUERO_LER: 0, LENDO: 0, LIDO: 0, RELENDO: 0, ABANDONADO: 0 }

export function paginaEstante(
  itens: ItemEstante[],
  { page = 1, totalPaginas = 1, totalItens = itens.length, totais = TOTAIS_ZERADOS } = {},
): PaginaEstante {
  return { itens, paginacao: { page, limite: 20, totalItens, totalPaginas }, totaisPorStatus: totais }
}

export function leitura(parcial: Partial<Leitura> = {}): Leitura {
  return {
    id: 'lei-1',
    livroId: 'livro-1',
    status: 'LENDO',
    dataInicio: '2026-08-12',
    releitura: false,
    incompleta: false,
    retomavel: false,
    paginaAtual: 148,
    totalPaginas: 264,
    percentualConcluido: 56,
    vezesLido: 1,
    ultimaAtividadeEm: '2026-09-08T10:00:00Z',
    ...parcial,
  }
}
