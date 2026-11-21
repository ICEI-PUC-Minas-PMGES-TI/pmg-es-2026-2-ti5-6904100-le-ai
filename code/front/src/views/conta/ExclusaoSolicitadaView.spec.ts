import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { routes } from '../../router'
import { encerrarSessao } from '../../session'

/**
 * Exclusão solicitada (F-CONTA-2, L-19 da E6-02): a tela final do pedido, fora do shell e sem
 * sessão. A data é a que o servidor devolveu no `202`, levada na query.
 */

async function montar(caminho: string) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(caminho)
  await router.isReady()
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { router, wrapper }
}

describe('ExclusaoSolicitadaView', () => {
  beforeEach(() => {
    localStorage.clear()
    // A tela abre depois de a sessão acabar no `202`.
    encerrarSessao()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mostra a data do servidor por extenso, o que já aconteceu e como cancelar', async () => {
    const { wrapper } = await montar('/conta/exclusao-solicitada?ate=2026-12-20T15:00:00Z')

    expect(wrapper.find('h1, h2').text()).toBe('Exclusão solicitada')
    expect(wrapper.text()).toContain('Sua conta já está oculta para os outros leitores e você saiu de todos os aparelhos.')
    expect(wrapper.text()).toContain('Remoção definitiva em')
    expect(wrapper.text()).toContain('20 de dezembro de 2026')
    expect(wrapper.text()).toContain('Até essa data, entre com seu e-mail e senha para cancelar a exclusão.')
    // Fora do shell: nada da navegação autenticada.
    expect(wrapper.find('nav[aria-label="Navegação principal"]').exists()).toBe(false)
  })

  it.each([
    ['sem a data', '/conta/exclusao-solicitada'],
    ['com uma data inválida', '/conta/exclusao-solicitada?ate=amanha'],
  ])('%s, fala do prazo sem inventar uma data', async (_caso, caminho) => {
    const { wrapper } = await montar(caminho)

    expect(wrapper.text()).toContain('daqui a 30 dias')
    expect(wrapper.text()).not.toMatch(/\d{1,2} de [a-zç]+ de \d{4}/)
  })

  it('Ir para o login troca a tela pelo login, sem deixar a final no histórico', async () => {
    const { router, wrapper } = await montar('/conta/exclusao-solicitada?ate=2026-12-20T15:00:00Z')
    const replace = vi.spyOn(router, 'replace')

    const ir = wrapper.findAll('button').find((b) => b.text() === 'Ir para o login')!
    await ir.trigger('click')
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/login')
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
