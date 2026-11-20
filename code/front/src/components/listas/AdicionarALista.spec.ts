import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ApiError } from '../../services/api'
import { listasService, type ListaResumo } from '../../services/listas'
import AdicionarALista from './AdicionarALista.vue'

vi.mock('../../services/listas', async (original) => ({
  ...(await original<typeof import('../../services/listas')>()),
  listasService: { listarMinhas: vi.fn(), adicionar: vi.fn(), remover: vi.fn() },
}))
vi.mock('../../services/perfil', async (original) => ({
  ...(await original<typeof import('../../services/perfil')>()),
  perfilService: { obterMeuPerfil: vi.fn().mockResolvedValue({ privacidade: 'publico' }) },
}))

const listas = vi.mocked(listasService)

function resumo(id: string, titulo: string, quantidadeLivros: number, contemLivro: boolean): ListaResumo {
  return { id, titulo, descricao: null, quantidadeLivros, capas: [], atualizadaEm: '2026-09-12T12:00:00Z', contemLivro }
}

const LIVRO = { id: 'b1', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null, pessoal: false }

function montar(livro = LIVRO) {
  document.body.innerHTML = '<div id="avisos-flutuantes"></div>'
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { template: '<div />' } }] })
  return mount(AdicionarALista, {
    props: { aberto: true, livro },
    global: { plugins: [router] },
    attachTo: document.body,
  })
}

function linha(titulo: string): HTMLButtonElement {
  return [...document.body.querySelectorAll<HTMLButtonElement>('[data-linha-de-lista]')].find((b) =>
    b.textContent?.includes(titulo),
  )!
}

describe('AdicionarALista', () => {
  beforeEach(() => {
    listas.listarMinhas.mockReset().mockResolvedValue({
      items: [resumo('l1', 'Para ler numa viagem', 4, true), resumo('l2', 'Quero ler em 2027', 0, false)],
      page: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
    })
    listas.adicionar.mockReset()
    listas.remover.mockReset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('pede as listas com o livro e marca as que já o contêm', async () => {
    montar()
    await flushPromises()

    expect(listas.listarMinhas).toHaveBeenCalledWith('b1', 0)
    expect(linha('Para ler numa viagem').getAttribute('aria-pressed')).toBe('true')
    expect(linha('Quero ler em 2027').getAttribute('aria-pressed')).toBe('false')
    expect(document.body.textContent).toContain('O livro entra no fim de cada lista que você marcar.')
  })

  it('tocar adiciona na hora e soma a contagem; tocar de novo remove', async () => {
    listas.adicionar.mockResolvedValue({} as never)
    listas.remover.mockResolvedValue(undefined)
    montar()
    await flushPromises()

    linha('Quero ler em 2027').click()
    await flushPromises()
    expect(listas.adicionar).toHaveBeenCalledWith('l2', 'b1', expect.any(String))
    expect(linha('Quero ler em 2027').textContent).toContain('1 livro')

    linha('Para ler numa viagem').click()
    await flushPromises()
    expect(listas.remover).toHaveBeenCalledWith('l1', 'b1', expect.any(String))
    expect(linha('Para ler numa viagem').getAttribute('aria-pressed')).toBe('false')
    expect(linha('Para ler numa viagem').textContent).toContain('3 livros')
  })

  it('falha ao adicionar: a marca volta e tocar reenvia a mesma solicitação', async () => {
    listas.adicionar.mockRejectedValueOnce(new ApiError('Falha.', 503, 'SERVICO_INDISPONIVEL')).mockResolvedValueOnce({} as never)
    montar()
    await flushPromises()

    linha('Quero ler em 2027').click()
    await flushPromises()
    expect(linha('Quero ler em 2027').getAttribute('aria-pressed')).toBe('false')
    expect(document.body.textContent).toContain('Não foi possível adicionar. Toque para tentar de novo.')

    linha('Quero ler em 2027').click()
    await flushPromises()
    const [primeira, segunda] = listas.adicionar.mock.calls
    expect(segunda).toEqual(primeira)
    expect(linha('Quero ler em 2027').getAttribute('aria-pressed')).toBe('true')
  })

  // L-14 (E6-02): o tempo esgotado do cliente é `TEMPO_LIMITE_EXCEDIDO`, sem status.
  it('tempo esgotado ao carregar as listas: banner com Tentar de novo, que carrega', async () => {
    listas.listarMinhas.mockRejectedValueOnce(
      new ApiError('O servidor demorou para responder. Tente novamente.', 0, 'TEMPO_LIMITE_EXCEDIDO'),
    )
    montar()
    await flushPromises()

    expect(document.body.textContent).toContain('Não foi possível carregar suas listas. Verifique sua conexão e tente de novo.')
    expect(document.body.textContent).not.toContain('Você ainda não tem listas')
    ;[...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Tentar de novo')!.click()
    await flushPromises()

    expect(listas.listarMinhas).toHaveBeenCalledTimes(2)
    expect(linha('Quero ler em 2027')).toBeDefined()
  })

  it('tempo esgotado ao adicionar: a marca volta e tocar reenvia com a mesma chave', async () => {
    listas.adicionar
      .mockRejectedValueOnce(new ApiError('O servidor demorou para responder. Tente novamente.', 0, 'TEMPO_LIMITE_EXCEDIDO'))
      .mockResolvedValueOnce({} as never)
    montar()
    await flushPromises()

    linha('Quero ler em 2027').click()
    await flushPromises()
    expect(linha('Quero ler em 2027').getAttribute('aria-pressed')).toBe('false')
    expect(linha('Quero ler em 2027').textContent).toContain('0 livros')
    expect(document.body.textContent).toContain('Não foi possível adicionar. Toque para tentar de novo.')

    linha('Quero ler em 2027').click()
    await flushPromises()
    const [primeira, segunda] = listas.adicionar.mock.calls
    expect(segunda).toEqual(primeira)
    expect(linha('Quero ler em 2027').getAttribute('aria-pressed')).toBe('true')
    expect(linha('Quero ler em 2027').textContent).toContain('1 livro')
  })

  it('tempo esgotado ao remover: a marca volta e tocar reenvia a remoção, não uma adição', async () => {
    listas.remover
      .mockRejectedValueOnce(new ApiError('O servidor demorou para responder. Tente novamente.', 0, 'TEMPO_LIMITE_EXCEDIDO'))
      .mockResolvedValueOnce(undefined)
    montar()
    await flushPromises()

    linha('Para ler numa viagem').click()
    await flushPromises()
    expect(linha('Para ler numa viagem').getAttribute('aria-pressed')).toBe('true')
    expect(document.body.textContent).toContain('Não foi possível remover. Toque para tentar de novo.')

    linha('Para ler numa viagem').click()
    await flushPromises()
    const [primeira, segunda] = listas.remover.mock.calls
    expect(segunda).toEqual(primeira)
    expect(listas.adicionar).not.toHaveBeenCalled()
    expect(linha('Para ler numa viagem').getAttribute('aria-pressed')).toBe('false')
  })

  // L-28 (E6-02): texto de usuário com escape (RNF-SEC-14).
  it('título de lista com marcação aparece como texto na linha', async () => {
    const titulo = '<img src=x onerror="alert(1)"><b>Favoritos</b>'
    listas.listarMinhas.mockResolvedValue({
      items: [resumo('l9', titulo, 2, false)],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    })
    montar()
    await flushPromises()

    const botao = linha('Favoritos')
    expect(botao.textContent).toContain(titulo)
    expect(botao.querySelector('img, b')).toBeNull()
    expect(document.body.querySelector('img[src="x"]')).toBeNull()
  })

  it('sem listas: convite para criar a primeira', async () => {
    listas.listarMinhas.mockResolvedValue({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    montar()
    await flushPromises()

    expect(document.body.textContent).toContain('Você ainda não tem listas. Crie a primeira e este livro já entra nela.')
  })

  it('livro pessoal da própria leitora: faixa sobre o modo consulta', async () => {
    montar({ ...LIVRO, pessoal: true })
    await flushPromises()

    expect(document.body.textContent).toContain('Livro pessoal: quem puder ver a lista vê este livro em modo consulta')
  })
})
