import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { FaixaDaDistribuicao } from '../../services/acervo'
import HistogramaDeNotas from './HistogramaDeNotas.vue'

/** A distribuição do protótipo (pagina-do-livro.md §5.2), de 5 a 0. */
const QUANTIDADES = [12, 9, 7, 3, 2, 1, 1, 0, 1, 0, 0]
const DISTRIBUICAO: FaixaDaDistribuicao[] = QUANTIDADES.map((quantidade, indice) => ({
  valor: 5 - indice * 0.5,
  quantidade,
}))

describe('HistogramaDeNotas', () => {
  it('onze linhas de 5 a 0, lidas como "5 estrelas, 12 leitores"', () => {
    const wrapper = mount(HistogramaDeNotas, { props: { distribuicao: DISTRIBUICAO } })

    expect(wrapper.text()).toContain('Distribuição das notas dos leitores')
    const itens = wrapper.findAll('ul > li')
    expect(itens).toHaveLength(11)
    expect(itens.map((item) => item.get('.sr-only').text())).toEqual([
      '5 estrelas, 12 leitores',
      '4,5 estrelas, 9 leitores',
      '4 estrelas, 7 leitores',
      '3,5 estrelas, 3 leitores',
      '3 estrelas, 2 leitores',
      '2,5 estrelas, 1 leitor',
      '2 estrelas, 1 leitor',
      '1,5 estrela, nenhum',
      '1 estrela, 1 leitor',
      '0,5 estrela, nenhum',
      '0 estrelas, nenhum',
    ])
    // A lista leva o rótulo como nome.
    const rotulo = wrapper.get('p')
    expect(wrapper.get('ul').attributes('aria-labelledby')).toBe(rotulo.attributes('id'))
  })

  it('a maior faixa ocupa a trilha inteira e as outras são proporcionais a ela, sem percentual', () => {
    const wrapper = mount(HistogramaDeNotas, { props: { distribuicao: DISTRIBUICAO } })

    const itens = wrapper.findAll('ul > li')
    expect(itens[0]!.get('[data-preenchimento]').attributes('style')).toContain('width: 100%')
    expect(itens[1]!.get('[data-preenchimento]').attributes('style')).toContain('width: 75%')
    expect(itens[2]!.get('[data-preenchimento]').attributes('style')).toContain('width: 58.3%')
    expect(wrapper.text()).not.toContain('%')
  })

  it('a maior faixa não precisa ser a de 5', () => {
    const distribuicao = DISTRIBUICAO.map((faixa) => ({ ...faixa, quantidade: faixa.valor === 3 ? 4 : faixa.valor === 5 ? 2 : 0 }))
    const wrapper = mount(HistogramaDeNotas, { props: { distribuicao } })

    const itens = wrapper.findAll('ul > li')
    expect(itens[4]!.get('[data-preenchimento]').attributes('style')).toContain('width: 100%')
    expect(itens[0]!.get('[data-preenchimento]').attributes('style')).toContain('width: 50%')
  })

  it('faixa vazia mostra a trilha vazia e "nenhum"; a contagem tem unidade', () => {
    const wrapper = mount(HistogramaDeNotas, { props: { distribuicao: DISTRIBUICAO } })

    const itens = wrapper.findAll('ul > li')
    const vazia = itens[7]!
    expect(vazia.find('[data-preenchimento]').exists()).toBe(false)
    expect(vazia.get('.text-grafite-suave').text()).toBe('nenhum')
    expect(itens[0]!.text()).toContain('12 leitores')
    expect(itens[5]!.text()).toContain('1 leitor')
    expect(itens[5]!.text()).not.toContain('leitores')
  })

  it('a ordem vem do valor, não da posição na resposta', () => {
    const wrapper = mount(HistogramaDeNotas, { props: { distribuicao: [...DISTRIBUICAO].reverse() } })

    expect(wrapper.findAll('ul > li')[0]!.get('.sr-only').text()).toBe('5 estrelas, 12 leitores')
  })

  it('sem distribuição, nada aparece', () => {
    const wrapper = mount(HistogramaDeNotas, { props: { distribuicao: [] } })

    expect(wrapper.text()).toBe('')
    expect(wrapper.find('ul').exists()).toBe(false)
  })
})
