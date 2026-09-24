import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { reagirAoFimDaSessao } from '../router'
import { authService } from '../services/auth'
import { encerrarSessao } from '../session'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/auth', async (original) => {
  const real = await original<typeof import('../services/auth')>()
  return { ...real, authService: { ...real.authService, sair: vi.fn() } }
})

describe('ConfiguracoesView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(authService.sair).mockReset()
    vi.mocked(authService.sair).mockImplementation(async () => {
      encerrarSessao()
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mostra nome e username da sessão, as duas linhas e a política', async () => {
    const { wrapper } = await montarNaRota('/perfil/configuracoes')

    expect(wrapper.text()).toContain('Marina Beltrão')
    expect(wrapper.text()).toContain('@marinableu')
    expect(wrapper.text()).toContain('Alterar senha')
    expect(wrapper.text()).toContain('Dados que coletamos')
    expect(wrapper.text()).toContain('Lê Ai · versão 1.0.0')
  })

  it('sair pede confirmação, revoga e vai ao login sem destino', async () => {
    const { router, wrapper } = await montarNaRota('/perfil/configuracoes')
    // Como em produção: o fim da sessão também dispara o redirecionamento com `?destino=`, e a
    // saída voluntária precisa prevalecer sobre ele.
    reagirAoFimDaSessao(router)

    const sair = wrapper.findAll('button').find((botao) => botao.text().includes('Sair da conta'))!
    await sair.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Sair da conta?')
    expect(authService.sair).not.toHaveBeenCalled()

    const confirmar = [...document.body.querySelectorAll('button')].find((botao) => botao.textContent?.trim() === 'Sair')!
    confirmar.click()
    await flushPromises()

    expect(authService.sair).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query).toEqual({})
  })
})
