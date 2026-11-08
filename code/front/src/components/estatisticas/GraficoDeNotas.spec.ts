import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { distribuicaoDe } from '../../testes/estatisticas'
import GraficoDeNotas from './GraficoDeNotas.vue'

function montar(props: Partial<InstanceType<typeof GraficoDeNotas>['$props']> = {}) {
  return mount(GraficoDeNotas, {
    props: {
      distribuicao: distribuicaoDe({ 3: 1, 3.5: 1, 4: 2, 4.5: 2, 5: 2 }),
      periodo: 2026,
      primeiroRegistro: '2023-11-12',
      ...props,
    },
    attachTo: document.body,
  })
}

describe('GraficoDeNotas', () => {
  it('onze notas no eixo, contagem sobre cada uma e coluna só onde há livro', () => {
    const wrapper = montar()

    expect(wrapper.get('h3').text()).toBe('Notas que você deu')
    expect(wrapper.text()).toContain('8 notas em 2026')
    expect(wrapper.findAll('[data-nota]')).toHaveLength(11)
    expect(wrapper.findAll('[data-coluna]')).toHaveLength(5)
    expect(wrapper.findAll('[data-contagem]').map((c) => c.text())).toEqual([
      '0', '0', '0', '0', '0', '0', '1', '1', '2', '2', '2',
    ])
  })

  it('acumulado diz desde quando', () => {
    expect(montar({ periodo: 'acumulado' }).text()).toContain('8 notas desde 2023')
  })

  it('sem nota no período não desenha gráfico, só a frase', () => {
    const wrapper = montar({ distribuicao: null, periodo: 2023 })

    expect(wrapper.text()).toContain('Nenhuma nota dada em 2023.')
    expect(wrapper.find('[data-nota]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Ver como tabela')
  })

  it('setas movem entre as notas, Home e End vão às pontas e Esc fecha o balão', async () => {
    const wrapper = montar()
    const grupo = wrapper.get('[role="group"]')

    await grupo.trigger('keydown', { key: 'End' })
    expect(wrapper.get('[data-balao]').text()).toContain('Nota 5')
    expect(wrapper.get('[data-balao]').text()).toContain('2 livros')

    await grupo.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.get('[data-balao]').text()).toContain('Nota 4,5')

    await grupo.trigger('keydown', { key: 'Home' })
    expect(wrapper.get('[data-balao]').text()).toContain('Nenhum livro')

    await grupo.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-balao]').exists()).toBe(false)
  })

  it('o mouse saindo do gráfico não fecha o balão aberto pelo teclado', async () => {
    const wrapper = montar()
    const grupo = wrapper.get('[role="group"]')

    await grupo.trigger('keydown', { key: 'End' })
    await grupo.trigger('mouseleave')
    expect(wrapper.find('[data-balao]').exists()).toBe(true)

    await wrapper.findAll('[data-nota]')[8]!.trigger('mouseenter')
    await grupo.trigger('mouseleave')
    expect(wrapper.find('[data-balao]').exists()).toBe(false)
  })

  it('a tabela lista as onze notas e fecha com o total', async () => {
    const wrapper = montar()

    await wrapper.get('button').trigger('click')

    const linhas = wrapper.findAll('tbody tr')
    expect(linhas).toHaveLength(12)
    expect(linhas[1]!.text()).toBe('0,5 estrela0 livros')
    expect(linhas[11]!.text()).toBe('Total8 livros')
    expect(wrapper.text()).toContain('Ver como gráfico')
  })
})

describe('rótulo acessível do gráfico', () => {
  it('uma nota só no topo usa o singular de estrela', () => {
    const wrapper = montar({ distribuicao: distribuicaoDe({ 1: 5 }) })

    expect(wrapper.get('[role="group"]').attributes('aria-label')).toContain('Mais frequentes: 1 estrela, com 5 livros.')
  })
})
