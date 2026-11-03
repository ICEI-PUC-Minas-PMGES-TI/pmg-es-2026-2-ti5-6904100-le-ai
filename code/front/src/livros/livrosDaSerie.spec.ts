import { describe, expect, it } from 'vitest'

import type { LivroDaSerieResumo } from '../services/acervo'
import { livro } from '../testes/massaDaBusca'
import { agruparSerie } from './livrosDaSerie'

function volume(id: string, titulo: string, numeroNaSerie: number | null): LivroDaSerieResumo {
  return { ...livro(id, titulo, { autores: [{ id: 'verissimo', nome: 'Erico Verissimo' }] }), numeroNaSerie }
}

describe('agruparSerie', () => {
  it('agrupa edições só dentro do mesmo número, pula lacunas e deixa os sem número no fim', () => {
    const { numerados, semNumero } = agruparSerie([
      volume('c1-2004', 'O Tempo e o Vento', 1),
      volume('c1-1990', 'O Tempo e o Vento', 1),
      volume('c2', 'O Tempo e o Vento', 2),
      volume('c5', 'O Arquipélago', 5),
      volume('extra-a', 'Ana Terra', null),
      volume('extra-b', 'Um Certo Capitão Rodrigo', null),
    ])

    expect(numerados.map((item) => [item.numero, item.grupo.edicoes.map((edicao) => edicao.id)])).toEqual([
      [1, ['c1-2004', 'c1-1990']],
      [2, ['c2']],
      [5, ['c5']],
    ])
    expect(semNumero.map((item) => [item.numero, item.grupo.principal.id])).toEqual([
      [null, 'extra-a'],
      [null, 'extra-b'],
    ])
  })

  it('lista vazia não gera grupo', () => {
    expect(agruparSerie([])).toEqual({ numerados: [], semNumero: [] })
  })
})
