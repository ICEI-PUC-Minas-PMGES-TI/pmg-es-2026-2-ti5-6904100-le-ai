import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import { enviarAvatar, validarAvatar } from '../../services/avatar'
import { perfilService, type Perfil } from '../../services/perfil'
import { useSession } from '../../session'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/perfil', () => ({
  perfilService: { obterMeuPerfil: vi.fn(), atualizarMeuPerfil: vi.fn() },
}))
vi.mock('../../services/avatar', async (original) => ({
  ...(await original<typeof import('../../services/avatar')>()),
  validarAvatar: vi.fn(),
  enviarAvatar: vi.fn(),
}))

const servico = vi.mocked(perfilService)

const AVATAR_ATUAL = 'https://res.cloudinary.com/leai/image/upload/v1/avatares/atual.png'
const AVATAR_NOVO = { url: 'https://res.cloudinary.com/leai/image/upload/v2/avatares/novo.png', publicId: 'avatares/novo' }

const PERFIL: Perfil = {
  id: 'u1',
  username: 'marinableu',
  displayName: 'Marina Beltrão',
  avatarUrl: AVATAR_ATUAL,
  privacidade: 'publico',
  conteudoRestrito: false,
  relacao: 'proprio',
  biografia: 'Leio de tudo.',
  contadores: { seguidores: 84, seguidos: 97 },
}

type Wrapper = Awaited<ReturnType<typeof montarNaRota>>['wrapper']

/** Mesma tela, montada a partir do perfil: o histórico existe para o `X` voltar. */
async function abrir() {
  const montado = await montarNaRota('/perfil')
  await montado.router.push('/perfil/editar')
  await flushPromises()
  return montado
}

function botao(wrapper: Wrapper, texto: string) {
  return wrapper.findAll('button').find((b) => b.text() === texto)!
}

function escolherArquivo(wrapper: Wrapper) {
  const entrada = wrapper.get('input[type="file"]')
  const arquivo = new File([new Uint8Array([0x89, 0x50])], 'foto.png', { type: 'image/png' })
  Object.defineProperty(entrada.element, 'files', { value: [arquivo], configurable: true })
  return entrada.trigger('change')
}

describe('EditarPerfilView', () => {
  beforeEach(() => {
    localStorage.clear()
    servico.obterMeuPerfil.mockReset().mockResolvedValue(PERFIL)
    servico.atualizarMeuPerfil.mockReset().mockImplementation(async (dados) => ({
      ...PERFIL,
      displayName: dados.displayName,
      biografia: dados.biografia,
      privacidade: dados.privacidade,
      avatarUrl: dados.avatar?.url ?? null,
    }))
    vi.mocked(validarAvatar).mockReset().mockResolvedValue(null)
    vi.mocked(enviarAvatar).mockReset().mockResolvedValue(AVATAR_NOVO)
    URL.createObjectURL = vi.fn(() => 'blob:previa')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('preenche com o perfil, username fixo, e o X fecha direto quando nada mudou', async () => {
    const { wrapper, router } = await abrir()

    expect(wrapper.get('h1').text()).toBe('Editar perfil')
    expect(wrapper.text()).toContain('@marinableu')
    expect(wrapper.text()).toContain('O nome de usuário não muda.')
    expect((wrapper.get('#campo-nome').element as HTMLInputElement).value).toBe('Marina Beltrão')
    expect(wrapper.text()).toContain('14/60')

    await wrapper.get('button[aria-label="Fechar"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/perfil')
    expect(wrapper.text()).not.toContain('Descartar alterações?')
  })

  it('salva os quatro campos, mantém a foto atual e atualiza o nome da sessão', async () => {
    const { wrapper, router } = await abrir()

    await wrapper.get('#campo-nome').setValue('  Marina B.  ')
    await wrapper.get('#campo-biografia').setValue('   ')
    await wrapper.get('input[value="privado"]').setValue()
    await botao(wrapper, 'Salvar').trigger('click')
    await flushPromises()

    expect(servico.atualizarMeuPerfil).toHaveBeenCalledWith(
      {
        displayName: 'Marina B.',
        biografia: null,
        avatar: { url: AVATAR_ATUAL, publicId: 'avatares/atual' },
        privacidade: 'privado',
      },
      expect.any(String),
    )
    expect(useSession().usuario.value?.displayName).toBe('Marina B.')
    expect(router.currentRoute.value.path).toBe('/perfil')
  })

  it('nome vazio mostra o erro no campo e trava o salvar', async () => {
    const { wrapper } = await abrir()

    await wrapper.get('#campo-nome').setValue('')

    expect(wrapper.text()).toContain('Informe um nome de exibição.')
    const contador = wrapper.get('[data-contador-nome]')
    expect(contador.text()).toBe('0/60')
    expect(contador.classes()).toContain('text-rubi')
    expect(botao(wrapper, 'Salvar').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(servico.atualizarMeuPerfil).not.toHaveBeenCalled()
  })

  it('contador do nome à direita em mono, fora do helper; biografia sem contador', async () => {
    const { wrapper } = await abrir()

    const contador = wrapper.get('[data-contador-nome]')
    expect(contador.text()).toBe('14/60')
    expect(contador.classes()).toEqual(expect.arrayContaining(['self-end', 'font-mono', 'text-grafite-suave']))
    expect(wrapper.get('#campo-nome').attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.text()).not.toContain('/1000')
    expect(wrapper.get('#campo-biografia').classes()).toContain('resize-none')
  })

  it('biografia acima de 1000 caracteres mostra o erro e trava o salvar', async () => {
    const { wrapper } = await abrir()

    await wrapper.get('#campo-biografia').setValue('a'.repeat(1001))

    expect(wrapper.text()).toContain('Use no máximo 1000 caracteres.')
    expect(botao(wrapper, 'Salvar').attributes('disabled')).toBeDefined()
  })

  it('o rádio da privacidade é desenhado, com o nativo só para teclado e leitor de tela', async () => {
    const { wrapper } = await abrir()

    expect(wrapper.get('input[value="publico"]').classes()).toContain('sr-only')
    await wrapper.get('input[value="privado"]').setValue()
    expect((wrapper.get('input[value="privado"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('trocar para privado avisa que os seguidores continuam, sem bloquear', async () => {
    const { wrapper } = await abrir()

    await wrapper.get('input[value="privado"]').setValue()

    expect(wrapper.text()).toContain('Seus 84 seguidores atuais continuam seguindo você.')
    expect(botao(wrapper, 'Salvar').attributes('disabled')).toBeUndefined()
  })

  it('foto nova sobe ao Cloudinary e vai no salvar com o publicId', async () => {
    const { wrapper } = await abrir()

    await escolherArquivo(wrapper)
    await flushPromises()
    await botao(wrapper, 'Salvar').trigger('click')
    await flushPromises()

    expect(enviarAvatar).toHaveBeenCalledOnce()
    expect(servico.atualizarMeuPerfil.mock.calls[0]![0].avatar).toEqual(AVATAR_NOVO)
  })

  it('enquanto a foto sobe, mostra Enviando e o salvar espera', async () => {
    let terminar: (avatar: typeof AVATAR_NOVO) => void = () => {}
    vi.mocked(enviarAvatar).mockReturnValue(new Promise((resolve) => (terminar = resolve)))
    const { wrapper } = await abrir()

    await escolherArquivo(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain('Enviando')
    expect(botao(wrapper, 'Salvar').attributes('disabled')).toBeDefined()
    terminar(AVATAR_NOVO)
    await flushPromises()
    expect(wrapper.text()).not.toContain('Enviando')
    expect(botao(wrapper, 'Salvar').attributes('disabled')).toBeUndefined()
  })

  it('imagem recusada no navegador não sobe e mantém a foto anterior', async () => {
    vi.mocked(validarAvatar).mockResolvedValue('Formato não aceito. Use JPG, PNG ou WEBP.')
    const { wrapper } = await abrir()

    await escolherArquivo(wrapper)
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível usar essa imagem. Formato não aceito. Use JPG, PNG ou WEBP.')
    expect(enviarAvatar).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Remover foto')
  })

  it('avatar recusado pelo servidor volta a foto anterior e deixa salvar de novo', async () => {
    servico.atualizarMeuPerfil.mockRejectedValueOnce(
      new ApiError('Use uma foto enviada pelo Lê Ai.', 422, 'REGRA_DE_NEGOCIO'),
    )
    const { wrapper } = await abrir()

    await escolherArquivo(wrapper)
    await flushPromises()
    await botao(wrapper, 'Salvar').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Use uma foto enviada pelo Lê Ai.')
    await botao(wrapper, 'Salvar').trigger('click')
    await flushPromises()
    expect(servico.atualizarMeuPerfil.mock.calls[1]![0].avatar).toEqual({
      url: AVATAR_ATUAL,
      publicId: 'avatares/atual',
    })
  })

  it('remover foto manda avatar nulo', async () => {
    const { wrapper } = await abrir()

    await botao(wrapper, 'Remover foto').trigger('click')
    await botao(wrapper, 'Salvar').trigger('click')
    await flushPromises()

    expect(servico.atualizarMeuPerfil.mock.calls[0]![0].avatar).toBeNull()
  })

  it('sair com alterações pede confirmação; continuar fica, descartar sai', async () => {
    const { wrapper, router } = await abrir()
    await wrapper.get('#campo-nome').setValue('Outro nome')

    await wrapper.get('button[aria-label="Fechar"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Descartar alterações?')
    expect(router.currentRoute.value.path).toBe('/perfil/editar')

    const continuar = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Continuar editando')!
    continuar.click()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/perfil/editar')

    await router.push('/estante')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/perfil/editar')
    const descartar = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Descartar')!
    descartar.click()
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/estante')
    expect(servico.atualizarMeuPerfil).not.toHaveBeenCalled()
  })
})
