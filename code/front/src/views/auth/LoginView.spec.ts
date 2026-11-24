import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { acessoDeRecuperacao } from '../../contaEmExclusao'
import { ApiError } from '../../services/api'
import { authService } from '../../services/auth'
import { encerrarSessao, getToken, initializeSession, useSession } from '../../session'
import LoginView from './LoginView.vue'

vi.mock('../../services/auth', () => ({
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
      { path: '/recuperar-senha', component: { template: '<div>recuperar</div>' } },
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

  it('conta em exclusão não inicia sessão: guarda o acesso de recuperação e abre a recuperação', async () => {
    const { wrapper, router } = montarComRouter()
    router.addRoute({ path: '/conta/recuperar', component: { template: '<div>recuperar conta</div>' } })
    await router.push('/login')
    await wrapper.get('input').setValue('marinableu')
    await wrapper.findAll('input')[1]!.setValue('senha-bem-comprida')
    const recuperacao = {
      accessToken: 'jwt-recuperacao',
      expiresIn: 900,
      exclusaoSolicitadaEm: '2026-09-29T12:00:00Z',
      exclusaoPrevistaEm: '2026-10-29T12:00:00Z',
      username: 'marinableu',
      nomeExibicao: 'Marina Beltrão',
    }
    vi.mocked(authService.entrar).mockResolvedValue({ recuperacao })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(getToken()).toBeNull()
    expect(acessoDeRecuperacao()).toEqual(recuperacao)
    expect(router.currentRoute.value.path).toBe('/conta/recuperar')
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
    // Protótipo (Login · Entrando): indicador acima do botão, botão e link esmaecidos.
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.get('button[type="submit"]').classes()).toContain('opacity-45')
    expect(wrapper.get('a[href="/recuperar-senha"]').attributes('tabindex')).toBe('-1')

    resolver({
      sessao: { accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 900, refreshToken: 'renovacao' },
      usuario: { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
    })
    await flushPromises()

    expect(wrapper.get('button[type="submit"]').text()).toBe('Entrar')
    expect(wrapper.find('.animate-spin').exists()).toBe(false)
  })

  it('"Esqueci minha senha" leva à recuperação', async () => {
    const { wrapper, router } = montarComRouter()
    await router.push('/login')

    await wrapper.get('a[href="/recuperar-senha"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/recuperar-senha')
  })
  // ------------------------------------------------------------------ F-MOD-OPC

  it('conta suspensa com a senha certa: banner âmbar, campos sem erro e senha limpa', async () => {
    const { wrapper } = montarComRouter()
    const campos = wrapper.findAll('input')
    await campos[0]!.setValue('svaladares')
    await campos[1]!.setValue('senha-bem-comprida')
    vi.mocked(authService.entrar).mockRejectedValue(
      new ApiError('Esta conta está suspensa.', 403, 'CONTA_SUSPENSA', 'c1'),
    )

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Esta conta está suspensa.')
    expect(wrapper.text()).toContain('A moderação do Lê Ai suspendeu o acesso.')
    expect(wrapper.find('.bg-ambar-fundo').exists()).toBe(true)
    expect(wrapper.find('.bg-rubi-fundo').exists()).toBe(false)
    expect(campos[0]!.classes()).not.toContain('border-rubi')
    expect((campos[0]!.element as HTMLInputElement).value).toBe('svaladares')
    expect((campos[1]!.element as HTMLInputElement).value).toBe('')
    expect(getToken()).toBeNull()
  })

  it('sessão encerrada pela suspensão: o login abre com o banner, uma vez só', async () => {
    encerrarSessao({ motivo: 'suspensa' })
    // Como no app: a navegação chega ao login antes de a tela montar.
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/login', component: LoginView }],
    })
    await router.push('/login?motivo=suspensa')
    const primeiro = { router, wrapper: mount(LoginView, { global: { plugins: [router] } }) }
    await flushPromises()
    expect(primeiro.wrapper.text()).toContain('Sua sessão foi encerrada porque esta conta foi suspensa.')
    // O motivo sai da URL: recarregar não repete o banner (validação, 06/11/2026).
    expect(primeiro.router.currentRoute.value.fullPath).toBe('/login')
    primeiro.wrapper.unmount()

    // Abrir o login de novo, sem o motivo na URL, não repete o banner.
    const segundo = montarComRouter()
    await segundo.router.push('/login')
    await flushPromises()
    expect(segundo.wrapper.text()).not.toContain('suspensa')
  })

  it('/login?motivo=suspensa aberto sem sessão encerrada não mostra o banner (revisão, 06/11/2026)', async () => {
    sessionStorage.clear()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/login', component: LoginView }],
    })
    await router.push('/login?motivo=suspensa')
    const wrapper = mount(LoginView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.text()).not.toContain('suspensa')
    expect(router.currentRoute.value.fullPath).toBe('/login')
  })

  it('outra aba: o banner aparece mesmo depois de a primeira consumir a chave comum', async () => {
    sessionStorage.clear()
    initializeSession()
    // A outra aba suspensa grava o motivo; esta recebe o evento e guarda a cópia dela.
    window.dispatchEvent(new StorageEvent('storage', { key: 'le-ai-fim-de-sessao', newValue: 'suspensa' }))
    // A primeira aba abre o login e consome a chave comum; o evento de remoção chega aqui.
    window.dispatchEvent(new StorageEvent('storage', { key: 'le-ai-fim-de-sessao', newValue: null }))
    const { wrapper, router } = montarComRouter()
    await router.push('/login?motivo=suspensa')
    await flushPromises()

    expect(wrapper.text()).toContain('Sua sessão foi encerrada porque esta conta foi suspensa.')
  })

  it('logout manual e exclusão de conta não mostram o banner', async () => {
    useSession().encerrarSessao()
    const { wrapper, router } = montarComRouter()
    await router.push('/login')
    await flushPromises()

    expect(wrapper.text()).not.toContain('suspensa')
  })
})
