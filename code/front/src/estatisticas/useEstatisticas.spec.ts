import { describe, expect, it } from 'vitest'

import { itensDoSeletor, lerPeriodoDaRota } from './useEstatisticas'

describe('período na rota', () => {
  it('ano de quatro dígitos ou acumulado; o resto é o ano corrente', () => {
    expect(lerPeriodoDaRota('2024', 2026)).toBe(2024)
    expect(lerPeriodoDaRota('acumulado', 2026)).toBe('acumulado')
    for (const invalido of [undefined, '', '26', 'todos', ['2024'], '0999']) {
      expect(lerPeriodoDaRota(invalido, 2026)).toBe(2026)
    }
  })
})

describe('itens do seletor', () => {
  it('anos com registro do mais recente ao mais antigo e o acumulado com a soma dos livros', () => {
    expect(
      itensDoSeletor(
        [
          { ano: 2026, livrosConcluidos: 9 },
          { ano: 2023, livrosConcluidos: 0 },
          { ano: 2025, livrosConcluidos: 14 },
        ],
        2026,
        2026,
      ),
    ).toEqual([
      { periodo: 2026, livrosConcluidos: 9 },
      { periodo: 2025, livrosConcluidos: 14 },
      { periodo: 2023, livrosConcluidos: 0 },
      { periodo: 'acumulado', livrosConcluidos: 23 },
    ])
  })

  it('o ano corrente e o ano escolhido pela rota entram mesmo sem registro', () => {
    expect(itensDoSeletor([{ ano: 2024, livrosConcluidos: 3 }], 2026, 2019).map((i) => i.periodo)).toEqual([
      2026,
      2024,
      2019,
      'acumulado',
    ])
  })
})
