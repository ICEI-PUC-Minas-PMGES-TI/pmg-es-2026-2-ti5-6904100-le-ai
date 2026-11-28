import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from '../../router'
import { itemEstante } from '../../testes/estante'
import type { OrigemDoCard } from '../../estante/rotaDoLivroDoCard'
import type { ItemEstante } from '../../services/leitura'
import CardEstante from './CardEstante.vue'

const OFICIAL = itemEstante('livro-1', 'Torto Arado', {
  livro: { tipo: 'oficial', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null },
  status: 'LENDO',
  percentualConcluido: 40,
})
const PESSOAL = itemEstante('pessoal-1', 'Diário de bordo', {
  livro: { tipo: 'pessoal', titulo: 'Diário de bordo', autor: 'Marina Beltrão', capaUrl: null },
})

async function montar(item: ItemEstante, props: { acionavel?: boolean; origem?: OrigemDoCard } = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/login')
  await router.isReady()
  const wrapper = mount(CardEstante, { props: { item, ...props }, global: { plugins: [router] } })
  return { wrapper, router }
}

describe('CardEstante (capa e título abrem a página do livro)', () => {
  it('na estante, capa e título do livro oficial levam à página dele na aba Estante', async () => {
    const { wrapper } = await montar(OFICIAL)

    expect(wrapper.get('[data-link-titulo]').attributes('href')).toBe('/livros/livro-1?origem=estante')
    expect(wrapper.get('[data-link-titulo]').text()).toBe('Torto Arado')
    expect(wrapper.get('[data-link-capa]').attributes('href')).toBe('/livros/livro-1?origem=estante')
  })

  it('a capa repete o link do título e fica fora da tabulação e do leitor de tela', async () => {
    const { wrapper } = await montar(OFICIAL)

    const capa = wrapper.get('[data-link-capa]')
    expect(capa.attributes('tabindex')).toBe('-1')
    expect(capa.attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('[data-link-titulo]').attributes('tabindex')).toBeUndefined()
  })

  it('o livro pessoal abre a página do livro pessoal, na estante e no Meu perfil', async () => {
    for (const origem of ['estante', 'meu-perfil'] as const) {
      const { wrapper } = await montar(PESSOAL, { origem, acionavel: origem === 'estante' })

      expect(wrapper.get('[data-link-titulo]').attributes('href')).toBe('/livros/pessoal/pessoal-1')
      expect(wrapper.get('[data-link-capa]').attributes('href')).toBe('/livros/pessoal/pessoal-1')
    }
  })

  it('nos perfis, o livro oficial abre na aba Perfil', async () => {
    for (const origem of ['meu-perfil', 'outro-perfil'] as const) {
      const { wrapper } = await montar(OFICIAL, { origem, acionavel: false })

      expect(wrapper.get('[data-link-titulo]').attributes('href')).toBe('/livros/livro-1?origem=perfil')
    }
  })

  it('no perfil de outro leitor, o livro pessoal fica sem link (RN-15)', async () => {
    const { wrapper } = await montar(PESSOAL, { origem: 'outro-perfil', acionavel: false })

    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.text()).toContain('Diário de bordo')
  })

  it('sem o tipo na resposta, o livro vale como oficial', async () => {
    const semTipo = itemEstante('livro-2', 'Vidas Secas')

    const { wrapper } = await montar(semTipo)

    expect(wrapper.get('[data-link-titulo]').attributes('href')).toBe('/livros/livro-2?origem=estante')
  })

  it('tocar no título navega para a página do livro e não abre as ações', async () => {
    const { wrapper, router } = await montar(OFICIAL)

    await wrapper.get('[data-link-titulo]').trigger('click')
    await router.isReady()
    await new Promise((resolver) => setTimeout(resolver))

    expect(router.currentRoute.value.fullPath).toBe('/livros/livro-1?origem=estante')
    expect(wrapper.emitted('abrir')).toBeUndefined()
  })

  it('o botão de mais ações, a barra de progresso e o resto do card abrem as ações', async () => {
    const { wrapper } = await montar(OFICIAL)

    const botao = wrapper.get('button[data-acoes]')
    expect(botao.attributes('aria-label')).toBe('Ações de Torto Arado')
    await botao.trigger('click')
    await wrapper.get('[role="progressbar"]').trigger('click')
    await wrapper.get('[data-resto-do-card]').trigger('click')

    expect(wrapper.emitted('abrir')).toEqual([[OFICIAL], [OFICIAL], [OFICIAL]])
  })

  it('não acionável (perfis): sem botão de ações, e o resto do card não abre nada', async () => {
    const { wrapper } = await montar(OFICIAL, { origem: 'meu-perfil', acionavel: false })

    expect(wrapper.find('button').exists()).toBe(false)
    await wrapper.get('[data-resto-do-card]').trigger('click')

    expect(wrapper.emitted('abrir')).toBeUndefined()
  })
})
