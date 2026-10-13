import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { graficosDoAno, ponto } from '../../testes/estatisticas'
import GraficoDeColunas from './GraficoDeColunas.vue'

const HOJE = { ano: 2026, mes: 9, dia: 29 }

function montar(props: Partial<InstanceType<typeof GraficoDeColunas>['$props']> = {}) {
  return mount(GraficoDeColunas, {
    props: { medida: 'paginas', pontos: graficosDoAno().pontos, periodo: 2026, hoje: HOJE, ...props },
    attachTo: document.body,
  })
}

describe('GraficoDeColunas', () => {
  it('título, subtítulo e um mês por coluna até o mês de hoje (5.1)', () => {
    const wrapper = montar()

    expect(wrapper.get('h3').text()).toBe('Páginas por mês')
    expect(wrapper.text()).toContain('3.801 páginas de janeiro a setembro')
    expect(wrapper.findAll('[data-mes]')).toHaveLength(9)
    expect(wrapper.text()).toContain('jan')
    expect(wrapper.text()).not.toContain('out')
  })

  it('um único rótulo direto, no primeiro maior valor', () => {
    const wrapper = montar({ medida: 'livros' })

    const rotulos = wrapper.findAll('[data-rotulo-direto]')
    expect(rotulos).toHaveLength(1)
    expect(rotulos[0]!.text()).toBe('2 livros')
    // Março e julho têm 2; o rótulo fica em março, o terceiro mês.
    expect(wrapper.findAll('[data-mes]')[2]!.find('[data-rotulo-direto]').exists()).toBe(true)
  })

  it('mês com zero não tem coluna, mas continua no eixo', () => {
    const wrapper = montar({ medida: 'livros' })

    const abril = wrapper.findAll('[data-mes]')[3]!
    expect(abril.find('[data-coluna]').exists()).toBe(false)
  })

  it('hover mostra o balão do mês e a faixa; o rótulo direto some na mesma coluna', async () => {
    const wrapper = montar()

    await wrapper.findAll('[data-mes]')[6]!.trigger('mouseenter')

    const balao = wrapper.get('[data-balao]')
    expect(balao.text()).toContain('Julho de 2026')
    expect(balao.text()).toContain('604 páginas')
    expect(wrapper.findAll('[data-mes]')[6]!.find('[data-faixa]').exists()).toBe(true)
    expect(wrapper.find('[data-rotulo-direto]').exists()).toBe(false)

    await wrapper.get('[role="group"]').trigger('mouseleave')
    expect(wrapper.find('[data-balao]').exists()).toBe(false)
  })

  it('setas do teclado movem entre os meses e anunciam o valor; Esc fecha (5.4)', async () => {
    const wrapper = montar({ medida: 'livros' })
    const area = wrapper.get('[role="group"]')
    expect(area.attributes('tabindex')).toBe('0')
    expect(area.attributes('aria-label')).toBe(
      'Gráfico de colunas, livros concluídos por mês em 2026, de janeiro a setembro. Maior valor: março, 2 livros.',
    )

    await area.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[data-balao]').text()).toContain('Janeiro de 2026')
    await area.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.get('[data-balao]').text()).toContain('Janeiro de 2026')
    for (let i = 0; i < 3; i++) await area.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[data-balao]').text()).toContain('0 livros concluídos')
    expect(wrapper.get('[aria-live="polite"]').text()).toBe('Abril de 2026, 0 livros concluídos')

    await area.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-balao]').exists()).toBe(false)
  })

  it('o mês corrente leva "até hoje" no balão', async () => {
    const wrapper = montar()

    await wrapper.findAll('[data-mes]')[8]!.trigger('click')

    expect(wrapper.get('[data-balao]').text()).toContain('Setembro de 2026, até hoje')
  })

  it('Ver como tabela troca a área por uma tabela de verdade, só neste card', async () => {
    const wrapper = montar()

    await wrapper.get('button').trigger('click')

    const tabela = wrapper.get('table')
    expect(tabela.findAll('th[scope="col"]').map((th) => th.text())).toEqual(['Mês', 'Páginas'])
    const linhas = tabela.findAll('tbody tr')
    expect(linhas).toHaveLength(9)
    expect(linhas[0]!.text()).toContain('Janeiro')
    expect(linhas[0]!.text()).toContain('410 páginas')
    expect(linhas[8]!.text()).toContain('até hoje')
    expect(wrapper.find('[role="group"]').exists()).toBe(false)
    expect(wrapper.get('button').text()).toBe('Ver como gráfico')

    await wrapper.get('button').trigger('click')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('no acumulado, um ponto por ano e a coluna "Ano" na tabela (5.2)', async () => {
    const pontos = [ponto(null, 360, 0, 2023), ponto(null, 4210, 11, 2024), ponto(null, 5150, 14, 2025), ponto(null, 3818, 9)]
    const wrapper = montar({ pontos, periodo: 'acumulado' })

    expect(wrapper.get('h3').text()).toBe('Páginas por ano')
    expect(wrapper.text()).toContain('13.538 páginas desde 2023')
    expect(wrapper.get('[data-rotulo-direto]').text()).toBe('5.150 páginas')

    await wrapper.get('button').trigger('click')
    expect(wrapper.findAll('th[scope="col"]')[0]!.text()).toBe('Ano')
  })

  it('sem nada da medida, a frase no lugar do gráfico e sem alternância (4.6)', () => {
    const pontos = [ponto(11, 146, 0, 2023), ponto(12, 214, 0, 2023)]
    const wrapper = montar({ medida: 'livros', pontos, periodo: 2023 })

    expect(wrapper.text()).toContain('Nenhum livro concluído em 2023.')
    expect(wrapper.find('[role="group"]').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
