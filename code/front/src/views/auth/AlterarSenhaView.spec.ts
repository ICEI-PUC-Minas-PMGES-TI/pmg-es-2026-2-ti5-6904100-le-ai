import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ApiError } from '../../services/api'
import { authService } from '../../services/auth'
import { encerrarSessao, getToken, iniciarSessao } from '../../session'
import AlterarSenhaView from './AlterarSenhaView.vue'

vi.mock('../../services/auth', () => ({
  authService: { alterarSenha: vi.fn() },
}))

const USUARIO = { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }

function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/perfil/configuracoes/alterar-senha', component: AlterarSenhaView },
      { path: '/perfil/configuracoes', component: { template: '<div>configuracoes</div>' } },
    ],
  })
  return { router, wrapper: mount(AlterarSenhaView, { global: { plugins: [router] }, attachTo: document.body }) }
}

async function enviar(wrapper: ReturnType<typeof montar>['wrapper'], atual: string, nova: string, confirmacao = nova) {
  const [campoAtual, campoNova, campoConfirmacao] = wrapper.findAll('input')
  await campoAtual!.setValue(atual)
  await campoNova!.setValue(nova)
  await campoConfirmacao!.setValue(confirmacao)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('AlterarSenhaView', () => {
  beforeEach(() => {
    localStorage.clear()
    encerrarSessao()
    iniciarSessao({ accessToken: 'jwt-velho', refreshToken: 'renovacao-velha' }, USUARIO)
    vi.mocked(authService.alterarSenha).mockReset()
  })

  it('sucesso grava a sessão nova do login pela senha nova e mostra a confirmação', async () => {
    vi.mocked(authService.alterarSenha).mockResolvedValue({
      sessao: { accessToken: 'jwt-novo', tokenType: 'Bearer', expiresIn: 900, refreshToken: 'renovacao-nova' },
      usuario: USUARIO,
    })
    const { wrapper } = montar()

    await enviar(wrapper, 'senha-atual-longa', 'senha-nova-longa')

    expect(authService.alterarSenha).toHaveBeenCalledWith(
      { senhaAtual: 'senha-atual-longa', novaSenha: 'senha-nova-longa' },
      USUARIO,
      expect.any(String),
    )
    expect(getToken()).toBe('jwt-novo')
    expect(wrapper.text()).toContain('Senha alterada')
    expect(wrapper.text()).toContain('aqui você continua conectado')
  })

  it('senha atual errada vira banner e limpa só o campo dela', async () => {
    vi.mocked(authService.alterarSenha).mockRejectedValue(
      new ApiError('Senha atual incorreta.', 422, 'ENTIDADE_NAO_PROCESSAVEL'),
    )
    const { wrapper } = montar()

    await enviar(wrapper, 'errada-mas-longa', 'senha-nova-longa')

    expect(wrapper.get('[role="alert"]').text()).toContain('Senha atual incorreta.')
    const [campoAtual, campoNova] = wrapper.findAll('input')
    expect((campoAtual!.element as HTMLInputElement).value).toBe('')
    expect((campoNova!.element as HTMLInputElement).value).toBe('senha-nova-longa')
  })

  it('senha nova comum (422 da política) vira erro no campo novo, não banner', async () => {
    vi.mocked(authService.alterarSenha).mockRejectedValue(
      new ApiError('Essa senha é muito comum. Escolha uma que não esteja em listas conhecidas.', 422, 'ENTIDADE_NAO_PROCESSAVEL'),
    )
    const { wrapper } = montar()

    await enviar(wrapper, 'senha-atual-longa', 'senha1234')

    expect(wrapper.text()).toContain('Essa senha é muito comum.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('confirmação diferente fica no cliente', async () => {
    const { wrapper } = montar()

    await enviar(wrapper, 'senha-atual-longa', 'senha-nova-longa', 'outra-coisa')

    expect(wrapper.text()).toContain('As duas senhas precisam ser iguais.')
    expect(authService.alterarSenha).not.toHaveBeenCalled()
  })

  it('salvando esmaece o botão, esconde Cancelar e avisa do cold start', async () => {
    vi.mocked(authService.alterarSenha).mockReturnValue(new Promise(() => {}))
    const { wrapper } = montar()
    expect(wrapper.findAll('button').some((b) => b.text() === 'Cancelar')).toBe(true)

    await enviar(wrapper, 'senha-atual-longa', 'senha-nova-longa')

    const salvando = wrapper.findAll('button').find((b) => b.text() === 'Salvando')!
    expect(salvando.classes()).toContain('opacity-45')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Cancelar')).toBe(false)
    expect(wrapper.text()).toContain('O servidor está iniciando.')
  })

  it('erro da política vem logo abaixo do campo, antes do helper', async () => {
    const { wrapper } = montar()

    await enviar(wrapper, 'senha-atual-longa', 'curta')

    const erro = wrapper.findAll('p').find((p) => p.text().includes('pelo menos 8 caracteres'))!
    const helper = wrapper.findAll('p').find((p) => p.text().startsWith('Mínimo de 8 caracteres'))!
    expect(erro.classes()).toContain('order-1')
    expect(helper.classes()).toContain('order-2')
  })
})
