import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from '../router'
import { iniciarSessao } from '../session'

// `/descobrir` pede os assuntos ao montar; sem o mock, o teste do shell faria rede de verdade.
vi.mock('../services/acervo', () => ({
  acervoService: { listarAssuntos: vi.fn().mockResolvedValue([]), buscarLivros: vi.fn() },
}))

// ShellAutenticado é a própria rota de profundidade 0 e tem um <RouterView> interno para a
// filha (depth 1). Montá-lo direto faria esse <RouterView> interno resolver de novo a rota de
// depth 0 — ele mesmo — e duplicar tudo. Um host com <RouterView> no topo, no molde do
// App.vue real, é o que dá ao filho a profundidade certa para achar a view da rota, não o shell.
const Host = { template: '<RouterView />' }

async function montarNaRota(caminho: string) {
  iniciarSessao(
    { accessToken: 'jwt', refreshToken: 'renovacao' },
    { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
  )
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(caminho)
  await router.isReady()
  return mount(Host, { global: { plugins: [router] } })
}

describe('ShellAutenticado', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('mostra o título da rota ativa no cabeçalho e renderiza a view da rota', async () => {
    const wrapper = await montarNaRota('/estante')

    expect(wrapper.get('h1').text()).toBe('Minha estante')
    expect(wrapper.text()).toContain('Sua estante aparece aqui.')
  })

  it('a barra inferior tem os quatro itens e destaca só o ativo', async () => {
    const wrapper = await montarNaRota('/descobrir')

    // SidebarNavegacao também tem um <nav aria-label="Navegação principal">, renderizado
    // primeiro: o mesmo rótulo é proposital (as duas são a mesma navegação, uma por viewport),
    // então a barra inferior é a segunda ocorrência, não a única.
    const navegacoes = wrapper.findAll('nav[aria-label="Navegação principal"]')
    expect(navegacoes).toHaveLength(2)
    const barra = navegacoes[1]!
    const links = barra.findAll('a')
    expect(links).toHaveLength(4)
    expect(links.map((link) => link.attributes('href'))).toEqual([
      '/estante',
      '/descobrir',
      '/feed',
      '/perfil',
    ])
    // A cor ativa fica no ícone e no rótulo, não no <a> em si.
    expect(links[1]!.get('span').classes()).toContain('text-musgo')
    expect(links[0]!.get('span').classes()).not.toContain('text-musgo')
  })
})
