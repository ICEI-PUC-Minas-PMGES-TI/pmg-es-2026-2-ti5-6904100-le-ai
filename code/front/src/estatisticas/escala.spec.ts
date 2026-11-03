import { describe, expect, it } from 'vitest'

import { escalaDoEixo } from './escala'

describe('escala do eixo', () => {
  it.each([
    [604, [0, 200, 400, 600]],
    [610, [0, 200, 400, 600]],
    [214, [0, 100, 200]],
    [5150, [0, 2000, 4000, 6000]],
    [14, [0, 5, 10, 15]],
    [2, [0, 1, 2, 3]],
    [1, [0, 1, 2]],
    [939, [0, 500, 1000]],
    [266, [0, 100, 200, 300]],
  ])('maior valor %d → marcas %j (exemplos do protótipo)', (maximo, marcas) => {
    expect(escalaDoEixo(maximo).marcas).toEqual(marcas)
  })

  it('o domínio sempre passa da coluna mais alta, com ar para o rótulo direto', () => {
    for (const maximo of [1, 2, 3, 14, 99, 214, 604, 999, 5150, 12_345]) {
      const { dominio, marcas } = escalaDoEixo(maximo)
      expect(dominio).toBeGreaterThan(maximo)
      expect(dominio).toBeGreaterThanOrEqual(marcas.at(-1)!)
    }
    // 604 páginas: eixo até 600 e topo perto de 650, como no 5.1.
    expect(escalaDoEixo(604).dominio).toBeCloseTo(652, 0)
  })

  it('nunca mais de quatro marcas', () => {
    for (let maximo = 1; maximo <= 20_000; maximo += 37) {
      expect(escalaDoEixo(maximo).marcas.length).toBeLessThanOrEqual(5)
    }
  })

  it('contagem não tem passo fracionário', () => {
    expect(escalaDoEixo(2).marcas.every(Number.isInteger)).toBe(true)
  })

  it('sem valor, um eixo mínimo', () => {
    expect(escalaDoEixo(0)).toEqual({ marcas: [0, 1], dominio: 1 })
  })
})
