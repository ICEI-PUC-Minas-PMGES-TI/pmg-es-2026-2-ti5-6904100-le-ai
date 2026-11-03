import { describe, expect, it } from 'vitest'

import type { PontoEstatistica } from '../services/leitura'
import {
  ajudaDaNota,
  anuncioDoPeriodo,
  graficoSemDados,
  leituraDoPonto,
  linhaDoPeriodo,
  MEDIA_AUSENTE,
  pontoDeMaiorValor,
  resumoDoGrafico,
  subtituloDoGrafico,
  tituloDoBalao,
  valorDoBalao,
} from './textos'

const HOJE = { ano: 2026, mes: 9, dia: 29 }

function mes(m: number, paginasLidas = 0, livrosConcluidos = 0, ano = 2026): PontoEstatistica {
  return { ano, mes: m, paginasLidas, livrosConcluidos }
}

describe('linha de período', () => {
  it('ano corrente vai até hoje; ano fechado, até 31 de dezembro', () => {
    expect(linhaDoPeriodo(2026, HOJE, '2023-11-12')).toBe('De 1º de janeiro a 29 de setembro de 2026')
    expect(linhaDoPeriodo(2025, HOJE, '2023-11-12')).toBe('De 1º de janeiro a 31 de dezembro de 2025')
  })

  it('o ano do primeiro registro começa nele (decisão do dono)', () => {
    expect(linhaDoPeriodo(2023, HOJE, '2023-11-12')).toBe(
      'De 12 de novembro a 31 de dezembro de 2023, desde o seu primeiro registro',
    )
    expect(linhaDoPeriodo('acumulado', HOJE, '2023-11-12')).toBe('Desde 12 de novembro de 2023, seu primeiro registro')
  })

  it('anúncio da troca de período para leitor de tela', () => {
    expect(anuncioDoPeriodo(2025, 'De 1º de janeiro a 31 de dezembro de 2025')).toBe(
      'Mostrando 2025, de 1º de janeiro a 31 de dezembro de 2025',
    )
    expect(anuncioDoPeriodo('acumulado', '')).toBe('Mostrando o acumulado')
  })
})

describe('médias', () => {
  it('ajuda da nota diz quantas notas compõem a média', () => {
    expect(ajudaDaNota(2026, 8)).toBe('Média das 8 notas que você deu em 2026.')
    expect(ajudaDaNota('acumulado', 31)).toBe('Média das 31 notas que você já deu.')
    expect(ajudaDaNota(2023, 0)).toBe('Média das notas que você deu em 2023.')
    expect(ajudaDaNota(2024, 1)).toBe('A única nota que você deu em 2024.')
  })

  it('média ausente é frase, nunca zero', () => {
    expect(MEDIA_AUSENTE.diasPorLivro(2023)).toBe('Sem leituras concluídas em 2023')
    expect(MEDIA_AUSENTE.notaMedia(2023)).toBe('Nenhuma nota dada em 2023')
    expect(MEDIA_AUSENTE.notaMedia('acumulado')).toBe('Nenhuma nota dada ainda')
  })
})

describe('gráficos', () => {
  const ATE_SETEMBRO = [mes(1, 380), mes(2, 310), mes(7, 604, 2), mes(8, 0, 2), mes(9, 318, 1)]

  it('subtítulo com o total e o intervalo da série', () => {
    expect(subtituloDoGrafico('paginas', ATE_SETEMBRO, 2026)).toBe('1.612 páginas de janeiro a setembro')
    const ano = Array.from({ length: 12 }, (_, i) => mes(i + 1, 1, 0, 2025))
    expect(subtituloDoGrafico('paginas', ano, 2025)).toBe('12 páginas em 2025')
    expect(subtituloDoGrafico('livros', [mes(11, 146, 0, 2023), mes(12, 214, 0, 2023)], 2023)).toBe(
      '0 livros de novembro a dezembro',
    )
    const anos = [2023, 2024].map((a) => ({ ano: a, mes: null, paginasLidas: 1000, livrosConcluidos: 1 }))
    expect(subtituloDoGrafico('paginas', anos, 'acumulado')).toBe('2.000 páginas desde 2023')
  })

  it('o rótulo direto vai no primeiro maior valor; zero nunca leva rótulo', () => {
    expect(pontoDeMaiorValor('livros', ATE_SETEMBRO)?.mes).toBe(7)
    expect(pontoDeMaiorValor('livros', [mes(1), mes(2)])).toBeNull()
  })

  it('balão: mês corrente com "até hoje" e zero de livros por extenso', () => {
    expect(tituloDoBalao(mes(7, 604), HOJE)).toBe('Julho de 2026')
    expect(tituloDoBalao(mes(9, 318), HOJE)).toBe('Setembro de 2026, até hoje')
    expect(valorDoBalao('paginas', mes(7, 604))).toBe('604 páginas')
    expect(valorDoBalao('livros', mes(4))).toBe('0 livros concluídos')
    expect(valorDoBalao('livros', mes(3, 0, 1))).toBe('1 livro')
    expect(tituloDoBalao({ ano: 2026, mes: null, paginasLidas: 3818, livrosConcluidos: 9 }, HOJE)).toBe(
      '2026, até hoje',
    )
  })

  it('leitor de tela lê o resumo e cada mês (§9)', () => {
    expect(resumoDoGrafico('paginas', ATE_SETEMBRO, 2026)).toBe(
      'Gráfico de colunas, páginas por mês em 2026, de janeiro a setembro. Maior valor: julho, 604 páginas.',
    )
    expect(leituraDoPonto('paginas', mes(7, 604), HOJE)).toBe('Julho de 2026, 604 páginas')
  })

  it('período sem nada da medida', () => {
    expect(graficoSemDados('livros', 2023)).toBe('Nenhum livro concluído em 2023.')
  })
})
