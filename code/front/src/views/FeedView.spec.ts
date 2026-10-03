import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import { perfilService, type Perfil } from '../services/perfil'
import { socialService, type Atividade, type EstadoCurtida } from '../services/social'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/social', () => ({
  socialService: {
    listarFeed: vi.fn(),
    curtir: vi.fn(),
    descurtir: vi.fn(),
    listarComentariosRaiz: vi.fn(),
    listarRespostas: vi.fn(),
    comentar: vi.fn(),
  },
}))

vi.mock('../services/perfil', () => ({
  perfilService: {
    obterMeuPerfil: vi.fn(),
  },
}))

const social = vi.mocked(socialService)
const perfil = vi.mocked(perfilService)

const AUTOR = { id: 'u1', username: 'dandaralp', nomeExibicao: 'Dandara Lopes', avatarUrl: null }

function atividade(sobrescreve: Partial<Atividade> = {}): Atividade {
  return {
    id: 'a1',
    tipo: 'LEITURA_INICIADA',
    autor: AUTOR,
    livro: { id: 'l1', tipo: 'OFICIAL', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null },
    resenha: null,
    criadoEm: new Date().toISOString(),
    totalCurtidas: 4,
    totalComentarios: 2,
    curtidaPeloSolicitante: false,
    ...sobrescreve,
  }
}

function pagina(items: Atividade[], totalElements = items.length) {
  return { items, page: 0, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) || 1 }
}

function perfilComSeguidos(seguidos: number): Perfil {
  return {
    id: 'me',
    username: 'marinableu',
    displayName: 'Marina Beltrão',
    avatarUrl: null,
    privacidade: 'publico',
    conteudoRestrito: false,
    relacao: 'proprio',
    biografia: null,
    contadores: { seguidores: 0, seguidos },
  }
}

describe('FeedView', () => {
  beforeEach(() => {
    localStorage.clear()
    social.listarFeed.mockReset()
    social.curtir.mockReset()
    social.descurtir.mockReset()
    social.listarComentariosRaiz.mockReset()
    social.comentar.mockReset()
    perfil.obterMeuPerfil.mockReset()
  })

  it('carregando: mostra skeletons e some quando a página chega', async () => {
    let resolver!: (valor: ReturnType<typeof pagina>) => void
    social.listarFeed.mockReturnValue(new Promise((resolve) => (resolver = resolve)))

    const { wrapper } = await montarNaRota('/feed')
    expect(wrapper.findAll('.bg-capa-placeholder').length).toBeGreaterThan(0)

    resolver(pagina([atividade()]))
    await flushPromises()
    expect(wrapper.text()).toContain('Torto Arado')
  })

  it('erro: mostra o banner e "Tentar de novo" recarrega', async () => {
    social.listarFeed.mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce(pagina([atividade()]))

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar seu feed. Verifique sua conexão e tente de novo.')

    await wrapper.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Torto Arado')
    expect(social.listarFeed).toHaveBeenCalledTimes(2)
  })

  it('vazio sem seguir ninguém: título e botão para buscar leitor', async () => {
    social.listarFeed.mockResolvedValue(pagina([]))
    perfil.obterMeuPerfil.mockResolvedValue(perfilComSeguidos(0))

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    expect(wrapper.text()).toContain('Comece seguindo leitores')
    expect(wrapper.get('a[href="/perfil/buscar"]').text()).toBe('Buscar por nome de usuário')
  })

  it('vazio seguindo pessoas: título e link para a estante', async () => {
    social.listarFeed.mockResolvedValue(pagina([]))
    perfil.obterMeuPerfil.mockResolvedValue(perfilComSeguidos(3))

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    expect(wrapper.text()).toContain('Nada por aqui ainda')
    expect(wrapper.findAll('a[href="/estante"]').find((a) => a.text() === 'Ver minha estante')).toBeTruthy()
  })

  it('curtir muda o item antes de o servidor responder e depois usa o total dele, sem recarregar a página', async () => {
    social.listarFeed.mockResolvedValue(pagina([atividade({ totalCurtidas: 4, curtidaPeloSolicitante: false })]))
    let resolver!: (valor: EstadoCurtida) => void
    social.curtir.mockReturnValue(new Promise((resolve) => (resolver = resolve)))

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    await wrapper.get('[aria-label="Curtir, 4 curtidas"]').trigger('click')

    expect(social.curtir).toHaveBeenCalledWith('a1', expect.any(String))
    expect(wrapper.find('[aria-label="Descurtir, 5 curtidas"]').exists()).toBe(true)

    resolver({ atividadeId: 'a1', curtida: true, totalCurtidas: 6 })
    await flushPromises()

    expect(wrapper.find('[aria-label="Descurtir, 6 curtidas"]').exists()).toBe(true)
    expect(social.listarFeed).toHaveBeenCalledTimes(1)
  })

  it('descurtir muda o item na hora e chama o serviço', async () => {
    social.listarFeed.mockResolvedValue(pagina([atividade({ totalCurtidas: 5, curtidaPeloSolicitante: true })]))
    social.descurtir.mockReturnValue(new Promise(() => {}))

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    await wrapper.get('[aria-label="Descurtir, 5 curtidas"]').trigger('click')

    expect(social.descurtir).toHaveBeenCalledWith('a1', expect.any(String))
    expect(wrapper.find('[aria-label="Curtir, 4 curtidas"]').exists()).toBe(true)
  })

  it('curtir com falha volta o item ao estado anterior e mostra o aviso', async () => {
    social.listarFeed.mockResolvedValue(pagina([atividade({ totalCurtidas: 4, curtidaPeloSolicitante: false })]))
    social.curtir.mockRejectedValue(new ApiError('Não foi possível curtir. Tente novamente.', 500, 'ERRO'))

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    await wrapper.get('[aria-label="Curtir, 4 curtidas"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível curtir. Tente novamente.')
    expect(wrapper.find('[aria-label="Curtir, 4 curtidas"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Descurtir, 5 curtidas"]').exists()).toBe(false)
  })

  it('descurtir com falha de rede genérica volta o item e mostra a mensagem padrão', async () => {
    social.listarFeed.mockResolvedValue(pagina([atividade({ totalCurtidas: 5, curtidaPeloSolicitante: true })]))
    social.descurtir.mockRejectedValue(new Error('rede caiu'))

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    await wrapper.get('[aria-label="Descurtir, 5 curtidas"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível acessar o servidor. Tente novamente.')
    expect(wrapper.find('[aria-label="Descurtir, 5 curtidas"]').exists()).toBe(true)
  })

  it('dois cliques rápidos terminam descurtido, com duas requisições em sequência', async () => {
    social.listarFeed.mockResolvedValue(pagina([atividade({ totalCurtidas: 4, curtidaPeloSolicitante: false })]))
    let resolver!: (valor: EstadoCurtida) => void
    social.curtir.mockReturnValue(new Promise((resolve) => (resolver = resolve)))
    social.descurtir.mockResolvedValue(undefined)

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    await wrapper.get('[aria-label="Curtir, 4 curtidas"]').trigger('click')
    await wrapper.get('[aria-label="Descurtir, 5 curtidas"]').trigger('click')

    expect(social.curtir).toHaveBeenCalledTimes(1)
    expect(social.descurtir).not.toHaveBeenCalled()
    expect(wrapper.find('[aria-label="Curtir, 4 curtidas"]').exists()).toBe(true)

    resolver({ atividadeId: 'a1', curtida: true, totalCurtidas: 5 })
    await flushPromises()

    expect(social.curtir).toHaveBeenCalledTimes(1)
    expect(social.descurtir).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[aria-label="Curtir, 4 curtidas"]').exists()).toBe(true)
  })

  it('falha ao obter o próprio perfil no vazio cai para "Nada por aqui ainda"', async () => {
    social.listarFeed.mockResolvedValue(pagina([]))
    perfil.obterMeuPerfil.mockRejectedValue(new Error('falhou'))

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    expect(wrapper.text()).toContain('Nada por aqui ainda')
  })

  it('comentar abre o modal, e um comentário criado incrementa a contagem do item sem recarregar o feed', async () => {
    social.listarFeed.mockResolvedValue(pagina([atividade({ totalComentarios: 2 })]))
    social.listarComentariosRaiz.mockResolvedValue({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 1 })
    perfil.obterMeuPerfil.mockResolvedValue(perfilComSeguidos(1))

    const { wrapper } = await montarNaRota('/feed')
    await flushPromises()

    await wrapper.get('[aria-label="2 comentários"]').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Comentários')

    social.comentar.mockResolvedValue({
      id: 'novo',
      atividadeId: 'a1',
      comentarioRaizId: null,
      comentarioRespondidoId: null,
      usuarioRespondido: null,
      autor: AUTOR,
      texto: 'Comentário',
      mencoes: [],
      nivel: 'RAIZ',
      totalRespostas: 0,
      pertenceAoSolicitante: true,
      editado: false,
      criadoEm: new Date().toISOString(),
      atualizadoEm: null,
    })
    const campo = document.body.querySelector('textarea')!
    await campo.dispatchEvent(new Event('focus'))
    ;(campo as HTMLTextAreaElement).value = 'Comentário'
    campo.dispatchEvent(new Event('input'))
    await flushPromises()

    const enviar = document.body.querySelector('button[aria-label="Enviar comentário"]') as HTMLButtonElement
    enviar.click()
    await flushPromises()

    expect(social.listarFeed).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[aria-label="3 comentários"]')).toBeTruthy()
  })
})
