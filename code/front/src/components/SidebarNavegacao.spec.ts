import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from '../router'
import { iniciarSessao } from '../session'
import SidebarNavegacao from './SidebarNavegacao.vue'

function stubMatchMedia(bateNaFaixaDeRetracao: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: bateNaFaixaDeRetracao,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

async function montarNaRota(caminho: string) {
  iniciarSessao(
    { accessToken: 'jwt', refreshToken: 'renovacao' },
    { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
  )
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(caminho)
  await router.isReady()
  return mount(SidebarNavegacao, { global: { plugins: [router] } })
}

describe('SidebarNavegacao', () => {
  beforeEach(() => {
    localStorage.clear()
    stubMatchMedia(false)
  })

  it('lista os quatro itens, cada um apontando para a própria rota', async () => {
    const wrapper = await montarNaRota('/feed')

    const links = wrapper.findAll('a')
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/estante',
      '/descobrir',
      '/feed',
      '/perfil',
    ])
    expect(wrapper.text()).toContain('Estante')
    expect(wrapper.text()).toContain('Descobrir')
    expect(wrapper.text()).toContain('Feed')
    expect(wrapper.text()).toContain('Perfil')
  })

  it('destaca só o item da rota ativa', async () => {
    const wrapper = await montarNaRota('/feed')

    const links = wrapper.findAll('a')
    const feed = links[2]!
    const estante = links[0]!
    expect(feed.classes()).toContain('bg-musgo-fundo')
    expect(estante.classes()).not.toContain('bg-musgo-fundo')
  })

  it('nasce expandida fora da faixa de 768 a 1024px', async () => {
    const wrapper = await montarNaRota('/estante')

    expect(wrapper.get('nav').classes()).toContain('w-[248px]')
    expect(wrapper.text()).toContain('Lê Ai')
  })

  it('nasce retraída entre 768 e 1024px', async () => {
    stubMatchMedia(true)
    const wrapper = await montarNaRota('/estante')

    expect(wrapper.get('nav').classes()).toContain('w-[72px]')
  })

  it('o botão retrai e expande de novo ao clicar, anunciando o estado', async () => {
    const wrapper = await montarNaRota('/estante')
    const botao = wrapper.get('button')

    expect(botao.attributes('aria-expanded')).toBe('true')
    expect(botao.attributes('aria-label')).toBe('Retrair menu')

    await botao.trigger('click')

    expect(wrapper.get('nav').classes()).toContain('w-[72px]')
    expect(botao.attributes('aria-expanded')).toBe('false')
    expect(botao.attributes('aria-label')).toBe('Expandir menu')

    await botao.trigger('click')

    expect(wrapper.get('nav').classes()).toContain('w-[248px]')
    expect(botao.attributes('aria-expanded')).toBe('true')
  })
})
