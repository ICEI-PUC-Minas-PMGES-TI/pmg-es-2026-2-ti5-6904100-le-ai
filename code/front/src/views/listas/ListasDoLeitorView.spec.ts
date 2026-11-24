import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { esquecerMinhaPrivacidade } from '../../listas/useMinhaPrivacidade'
import { ApiError } from '../../services/api'
import { listasService, type ListaResumo } from '../../services/listas'
import { perfilService, type Perfil } from '../../services/perfil'
import type { Pagina } from '../../services/perfil'
import { montarNaRota } from '../../testes/montarNaRota'

/**
 * Índice de listas em página própria (L-28, E6-02): as próprias listas em `/perfil/listas` e as de
 * outro leitor em `/leitores/:username/listas`.
 */

vi.mock('../../services/listas', async (original) => ({
  ...(await original<typeof import('../../services/listas')>()),
  listasService: { listarDoPerfil: vi.fn(), criar: vi.fn(), editar: vi.fn(), excluir: vi.fn() },
}))

vi.mock('../../services/perfil', async (original) => ({
  ...(await original<typeof import('../../services/perfil')>()),
  perfilService: { obterMeuPerfil: vi.fn(), obterPerfil: vi.fn() },
}))

const listas = vi.mocked(listasService)
const perfis = vi.mocked(perfilService)

function resumo(id: string, titulo: string, quantidadeLivros: number, descricao: string | null = null): ListaResumo {
  return { id, titulo, descricao, quantidadeLivros, capas: [], atualizadaEm: '2026-09-12T12:00:00Z' }
}

function pagina(itens: ListaResumo[]): Pagina<ListaResumo> {
  return { items: itens, page: 0, size: 20, totalElements: itens.length, totalPages: itens.length === 0 ? 0 : 1 }
}

function perfil(extras: Partial<Perfil> = {}): Perfil {
  return {
    id: 'u2',
    username: 'rafaokamoto',
    displayName: 'Rafael Okamoto',
    avatarUrl: null,
    privacidade: 'publico',
    conteudoRestrito: false,
    relacao: 'nenhuma',
    biografia: null,
    contadores: { seguidores: 3, seguidos: 4 },
    ...extras,
  }
}

const DUAS = [resumo('l1', 'Contos que eu indico', 3, 'Em ordem de por onde começar.'), resumo('l2', 'Quero ler em 2027', 1)]

function links(): (string | null)[] {
  return [...document.body.querySelectorAll('ul a')].map((a) => a.getAttribute('href'))
}

function botao(texto: string): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)
}

describe('ListasDoLeitorView', () => {
  beforeEach(() => {
    esquecerMinhaPrivacidade()
    perfis.obterMeuPerfil.mockReset().mockResolvedValue({ privacidade: 'privado' } as never)
    perfis.obterPerfil.mockReset().mockResolvedValue(perfil())
    listas.listarDoPerfil.mockReset().mockResolvedValue(pagina(DUAS))
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('próprias listas: contagem, visibilidade, Nova lista e cada card abre a lista sob /perfil', async () => {
    const { wrapper } = await montarNaRota('/perfil/listas')
    await flushPromises()

    // O índice próprio pede as listas do usuário da sessão.
    expect(listas.listarDoPerfil).toHaveBeenCalledWith('u1', 0)
    expect(perfis.obterPerfil).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('2 listas')
    expect(wrapper.text()).toContain('Seu perfil é privado: só quem você aceitou como seguidor vê suas listas.')
    expect(botao('Nova lista')).toBeDefined()
    expect(wrapper.text()).toContain('Contos que eu indico')
    expect(wrapper.text()).toContain('Em ordem de por onde começar.')
    expect(wrapper.text()).toContain('3 livros')
    expect(links()).toEqual(['/perfil/listas/l1', '/perfil/listas/l2'])
  })

  it('sem listas próprias: convite com Nova lista, que abre o formulário de criar', async () => {
    listas.listarDoPerfil.mockResolvedValue(pagina([]))
    const { wrapper } = await montarNaRota('/perfil/listas')
    await flushPromises()

    expect(wrapper.text()).toContain('Você ainda não tem listas')
    botao('Nova lista')!.click()
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Nova lista')
  })

  it('listas de outro leitor: linha do dono, sem Nova lista nem visibilidade, e links sob o username', async () => {
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto/listas')
    await flushPromises()

    expect(perfis.obterPerfil).toHaveBeenCalledWith('rafaokamoto')
    expect(listas.listarDoPerfil).toHaveBeenCalledWith('u2', 0)
    expect(wrapper.text()).toContain('Listas de')
    expect(wrapper.text()).toContain('Rafael Okamoto')
    expect(botao('Nova lista')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Seu perfil é')
    expect(links()).toEqual(['/leitores/rafaokamoto/listas/l1', '/leitores/rafaokamoto/listas/l2'])
  })

  it('perfil restrito (RN-08): bloco de restrição, sem contagem nem título de lista, e sem pedir as listas', async () => {
    perfis.obterPerfil.mockResolvedValue(perfil({ privacidade: 'privado', conteudoRestrito: true, displayName: 'Beatriz Nogueira' }))
    const { wrapper } = await montarNaRota('/leitores/bia/listas')
    await flushPromises()

    expect(wrapper.text()).toContain('Este perfil é privado')
    expect(wrapper.text()).toContain('Só quem Beatriz aceita como seguidor vê as listas.')
    expect(listas.listarDoPerfil).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Contos que eu indico')
  })

  it('título e descrição com marcação aparecem como texto no card (RNF-SEC-14)', async () => {
    const titulo = '<img src=x onerror="alert(1)">Clássicos'
    const descricao = '<b>sem</b> <script>alert(2)</script>'
    listas.listarDoPerfil.mockResolvedValue(pagina([resumo('l9', titulo, 2, descricao)]))
    await montarNaRota('/perfil/listas')
    await flushPromises()

    const card = document.body.querySelector('ul a')!
    expect(card.textContent).toContain(titulo)
    expect(card.textContent).toContain(descricao)
    expect(card.getAttribute('aria-label')).toBe(`${titulo}, 2 livros. ${descricao} Abrir lista.`)
    expect(card.querySelector('img[src="x"], b, script')).toBeNull()
  })

  // L-14 (E6-02): tempo esgotado do cliente (`TEMPO_LIMITE_EXCEDIDO`) no índice.
  it('tempo esgotado ao carregar as listas: banner com Tentar de novo, que carrega', async () => {
    listas.listarDoPerfil.mockRejectedValueOnce(
      new ApiError('O servidor demorou para responder. Tente novamente.', 0, 'TEMPO_LIMITE_EXCEDIDO'),
    )
    const { wrapper } = await montarNaRota('/perfil/listas')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar as listas. Verifique sua conexão e tente de novo.')
    expect(wrapper.text()).not.toContain('Você ainda não tem listas')

    botao('Tentar de novo')!.click()
    await flushPromises()
    expect(links()).toEqual(['/perfil/listas/l1', '/perfil/listas/l2'])
  })

  it('tempo esgotado ao buscar o dono das listas: banner, e Tentar de novo refaz o perfil e as listas', async () => {
    perfis.obterPerfil.mockRejectedValueOnce(
      new ApiError('O servidor demorou para responder. Tente novamente.', 0, 'TEMPO_LIMITE_EXCEDIDO'),
    )
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto/listas')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar as listas. Verifique sua conexão e tente de novo.')
    expect(listas.listarDoPerfil).not.toHaveBeenCalled()

    botao('Tentar de novo')!.click()
    await flushPromises()
    expect(perfis.obterPerfil).toHaveBeenCalledTimes(2)
    expect(links()).toEqual(['/leitores/rafaokamoto/listas/l1', '/leitores/rafaokamoto/listas/l2'])
  })
})
