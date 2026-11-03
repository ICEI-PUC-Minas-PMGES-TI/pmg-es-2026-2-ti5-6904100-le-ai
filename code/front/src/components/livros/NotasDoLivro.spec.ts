import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NotasDoLivro from './NotasDoLivro.vue'

function montar(notaGeral: { valor: number; quantidade: number } | null, notaDosLeitores: { valor: number; quantidade: number } | null) {
  const wrapper = mount(NotasDoLivro, { props: { notaGeral, notaDosLeitores } })
  const [geral, leitores] = wrapper.findAll('[data-bloco-de-nota]')
  return { wrapper, geral: geral!, leitores: leitores! }
}

/** O que o leitor de tela lê em cada bloco: só o texto `sr-only`, o resto é `aria-hidden`. */
function leitura(bloco: ReturnType<typeof montar>['geral']): string {
  return bloco.get('.sr-only').text()
}

describe('NotasDoLivro', () => {
  it('as duas notas: estrela, nota com vírgula e contagem com unidade, sem combinar', () => {
    const { wrapper, geral, leitores } = montar({ valor: 4.3, quantidade: 412 }, { valor: 4.2, quantidade: 36 })

    expect(geral.text()).toContain('Nota geral')
    expect(geral.text()).toContain('4,3')
    expect(geral.text()).toContain('412 avaliações')
    expect(geral.findAll('svg')).toHaveLength(1)
    expect(leitores.text()).toContain('Nota dos leitores')
    expect(leitores.text()).toContain('4,2')
    expect(leitores.text()).toContain('36 leitores')
    expect(leitores.findAll('svg')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Sem nota')
    expect(leitura(geral)).toBe('Nota geral, 4,3 de 5, 412 avaliações')
    expect(leitura(leitores)).toBe('Nota dos leitores, 4,2 de 5, 36 leitores')
    // Um divisor entre os dois blocos.
    expect(wrapper.findAll('.bg-linha')).toHaveLength(1)
  })

  it('só nota geral: o bloco dos leitores fica em "Sem nota", sem estrela e sem zero', () => {
    const { geral, leitores } = montar({ valor: 3.9, quantidade: 27 }, null)

    expect(geral.text()).toContain('3,9')
    expect(geral.text()).toContain('27 avaliações')
    expect(leitores.text()).toContain('Nota dos leitores')
    expect(leitores.text()).toContain('Sem nota')
    expect(leitores.findAll('svg')).toHaveLength(0)
    expect(leitores.text()).not.toMatch(/0|—|-/)
    expect(leitura(leitores)).toBe('Nota dos leitores, sem nota')
  })

  it('só nota dos leitores: a geral fica em "Sem nota"', () => {
    const { geral, leitores } = montar(null, { valor: 4, quantidade: 3 })

    expect(geral.text()).toContain('Nota geral')
    expect(geral.text()).toContain('Sem nota')
    expect(geral.findAll('svg')).toHaveLength(0)
    expect(leitura(geral)).toBe('Nota geral, sem nota')
    // Nota inteira sai sem `,0`.
    expect(leitura(leitores)).toBe('Nota dos leitores, 4 de 5, 3 leitores')
  })

  it('nenhuma: os dois blocos em "Sem nota", sem estrela nem número', () => {
    const { wrapper, geral, leitores } = montar(null, null)

    expect(geral.text()).toContain('Sem nota')
    expect(leitores.text()).toContain('Sem nota')
    expect(wrapper.findAll('svg')).toHaveLength(0)
    expect(wrapper.text()).not.toMatch(/\d/)
  })

  it('singular: 1 avaliação e 1 leitor', () => {
    const { geral, leitores } = montar({ valor: 5, quantidade: 1 }, { valor: 0.5, quantidade: 1 })

    expect(geral.text()).toContain('1 avaliação')
    expect(geral.text()).not.toContain('avaliações')
    expect(leitores.text()).toContain('0,5')
    expect(leitura(leitores)).toBe('Nota dos leitores, 0,5 de 5, 1 leitor')
    expect(leitores.get('.text-caption').text()).toBe('1 leitor')
  })

  it('milhar com ponto, como em pt-BR', () => {
    const { geral } = montar({ valor: 4, quantidade: 1442 }, null)

    expect(geral.text()).toContain('1.442 avaliações')
    expect(leitura(geral)).toBe('Nota geral, 4 de 5, 1.442 avaliações')
  })
})
