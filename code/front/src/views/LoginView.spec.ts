import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ApiError } from '../services/api'
import { authService } from '../services/auth'
import { getToken, useSession } from '../session'
import LoginView from './LoginView.vue'

vi.mock('../services/auth', () => ({
  authService: {
    cadastrar: vi.fn(),
    entrar: vi.fn(),
    buscarUsuarioAtual: vi.fn(),
  },
}))

function montarComRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/cadastro', component: { template: '<div>cadastro</div>' } },
      { path: '/estante', component: { template: '<div>estante</div>' } },
    ],
  })
  return { router, wrapper: mount(LoginView, { global: { plugins: [router] } }) }
}

describe('LoginView', () => {
  beforeEach(() => {
    localStorage.clear()
    useSession().encerrarSessao()
    vi.mocked(authService.entrar).mockReset()
  })

  it('valida no cliente antes de chamar o servidor: campos vazios mostram os erros', async () => {
    const { wrapper } = montarComRouter()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Informe seu e-mail ou nome de usuário.')
    expect(wrapper.text()).toContain('Informe sua senha.')
    expect(authService.entrar).not.toHaveBeenCalled()
  })

  it('login bem-sucedido inicia a sessão e navega para /estante', async () => {
    const { wrapper, router } = montarComRouter()
    await router.push('/login')
    await wrapper.get('input').setValue('marinableu')
    await wrapper.findAll('input')[1]!.setValue('senha-bem-comprida')
    vi.mocked(authService.entrar).mockResolvedValue({
      sessao: { accessToken: 'jwt-novo', tokenType: 'Bearer', expiresIn: 900, refreshToken: 'renovacao' },
      usuario: { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(authService.entrar).toHaveBeenCalledWith({
      identificador: 'marinableu',
      senha: 'senha-bem-comprida',
    })
    expect(getToken()).toBe('jwt-novo')
    expect(useSession().usuario.value?.username).toBe('marinableu')
    expect(router.currentRoute.value.path).toBe('/estante')
  })

  it('credencial inválida marca os dois campos, mantém o identificador e limpa a senha', async () => {
    const { wrapper } = montarComRouter()
    const campos = wrapper.findAll('input')
    await campos[0]!.setValue('marinableu')
    await campos[1]!.setValue('senha-errada')
    vi.mocked(authService.entrar).mockRejectedValue(
      new ApiError('E-mail, nome de usuário ou senha incorretos.', 401, 'NAO_AUTENTICADO', 'c1'),
    )

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('E-mail, nome de usuário ou senha incorretos.')
    expect(campos[0]!.classes()).toContain('border-rubi')
    expect(campos[1]!.classes()).toContain('border-rubi')
    expect((campos[0]!.element as HTMLInputElement).value).toBe('marinableu')
    expect((campos[1]!.element as HTMLInputElement).value).toBe('')
  })

  it('bloqueio mostra alerta ambar e desabilita o botão; editar um campo libera de novo', async () => {
    const { wrapper } = montarComRouter()
    const campos = wrapper.findAll('input')
    await campos[0]!.setValue('marinableu')
    await campos[1]!.setValue('senha-bem-comprida')
    vi.mocked(authService.entrar).mockRejectedValue(
      new ApiError(
        'Muitas tentativas. Tente de novo em alguns minutos.',
        429,
        'MUITAS_REQUISICOES',
        'c1',
      ),
    )

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Muitas tentativas. Tente de novo em alguns minutos.')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    // Bloqueio é alerta (ambar), não erro (rubi): os campos não ganham borda de erro.
    expect(campos[0]!.classes()).not.toContain('border-rubi')

    await campos[1]!.setValue('outra-tentativa')

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Muitas tentativas')
  })

  it('durante o envio os campos ficam desabilitados e o botão muda de texto (cold start)', async () => {
    const { wrapper } = montarComRouter()
    const campos = wrapper.findAll('input')
    await campos[0]!.setValue('marinableu')
    await campos[1]!.setValue('senha-bem-comprida')
    let resolver!: (valor: {
      sessao: { accessToken: string, tokenType: string, expiresIn: number, refreshToken: string }
      usuario: { id: string, username: string, displayName: string }
    }) => void
    vi.mocked(authService.entrar).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve
      }),
    )

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('button[type="submit"]').text()).toBe('Entrando')
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('O servidor está iniciando. Isso pode levar alguns segundos.')

    resolver({
      sessao: { accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 900, refreshToken: 'renovacao' },
      usuario: { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
    })
    await flushPromises()

    expect(wrapper.get('button[type="submit"]').text()).toBe('Entrar')
  })
})
