import type { Periodicidade } from './janelas';

export const UNIDADES = ['paginas', 'minutos', 'livros'] as const;
export type Unidade = (typeof UNIDADES)[number];

export const ALVO_MINIMO = 1;

/**
 * Teto do valor-alvo por unidade (decisão do dono, 09/10/2026): folga para um
 * desafio anual e barra valores absurdos. O mínimo é 1 (CHECK `valor_alvo > 0`).
 */
export const TETO_POR_UNIDADE: Record<Unidade, number> = {
  paginas: 100_000,
  minutos: 100_000,
  livros: 1_000,
};

/** Ordem da listagem: janela mais curta primeiro (protótipo `desafios`). */
export const ORDEM_JANELA: Record<Periodicidade, number> = {
  diaria: 0,
  semanal: 1,
  mensal: 2,
  anual: 3,
};

const NOME_DA_UNIDADE: Record<Unidade, string> = {
  paginas: 'páginas',
  minutos: 'minutos',
  livros: 'livros',
};

/** Motivo da recusa do alvo, ou `null` quando ele cabe na unidade. */
export function alvoForaDoLimite(
  unidade: Unidade,
  valorAlvo: number,
): string | null {
  const teto = TETO_POR_UNIDADE[unidade];
  if (valorAlvo >= ALVO_MINIMO && valorAlvo <= teto) {
    return null;
  }
  return `Para ${NOME_DA_UNIDADE[unidade]}, o alvo vai de ${ALVO_MINIMO} a ${teto.toLocaleString('pt-BR')}.`;
}
