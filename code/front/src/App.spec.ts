import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { guardaDeSessao, routes } from './router'
import { encerrarSessao, iniciarSessao } from './session'
import App from './App.vue'

const USUARIO = { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }

/**
 * Router isolado por teste, não o singleton de produção (`./router`): mesma configuração de
 * rotas e a mesma guarda, mas `createMemoryHistory` própria para um teste nunca vazar estado de
 * navegação para o seguinte. Navega e espera a rota assentar antes de montar — no molde do
 * teste original, para a primeira renderização já vir com a guarda resolvida, sem depender de
 * uma segunda navegação redundante disparada pela instalação do plugin.
 */
async function montarApp(caminhoInicial = '/') {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.beforeEach(guardaDeSessao)
  await router.push(caminhoInicial)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  return { router, wrapper }
}

beforeEach(() => {
  localStorage.clear()
  encerrarSessao()
  document.documentElement.className = ''
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('App', () => {
  it('sem sessão, / redireciona para /login', async () => {
    const { router, wrapper } = await montarApp('/')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.get('h1').text()).toBe('Entrar')
  })

  it('com sessão, / redireciona para /estante dentro do shell autenticado', async () => {
    iniciarSessao('jwt-de-teste', USUARIO)
    const { router, wrapper } = await montarApp('/')

    expect(router.currentRoute.value.path).toBe('/estante')
    expect(wrapper.get('h1').text()).toBe('Minha estante')
  })

  it('preserva o destino original na query ao redirecionar para /login', async () => {
    const { router } = await montarApp('/feed')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.destino).toBe('/feed')
  })

  it('/login e /cadastro com sessão ativa redirecionam para /estante', async () => {
    iniciarSessao('jwt-de-teste', USUARIO)

    const { router: routerLogin } = await montarApp('/login')
    expect(routerLogin.currentRoute.value.path).toBe('/estante')

    const { router: routerCadastro } = await montarApp('/cadastro')
    expect(routerCadastro.currentRoute.value.path).toBe('/estante')
  })
})
