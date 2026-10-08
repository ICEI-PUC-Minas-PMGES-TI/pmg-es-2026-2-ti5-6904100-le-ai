import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ApiError } from '../../services/api'
import { authService } from '../../services/auth'
import { encerrarSessao, getToken, iniciarSessao } from '../../session'
import ExcluirContaView from './ExcluirContaView.vue'

vi.mock('../../services/auth', () => ({
  authService: { solicitarExclusao: vi.fn(), buscarUsuarioAtual: vi.fn() },
}))

const USUARIO = { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }
const PREVISTA = '2026-10-29T12:00:00Z'

function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/perfil/configuracoes/excluir-conta', component: ExcluirContaView },
      { path: '/perfil/configuracoes', component: { template: '<div>configuracoes</div>' } },
      { path: '/conta/exclusao-solicitada', component: { template: '<div>solicitada</div>' } },
    ],
  })
  void router.push('/perfil/configuracoes/excluir-conta')
  return { router, wrapper: mount(ExcluirContaView, { global: { plugins: [router] }, attachTo: document.body }) }
}

type Montado = ReturnType<typeof montar>['wrapper']

const botaoExcluir = (wrapper: Montado) =>
  wrapper.findAll('button').find((botao) => botao.text().startsWith('Excluir') || botao.text() === 'Excluindo')!

async function preencher(wrapper: Montado, senha = 'senha-bem-comprida') {
  await wrapper.get('input[type="password"]').setValue(senha)
  await wrapper.get('input[type="checkbox"]').setValue(true)
}

/** Abre o dialog pelo botão e confirma no destrutivo do dialog. */
async function confirmar(wrapper: Montado) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  const destrutivos = document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')
  const confirmarNoDialogo = [...destrutivos].find((botao) => botao.textContent?.trim() === 'Excluir conta')!
  confirmarNoDialogo.click()
  await flushPromises()
}

describe('ExcluirContaView', () => {
  beforeEach(() => {
    localStorage.clear()
    encerrarSessao()
    iniciarSessao({ accessToken: 'jwt', refreshToken: 'renovacao' }, USUARIO)
    vi.mocked(authService.solicitarExclusao).mockReset()
    vi.mocked(authService.buscarUsuarioAtual).mockResolvedValue({ ...USUARIO, email: 'marina.beltrao@gmail.com' })
    document.body.innerHTML = ''
  })

  it('mostra as consequências com o e-mail da conta e a data limite por extenso', async () => {
    const { wrapper } = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Oculta a partir de agora')
    expect(wrapper.text()).toContain('@marinableu e marina.beltrao@gmail.com')
    expect(wrapper.text()).toMatch(/Entendi que, depois de \d{1,2} de [a-zç]+ de \d{4}, a exclusão/)
  })

  it('o botão só habilita com senha e caixa marcada', async () => {
    const { wrapper } = montar()
    expect(botaoExcluir(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.get('input[type="password"]').setValue('senha-bem-comprida')
    expect(botaoExcluir(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.get('input[type="checkbox"]').setValue(true)
    expect(botaoExcluir(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('confirmado, limpa a sessão local e vai para Exclusão solicitada com a data do servidor', async () => {
    vi.mocked(authService.solicitarExclusao).mockResolvedValue({
      exclusaoSolicitadaEm: '2026-09-29T12:00:00Z',
      exclusaoPrevistaEm: PREVISTA,
    })
    const { wrapper, router } = montar()
    await preencher(wrapper)

    await confirmar(wrapper)

    expect(authService.solicitarExclusao).toHaveBeenCalledWith('senha-bem-comprida', expect.any(String))
    expect(getToken()).toBeNull()
    expect(router.currentRoute.value.path).toBe('/conta/exclusao-solicitada')
    expect(router.currentRoute.value.query.ate).toBe(PREVISTA)
  })

  it('senha errada mostra o banner, limpa o campo e mantém a caixa marcada', async () => {
    vi.mocked(authService.solicitarExclusao).mockRejectedValue(
      new ApiError('Senha incorreta. Sua conta continua como estava.', 422, 'ENTIDADE_NAO_PROCESSAVEL'),
    )
    const { wrapper } = montar()
    await preencher(wrapper, 'errada-mas-longa')

    await confirmar(wrapper)

    expect(wrapper.text()).toContain('Senha incorreta. Sua conta continua como estava.')
    expect((wrapper.get('input[type="password"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(true)
    expect(getToken()).toBe('jwt')
  })

  it('muitas tentativas vira alerta e desabilita o campo', async () => {
    vi.mocked(authService.solicitarExclusao).mockRejectedValue(
      new ApiError('Muitas tentativas.', 429, 'MUITAS_REQUISICOES'),
    )
    const { wrapper } = montar()
    await preencher(wrapper)

    await confirmar(wrapper)

    expect(wrapper.text()).toContain('Muitas tentativas com a senha errada.')
    expect(wrapper.get('input[type="password"]').attributes('disabled')).toBeDefined()
  })

  it('falha de rede preserva a senha e reenvia com a mesma chave', async () => {
    vi.mocked(authService.solicitarExclusao)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ exclusaoSolicitadaEm: '2026-09-29T12:00:00Z', exclusaoPrevistaEm: PREVISTA })
    const { wrapper } = montar()
    await preencher(wrapper)

    await confirmar(wrapper)
    expect(wrapper.text()).toContain('Não foi possível pedir a exclusão.')
    expect((wrapper.get('input[type="password"]').element as HTMLInputElement).value).toBe('senha-bem-comprida')

    await confirmar(wrapper)
    const [primeira, segunda] = vi.mocked(authService.solicitarExclusao).mock.calls
    expect(segunda![1]).toBe(primeira![1])
  })
})
