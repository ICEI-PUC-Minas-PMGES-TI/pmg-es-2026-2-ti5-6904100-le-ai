import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'

import { routes } from '../router'
import { iniciarSessao } from '../session'

/**
 * Monta a rota dentro do shell real, com o router de verdade, no molde de
 * `ShellAutenticado.spec.ts`: o host com `<RouterView>` dá à tela a profundidade certa, e o
 * header do shell existe para a seta de voltar e o `#cabecalho-acoes`.
 *
 * `historico: 'navegador'` usa a história do jsdom, que guarda a entrada anterior (`state.back`)
 * como o navegador; a de memória não guarda.
 */
const Host = { template: '<RouterView />' }

export async function montarNaRota(caminho: string, opcoes: { historico?: 'memoria' | 'navegador' } = {}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  )
  iniciarSessao(
    { accessToken: 'jwt', refreshToken: 'renovacao' },
    { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
  )
  const history = opcoes.historico === 'navegador' ? createWebHistory() : createMemoryHistory()
  const router = createRouter({ history, routes })
  await router.push(caminho)
  await router.isReady()
  const wrapper = mount(Host, { global: { plugins: [router] }, attachTo: document.body })
  return { router, wrapper }
}
