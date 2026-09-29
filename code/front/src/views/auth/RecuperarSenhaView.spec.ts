import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ApiError } from '../../services/api'
import { authService } from '../../services/auth'
import RecuperarSenhaView from './RecuperarSenhaView.vue'

vi.mock('../../services/auth', () => ({
  authService: { solicitarRecuperacao: vi.fn() },
}))

function montar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/recuperar-senha', component: RecuperarSenhaView },
      { path: '/login', component: { template: '<div>login</div>' } },
    ],
  })
  return { router, wrapper: mount(RecuperarSenhaView, { global: { plugins: [router] }, attachTo: document.body }) }
}

async function pedir(wrapper: ReturnType<typeof montar>['wrapper'], email: string) {
  await wrapper.get('input').setValue(email)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('RecuperarSenhaView', () => {
  beforeEach(() => {
    vi.mocked(authService.solicitarRecuperacao).mockReset()
  })

  it('formato inválido fica no cliente e não consulta o servidor', async () => {
    const { wrapper } = montar()

    await pedir(wrapper, 'marina.beltrao@')

    expect(wrapper.text()).toContain('Digite um e-mail completo, como nome@provedor.com.')
    expect(wrapper.text()).toContain('O link vale por 1 hora e só pode ser usado uma vez.')
    expect(authService.solicitarRecuperacao).not.toHaveBeenCalled()
  })

  it('o erro de formato vem logo abaixo do campo, antes do helper', async () => {
    const { wrapper } = montar()

    await pedir(wrapper, 'marina.beltrao@')

    // A ordem visual é por order do flex (CampoTexto erroAntesDoHelper), não pela do DOM.
    const erro = wrapper.findAll('p').find((p) => p.text().startsWith('Digite um e-mail completo'))!
    const helper = wrapper.findAll('p').find((p) => p.text().startsWith('O link vale por 1 hora'))!
    expect(erro.classes()).toContain('order-1')
    expect(helper.classes()).toContain('order-2')
  })

  it('durante o envio o botão esmaece e o "Voltar para entrar" de baixo some', async () => {
    let resolver!: () => void
    vi.mocked(authService.solicitarRecuperacao).mockReturnValue(
      new Promise<void>((resolve) => {
        resolver = resolve
      }),
    )
    const { wrapper } = montar()
    await wrapper.get('input').setValue('marina.beltrao@gmail.com')

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('button[type="submit"]').text()).toBe('Enviando')
    expect(wrapper.get('button[type="submit"]').classes()).toContain('opacity-45')
    expect(wrapper.text()).toContain('O servidor está iniciando. Isso pode levar alguns segundos.')
    expect(wrapper.findAll('a').filter((link) => link.text() === 'Voltar para entrar')).toHaveLength(1)

    resolver()
    await flushPromises()
  })

  it('202 vira a confirmação neutra com o e-mail que a pessoa digitou', async () => {
    vi.mocked(authService.solicitarRecuperacao).mockResolvedValue()
    const { wrapper } = montar()

    await pedir(wrapper, ' marina.beltrao@gmail.com ')

    expect(authService.solicitarRecuperacao).toHaveBeenCalledWith('marina.beltrao@gmail.com')
    expect(wrapper.text()).toContain('Verifique seu e-mail')
    expect(wrapper.text()).toContain('Se existir uma conta com marina.beltrao@gmail.com, enviamos um link')
    expect(wrapper.find('form').exists()).toBe(false)
    // Na web a confirmação começa pelo ícone: a seta do topo fica só no celular.
    expect(wrapper.get('a[aria-label="Voltar para entrar"]').classes()).toContain('md:hidden')
  })

  it('"Enviar de novo" devolve o formulário com o e-mail preenchido', async () => {
    vi.mocked(authService.solicitarRecuperacao).mockResolvedValue()
    const { wrapper } = montar()
    await pedir(wrapper, 'marina.beltrao@gmail.com')

    const enviarDeNovo = wrapper.findAll('button').find((botao) => botao.text() === 'Enviar de novo')!
    await enviarDeNovo.trigger('click')

    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('marina.beltrao@gmail.com')
  })

  it('429 é alerta de limite, não confirmação nem erro', async () => {
    vi.mocked(authService.solicitarRecuperacao).mockRejectedValue(
      new ApiError('Muitas requisições.', 429, 'MUITAS_REQUISICOES'),
    )
    const { wrapper } = montar()

    await pedir(wrapper, 'marina.beltrao@gmail.com')

    expect(wrapper.text()).toContain('Muitas solicitações. Tente de novo em alguns minutos.')
    expect(wrapper.text()).not.toContain('Verifique seu e-mail')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('falha de rede é erro, não confirmação: nenhum e-mail saiu', async () => {
    vi.mocked(authService.solicitarRecuperacao).mockRejectedValue(
      new ApiError('Não foi possível acessar o servidor. Tente novamente.', 0, 'SERVICO_INDISPONIVEL'),
    )
    const { wrapper } = montar()

    await pedir(wrapper, 'marina.beltrao@gmail.com')

    expect(wrapper.text()).toContain('Não foi possível acessar o servidor. Tente novamente.')
    expect(wrapper.text()).not.toContain('Verifique seu e-mail')
  })
})
