import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { acessoDeRecuperacao, descartarAcessoDeRecuperacao, guardarAcessoDeRecuperacao } from '../../contaEmExclusao'
import { ApiError } from '../../services/api'
import { authService } from '../../services/auth'
import RecuperarContaView from './RecuperarContaView.vue'

vi.mock('../../services/auth', () => ({
  authService: { cancelarExclusao: vi.fn() },
}))

const AGORA = new Date('2026-10-06T12:00:00Z')

function acesso(prevista = '2026-10-29T12:00:00Z') {
  return {
    accessToken: 'jwt-recuperacao',
    expiresIn: 900,
    exclusaoSolicitadaEm: '2026-09-29T12:00:00Z',
    exclusaoPrevistaEm: prevista,
    username: 'marinableu',
    nomeExibicao: 'Marina Beltrão',
  }
}

async function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/conta/recuperar', component: RecuperarContaView },
      { path: '/login', component: { template: '<div>login</div>' } },
    ],
  })
  await router.push('/conta/recuperar')
  const wrapper = mount(RecuperarContaView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

const botao = (wrapper: Awaited<ReturnType<typeof montar>>['wrapper'], texto: string) =>
  wrapper.findAll('button').find((b) => b.text() === texto)!

describe('RecuperarContaView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(AGORA)
    vi.mocked(authService.cancelarExclusao).mockReset()
    descartarAcessoDeRecuperacao()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sem acesso de recuperação, vai ao login', async () => {
    const { router } = await montar()

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('mostra a conta, a data por extenso e os dias que faltam', async () => {
    guardarAcessoDeRecuperacao(acesso())
    const { wrapper } = await montar()

    expect(wrapper.text()).toContain('Sua conta está em exclusão')
    expect(wrapper.text()).toContain('Marina Beltrão · @marinableu')
    expect(wrapper.text()).toContain('29 de outubro de 2026')
    expect(wrapper.text()).toContain('Faltam 23 dias')
    expect(wrapper.text()).not.toContain('não será mais possível recuperar')
  })

  it('no último dia, a faixa de prazo terminando aparece', async () => {
    guardarAcessoDeRecuperacao(acesso('2026-10-07T06:00:00Z'))
    const { wrapper } = await montar()

    expect(wrapper.text()).toContain('Falta 1 dia')
    expect(wrapper.text()).toContain('não será mais possível recuperar a conta')
  })

  it('cancelar com sucesso descarta o acesso e mostra Conta recuperada', async () => {
    vi.mocked(authService.cancelarExclusao).mockResolvedValue()
    guardarAcessoDeRecuperacao(acesso())
    const { wrapper } = await montar()

    await botao(wrapper, 'Cancelar exclusão').trigger('click')
    await flushPromises()

    expect(authService.cancelarExclusao).toHaveBeenCalledWith('jwt-recuperacao', expect.any(String))
    expect(wrapper.text()).toContain('Conta recuperada')
    expect(acessoDeRecuperacao()).toBeNull()
  })

  it('erro mantém a exclusão agendada e reenvia com a mesma chave', async () => {
    vi.mocked(authService.cancelarExclusao)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce()
    guardarAcessoDeRecuperacao(acesso())
    const { wrapper } = await montar()

    await botao(wrapper, 'Cancelar exclusão').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Não foi possível cancelar a exclusão.')

    await botao(wrapper, 'Cancelar exclusão').trigger('click')
    await flushPromises()
    const [primeira, segunda] = vi.mocked(authService.cancelarExclusao).mock.calls
    expect(segunda![1]).toBe(primeira![1])
  })

  it('acesso vencido vira alerta com Entrar de novo, sem Sair', async () => {
    vi.mocked(authService.cancelarExclusao).mockRejectedValue(
      new ApiError('Sua sessão expirou.', 401, 'NAO_AUTENTICADO'),
    )
    guardarAcessoDeRecuperacao(acesso())
    const { wrapper } = await montar()

    await botao(wrapper, 'Cancelar exclusão').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Seu acesso para cancelar expirou.')
    expect(botao(wrapper, 'Entrar de novo')).toBeDefined()
    expect(botao(wrapper, 'Sair')).toBeUndefined()
  })

  it('sair descarta o acesso e vai ao login sem confirmar', async () => {
    guardarAcessoDeRecuperacao(acesso())
    const { wrapper, router } = await montar()

    await botao(wrapper, 'Sair').trigger('click')
    await flushPromises()

    expect(acessoDeRecuperacao()).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
