/**
 * Linha de `LivroOficialRepository.notasDosLeitores`: uma por valor dado, com
 * o total e a média do livro repetidos em todas. O `pg` devolve `numeric` como
 * texto, e por isso tudo passa por `Number()`.
 */
export interface LinhaDaDistribuicao {
  valor: string | number;
  quantidade: string | number;
  total: string | number;
  media: string | number;
}

export interface NotaDoLivro {
  valor: number;
  quantidade: number;
}

export interface FaixaDaDistribuicao {
  valor: number;
  quantidade: number;
}

/** As 11 faixas da meia estrela, de 5 a 0 (RN-06, `pagina-do-livro.md` §4.1 C). */
export const FAIXAS_DA_DISTRIBUICAO: readonly number[] = Array.from(
  { length: 11 },
  (_, i) => (10 - i) / 2,
);

/**
 * Nota dos leitores e distribuição da página (RF-ACV-16, RF-ACV-04). A média
 * já vem arredondada a 1 casa pelo SQL, sobre os valores individuais: aqui não
 * se arredonda de novo, e a contagem é a soma das faixas. Sem nenhuma nota, o
 * indicador é `null` (nunca zero, RN-06.3) e a distribuição é vazia.
 */
export function notasDosLeitores(linhas: readonly LinhaDaDistribuicao[]): {
  notaDosLeitores: NotaDoLivro | null;
  distribuicao: FaixaDaDistribuicao[];
} {
  if (linhas.length === 0) {
    return { notaDosLeitores: null, distribuicao: [] };
  }
  const porValor = new Map(
    linhas.map((linha) => [Number(linha.valor), Number(linha.quantidade)]),
  );
  return {
    notaDosLeitores: {
      valor: Number(linhas[0].media),
      quantidade: Number(linhas[0].total),
    },
    distribuicao: FAIXAS_DA_DISTRIBUICAO.map((valor) => ({
      valor,
      quantidade: porValor.get(valor) ?? 0,
    })),
  };
}

/** Nota geral da fonte externa (RF-ACV-15); ausente é `null`, nunca zero. */
export function notaGeral(
  valor: string | number | null,
  quantidade: number | null,
): NotaDoLivro | null {
  if (valor === null || quantidade === null) return null;
  return { valor: Number(valor), quantidade };
}
