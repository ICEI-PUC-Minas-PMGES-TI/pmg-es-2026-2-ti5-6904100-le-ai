import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ApiError } from '../services/api'
import { authService } from '../services/auth'
import { getToken, useSession } from '../session'
import CadastroView from './CadastroView.vue'

// vi.mock é hoisted para o topo do módulo pelo Vitest, então a ordem de escrita não importa: o
// import de authService acima já resolve para esta versão mockada.
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
      { path: '/cadastro', component: CadastroView },
      { path: '/login', component: { template: '<div>login</div>' } },
      { path: '/estante', component: { template: '<div>estante</div>' } },
    ],
  })
  return { router, wrapper: mount(CadastroView, { global: { plugins: [router] } }) }
}

async function preencherFormularioValido(wrapper: ReturnType<typeof mount>) {
  const campos = wrapper.findAll('input')
  await campos[0]!.setValue('marina.beltrao@gmail.com') // e-mail
  await campos[1]!.setValue('marinableu') // username
  await campos[2]!.setValue('Marina Beltrão') // nome de exibição
  await campos[3]!.setValue('1999-03-14') // data de nascimento
  await campos[4]!.setValue('senha-bem-comprida') // senha
  await campos[5]!.setValue('senha-bem-comprida') // confirmar senha
}

describe('CadastroView', () => {
  beforeEach(() => {
    localStorage.clear()
    useSession().encerrarSessao()
    vi.mocked(authService.cadastrar).mockReset()
    vi.mocked(authService.entrar).mockReset()
  })

  it('valida no cliente antes de chamar o servidor: formulário vazio mostra os 5 erros', async () => {
    const { wrapper } = montarComRouter()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Informe seu e-mail.')
    expect(wrapper.text()).toContain('Escolha um nome de usuário.')
    expect(wrapper.text()).toContain('Informe seu nome de exibição.')
    expect(wrapper.text()).toContain('Informe sua data de nascimento.')
    expect(wrapper.text()).toContain('Escolha uma senha.')
    expect(authService.cadastrar).not.toHaveBeenCalled()
  })

  it('mostra o erro ao sair do campo, antes do envio, e o tira assim que o valor é corrigido', async () => {
    const { wrapper } = montarComRouter()
    const email = wrapper.findAll('input')[0]!

    await email.setValue('marina@')
    expect(wrapper.text()).not.toContain('Informe um e-mail válido.')

    await email.trigger('blur')
    expect(wrapper.text()).toContain('Informe um e-mail válido.')
    // Só o campo que a pessoa deixou: os outros ainda não foram tocados.
    expect(wrapper.text()).not.toContain('Escolha um nome de usuário.')

    await email.setValue('marina@gmail.com')
    expect(wrapper.text()).not.toContain('Informe um e-mail válido.')
    expect(authService.cadastrar).not.toHaveBeenCalled()
  })

  it('recusa senha curta e menor de idade com as mensagens do protótipo, sem limpar o formulário', async () => {
    const { wrapper } = montarComRouter()
    await preencherFormularioValido(wrapper)
    const campos = wrapper.findAll('input')
    await campos[3]!.setValue('2010-09-02') // menor de idade
    await campos[4]!.setValue('curta') // senha curta

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('É necessário ter 18 anos ou mais para criar uma conta.')
    expect(wrapper.text()).toContain('Use pelo menos 8 caracteres.')
    // O helper da senha continua visível: a regra não deixou de existir (cadastro.md §4.3).
    expect(wrapper.text()).toContain('Mínimo de 8 caracteres')
    // Nada foi limpo.
    expect((campos[0]!.element as HTMLInputElement).value).toBe('marina.beltrao@gmail.com')
    expect(authService.cadastrar).not.toHaveBeenCalled()
  })

  it('aceita exatamente 18 anos completados hoje', async () => {
    const { wrapper } = montarComRouter()
    await preencherFormularioValido(wrapper)
    const hoje = new Date()
    const dataDeDezoitoAnos = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate())
    const iso = dataDeDezoitoAnos.toISOString().slice(0, 10)
    await wrapper.findAll('input')[3]!.setValue(iso)
    vi.mocked(authService.cadastrar).mockResolvedValue({
      id: 'u1',
      username: 'marinableu',
      displayName: 'Marina Beltrão',
    })
    vi.mocked(authService.entrar).mockResolvedValue({
      sessao: { accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 900, refreshToken: 'renovacao' },
      usuario: { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).not.toContain('É necessário ter 18 anos ou mais')
    expect(authService.cadastrar).toHaveBeenCalledTimes(1)
  })

  it('cadastro bem-sucedido entra automaticamente e navega para /estante', async () => {
    const { wrapper, router } = montarComRouter()
    await router.push('/cadastro')
    await preencherFormularioValido(wrapper)
    vi.mocked(authService.cadastrar).mockResolvedValue({
      id: 'u1',
      username: 'marinableu',
      displayName: 'Marina Beltrão',
    })
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
    expect(useSession().usuario.value).toEqual({
      id: 'u1',
      username: 'marinableu',
      displayName: 'Marina Beltrão',
    })
    expect(router.currentRoute.value.path).toBe('/estante')
  })

  it('conflito de username (409) mostra o banner e marca só o campo de usuário', async () => {
    const { wrapper } = montarComRouter()
    await preencherFormularioValido(wrapper)
    vi.mocked(authService.cadastrar).mockRejectedValue(
      new ApiError('Esse nome de usuário já está em uso. Escolha outro.', 409, 'CONFLITO', 'c1'),
    )

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Esse nome de usuário já está em uso. Escolha outro.')
    const campos = wrapper.findAll('input')
    expect(campos[1]!.classes()).toContain('border-rubi') // username
    expect(campos[0]!.classes()).not.toContain('border-rubi') // email
    expect(authService.entrar).not.toHaveBeenCalled()
  })

  it('durante o envio os campos ficam desabilitados e o botão muda de texto (cold start)', async () => {
    const { wrapper } = montarComRouter()
    await preencherFormularioValido(wrapper)
    let resolver!: (valor: { id: string, username: string, displayName: string }) => void
    vi.mocked(authService.cadastrar).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve
      }),
    )

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('button[type="submit"]').text()).toBe('Criando conta')
    // Como no protótipo: o formulário dá lugar ao indicador centralizado e o botão esmaece.
    expect(wrapper.find('fieldset').exists()).toBe(false)
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    expect(wrapper.get('button[type="submit"]').classes()).toContain('opacity-45')
    expect(wrapper.text()).toContain('O servidor está iniciando. Isso pode levar alguns segundos.')

    resolver({ id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' })
    vi.mocked(authService.entrar).mockResolvedValue({
      sessao: { accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 900, refreshToken: 'renovacao' },
      usuario: { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
    })
    await flushPromises()

    expect(wrapper.get('button[type="submit"]').text()).toBe('Criar conta')
  })

  it('volta com o formulário preenchido quando o envio falha', async () => {
    const { wrapper } = montarComRouter()
    await preencherFormularioValido(wrapper)
    vi.mocked(authService.cadastrar).mockRejectedValue(new TypeError('rede'))

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível acessar o servidor. Tente novamente.')
    const campos = wrapper.findAll('input')
    expect(campos).toHaveLength(6)
    expect((campos[1]!.element as HTMLInputElement).value).toBe('marinableu')
    expect((campos[5]!.element as HTMLInputElement).value).toBe('senha-bem-comprida')
  })

  it('confirmar senha diferente mostra o erro ao sair do campo e bloqueia o envio', async () => {
    const { wrapper } = montarComRouter()
    await preencherFormularioValido(wrapper)
    const confirmacao = wrapper.findAll('input')[5]!

    await confirmacao.setValue('outra-senha-qualquer')
    expect(wrapper.text()).not.toContain('As duas senhas precisam ser iguais.')
    await confirmacao.trigger('blur')
    expect(wrapper.text()).toContain('As duas senhas precisam ser iguais.')

    await wrapper.get('form').trigger('submit')
    expect(authService.cadastrar).not.toHaveBeenCalled()

    await confirmacao.setValue('senha-bem-comprida')
    expect(wrapper.text()).not.toContain('As duas senhas precisam ser iguais.')
  })

  it('a confirmação não vai no corpo do cadastro', async () => {
    const { wrapper } = montarComRouter()
    await preencherFormularioValido(wrapper)
    vi.mocked(authService.cadastrar).mockResolvedValue({
      id: 'u1',
      username: 'marinableu',
      displayName: 'Marina Beltrão',
    })
    vi.mocked(authService.entrar).mockResolvedValue({
      sessao: { accessToken: 'jwt', tokenType: 'Bearer', expiresIn: 900, refreshToken: 'renovacao' },
      usuario: { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
    })

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(vi.mocked(authService.cadastrar).mock.calls[0]![0]).toEqual({
      email: 'marina.beltrao@gmail.com',
      username: 'marinableu',
      displayName: 'Marina Beltrão',
      dataNascimento: '1999-03-14',
      senha: 'senha-bem-comprida',
    })
  })

  it('a política abre na própria tela, sem aceite, e volta com o formulário preenchido', async () => {
    const { wrapper } = montarComRouter()
    await preencherFormularioValido(wrapper)

    await wrapper.get('a[href="#politica-de-privacidade"]').trigger('click')

    expect(wrapper.text()).toContain('Dados que coletamos')
    expect(wrapper.text()).toContain('Versão 1.0')
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(false)

    await wrapper.get('button[aria-label="Voltar para o cadastro"]').trigger('click')
    await flushPromises()

    expect((wrapper.findAll('input')[1]!.element as HTMLInputElement).value).toBe('marinableu')
  })
})
