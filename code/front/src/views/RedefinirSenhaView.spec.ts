import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ApiError } from '../services/api'
import { authService } from '../services/auth'
import { encerrarSessao, iniciarSessao, useSession } from '../session'
import RedefinirSenhaView from './RedefinirSenhaView.vue'

vi.mock('../services/auth', () => ({
  authService: { redefinirSenha: vi.fn() },
}))

async function montarEm(caminho: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/redefinir-senha', component: RedefinirSenhaView },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/recuperar-senha', component: { template: '<div>recuperar</div>' } },
    ],
  })
  await router.push(caminho)
  await router.isReady()
  const wrapper = mount(RedefinirSenhaView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { router, wrapper }
}

async function preencher(wrapper: Awaited<ReturnType<typeof montarEm>>['wrapper'], nova: string, confirmacao: string) {
  const [campoNova, campoConfirmacao] = wrapper.findAll('input')
  await campoNova!.setValue(nova)
  await campoConfirmacao!.setValue(confirmacao)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('RedefinirSenhaView', () => {
  beforeEach(() => {
    localStorage.clear()
    encerrarSessao()
    vi.mocked(authService.redefinirSenha).mockReset()
  })

  it('sem token no link, a tela inteira é "Este link não vale mais"', async () => {
    const { wrapper } = await montarEm('/redefinir-senha')

    expect(wrapper.text()).toContain('Este link não vale mais')
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('lê o token do fragmento e o apaga da barra de endereço', async () => {
    const { router, wrapper } = await montarEm('/redefinir-senha#token=abc123')
    vi.mocked(authService.redefinirSenha).mockResolvedValue()

    expect(router.currentRoute.value.hash).toBe('')
    await preencher(wrapper, 'senha-nova-longa', 'senha-nova-longa')

    expect(authService.redefinirSenha).toHaveBeenCalledWith(
      { token: 'abc123', novaSenha: 'senha-nova-longa' },
      expect.any(String),
    )
    expect(wrapper.text()).toContain('Senha alterada')
    expect(wrapper.text()).toContain('encerramos a sessão nos outros aparelhos')
  })

  it('sucesso encerra a sessão local que o navegador tivesse', async () => {
    iniciarSessao({ accessToken: 'jwt', refreshToken: 'r' }, { id: 'u1', username: 'marinableu', displayName: 'Marina' })
    const { wrapper } = await montarEm('/redefinir-senha#token=abc123')
    vi.mocked(authService.redefinirSenha).mockResolvedValue()

    await preencher(wrapper, 'senha-nova-longa', 'senha-nova-longa')

    expect(useSession().autenticado.value).toBe(false)
  })

  it('410 troca o formulário pelo estado de link inválido', async () => {
    const { wrapper } = await montarEm('/redefinir-senha#token=vencido')
    vi.mocked(authService.redefinirSenha).mockRejectedValue(
      new ApiError('O link de recuperação vale por 1 hora...', 410, 'RECURSO_EXPIRADO'),
    )

    await preencher(wrapper, 'senha-nova-longa', 'senha-nova-longa')

    expect(wrapper.text()).toContain('Este link não vale mais')
    expect(wrapper.text()).toContain('Pedir novo link')
  })

  it('senha comum recusada pelo servidor vira erro no campo e desabilita o botão', async () => {
    const { wrapper } = await montarEm('/redefinir-senha#token=abc123')
    vi.mocked(authService.redefinirSenha).mockRejectedValue(
      new ApiError('Essa senha é muito comum. Escolha uma que não esteja em listas conhecidas.', 400, 'REQUISICAO_INVALIDA'),
    )

    await preencher(wrapper, 'senha1234', 'senha1234')

    expect(wrapper.text()).toContain('Essa senha é muito comum.')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('confirmação diferente e senha curta ficam no cliente', async () => {
    const { wrapper } = await montarEm('/redefinir-senha#token=abc123')

    await preencher(wrapper, 'senha-nova-longa', 'outra-coisa')
    expect(wrapper.text()).toContain('As duas senhas precisam ser iguais.')

    await preencher(wrapper, 'curta', 'curta')
    expect(wrapper.text()).toContain('Escolha uma senha com pelo menos 8 caracteres.')
    expect(authService.redefinirSenha).not.toHaveBeenCalled()
  })
})
