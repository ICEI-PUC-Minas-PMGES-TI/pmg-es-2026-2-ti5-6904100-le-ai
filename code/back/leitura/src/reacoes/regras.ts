export const TIPOS_DE_REACAO = ['curtida', 'descurtida'] as const;
export type TipoDeReacao = (typeof TIPOS_DE_REACAO)[number];

export const VIAS = ['feed', 'lista'] as const;
export type Via = (typeof VIAS)[number];

/** A reação gravada do par resenha e leitor, ativa ou retirada. */
export interface ReacaoGravada {
  tipo: string;
  ativa: boolean;
  primeiraCurtidaEm: Date | null;
}

export interface Mudanca {
  /** Há algo a gravar: tipo diferente, reação retirada ou primeira curtida. */
  gravar: boolean;
  /** Esta é a primeira curtida do par: grava `primeira_curtida_em` e publica `resenha.curtida`. */
  primeiraCurtida: boolean;
}

/**
 * O que reagir com `tipo` muda no par resenha e leitor (RF-AVA-05).
 *
 * `primeira_curtida_em` fica guardada mesmo com a reação retirada ou trocada por descurtida, e
 * é ela que impede a segunda notificação: recurtir não renotifica (decisão de 15/09/2026).
 */
export function mudancaAoReagir(
  atual: ReacaoGravada | null,
  tipo: TipoDeReacao,
): Mudanca {
  if (!atual) {
    return { gravar: true, primeiraCurtida: tipo === 'curtida' };
  }
  const primeiraCurtida =
    tipo === 'curtida' && atual.primeiraCurtidaEm === null;
  return {
    gravar: !atual.ativa || atual.tipo !== tipo || primeiraCurtida,
    primeiraCurtida,
  };
}
