import type { Estatisticas, GraficosEstatisticas, PontoEstatistica } from '../services/leitura'

/** Painel de 2026 do protótipo (5.1), com os anos do seletor. */
export function estatisticas(sobrescrever: Partial<Estatisticas> = {}): Estatisticas {
  return {
    ano: 2026,
    anos: [
      { ano: 2026, livrosConcluidos: 9 },
      { ano: 2025, livrosConcluidos: 14 },
      { ano: 2024, livrosConcluidos: 11 },
      { ano: 2023, livrosConcluidos: 0 },
    ],
    primeiroRegistro: '2023-11-12',
    totais: { livrosConcluidos: 9, paginasLidas: 3818, minutosLidos: 4280 },
    medias: {
      paginasPorDia: { valor: 20.4, paginasLidas: 3818, diasComLeitura: 187 },
      diasPorLivro: { valor: 19.1, dias: 172, leiturasConcluidas: 9 },
      notaMedia: { valor: 4.2, quantidade: 8 },
    },
    ...sobrescrever,
  }
}

/** Leitor sem nenhum registro (4.7). */
export const SEM_REGISTRO: Estatisticas = estatisticas({
  anos: [],
  primeiroRegistro: null,
  totais: { livrosConcluidos: 0, paginasLidas: 0, minutosLidos: 0 },
  medias: {
    paginasPorDia: { valor: null, paginasLidas: 0, diasComLeitura: 0 },
    diasPorLivro: { valor: null, dias: 0, leiturasConcluidas: 0 },
    notaMedia: { valor: null, quantidade: 0 },
  },
})

export function ponto(mes: number | null, paginasLidas: number, livrosConcluidos = 0, ano = 2026): PontoEstatistica {
  return { ano, mes, paginasLidas, livrosConcluidos }
}

/** Série mensal de janeiro até `ate`, com julho no topo (5.1). */
export function graficosDoAno(ano = 2026, ate = 9): GraficosEstatisticas {
  const paginas = [410, 354, 495, 285, 527, 438, 604, 370, 318, 402, 366, 575]
  const livros = [1, 1, 2, 0, 1, 1, 2, 0, 1, 1, 2, 1]
  return {
    ano,
    granularidade: 'mes',
    pontos: Array.from({ length: ate }, (_, i) => ponto(i + 1, paginas[i]!, livros[i]!, ano)),
  }
}
