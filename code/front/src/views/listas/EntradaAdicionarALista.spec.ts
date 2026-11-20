import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService, type LivroPessoalDetalhe } from '../../services/acervo'
import { leituraService } from '../../services/leitura'
import { listasService, type ListaResumo } from '../../services/listas'
import type { Pagina } from '../../services/perfil'
import { livroOficial, paginaDeResenhas } from '../../testes/massaDoLivro'
import { montarNaRota } from '../../testes/montarNaRota'

/**
 * Entrada `Adicionar à lista` nas páginas de livro (L-28, E6-02; RF-LST-02, RF-LST-05): o menu
 * `Mais ações` do livro oficial (folha abaixo de 768px, dropdown a partir dele) e as ações do dono
 * do livro pessoal. As telas são do Vicenzo; aqui só se prova o caminho até o dialog da F-LST.
 */

vi.mock('../../services/listas', async (original) => ({
  ...(await original<typeof import('../../services/listas')>()),
  listasService: { listarMinhas: vi.fn(), adicionar: vi.fn(), remover: vi.fn(), criar: vi.fn() },
}))

vi.mock('../../services/perfil', async (original) => ({
  ...(await original<typeof import('../../services/perfil')>()),
  perfilService: { obterMeuPerfil: vi.fn().mockResolvedValue({ privacidade: 'publico' }) },
}))

vi.mock('../../services/acervo', () => ({
  acervoService: {
    obterLivroOficial: vi.fn(),
    listarResenhasDoLivro: vi.fn(),
    listarAssuntos: vi.fn().mockResolvedValue([]),
    buscarLivros: vi.fn(),
    obterLivroPessoal: vi.fn(),
    excluirLivroPessoal: vi.fn(),
  },
}))

vi.mock('../../services/leitura', () => ({
  leituraService: {
    obterMinhaAvaliacao: vi.fn(),
    salvarNota: vi.fn(),
    excluirNota: vi.fn(),
    consultarItemEstante: vi.fn(),
    consultarConclusoes: vi.fn(),
    consultarFavorito: vi.fn(),
    detalharLeitura: vi.fn(),
    reagir: vi.fn(),
    removerReacao: vi.fn(),
    listarFrases: vi.fn(),
  },
}))

const listas = vi.mocked(listasService)
const acervo = vi.mocked(acervoService)
const leituras = vi.mocked(leituraService)

function pagina(itens: ListaResumo[]): Pagina<ListaResumo> {
  return { items: itens, page: 0, size: 20, totalElements: itens.length, totalPages: itens.length === 0 ? 0 : 1 }
}

const MINHAS = [
  { id: 'l1', titulo: 'Para ler numa viagem', descricao: null, quantidadeLivros: 4, capas: [], atualizadaEm: '2026-09-12T12:00:00Z', contemLivro: false },
]

const PESSOAL_DO_DONO: LivroPessoalDetalhe = {
  id: 'lp-1',
  tipo: 'pessoal',
  donoId: 'u1',
  titulo: 'Cartas de um sertanejo',
  autor: 'Marina Albuquerque',
  paginas: 184,
  sinopse: null,
  capaUrl: null,
  modoConsulta: false,
  notaDoDono: null,
  resenhaDoDono: null,
  dono: { nome: 'Marina Albuquerque', avatarUrl: null },
  assuntos: [],
}

function dialogoDeListas(): Element | undefined {
  return [...document.body.querySelectorAll('[role="dialog"]')].find((d) => d.querySelector('[aria-label="Suas listas"]'))
}

function botao(texto: string, dentro: ParentNode = document.body): HTMLButtonElement | undefined {
  return [...dentro.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)
}

describe('entrada Adicionar à lista', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    listas.listarMinhas.mockReset().mockResolvedValue(pagina(MINHAS))
    listas.adicionar.mockReset().mockResolvedValue({} as never)
    acervo.obterLivroOficial.mockReset().mockResolvedValue(livroOficial())
    acervo.listarResenhasDoLivro.mockReset().mockResolvedValue(paginaDeResenhas([]))
    acervo.obterLivroPessoal.mockReset().mockResolvedValue(PESSOAL_DO_DONO)
    leituras.obterMinhaAvaliacao.mockReset().mockResolvedValue({ livroId: 'x', nota: null, resenha: null })
    leituras.consultarItemEstante.mockReset().mockResolvedValue(null)
    leituras.consultarConclusoes.mockReset().mockResolvedValue({ livroId: 'x', vezesLido: 0 })
    leituras.consultarFavorito.mockReset().mockResolvedValue({ livroId: 'x', favorito: false, favoritadoEm: null })
    leituras.listarFrases.mockReset().mockResolvedValue({
      itens: [],
      paginacao: { page: 1, limite: 3, totalItens: 0, totalPaginas: 0 },
      minhasFrases: 0,
      limitePorLivro: 10,
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('livro oficial, celular: Mais ações abre a folha, e Adicionar à lista abre o dialog com o livro', async () => {
    await montarNaRota('/livros/livro-1?origem=descobrir')
    await flushPromises()

    document.body.querySelector<HTMLButtonElement>('button[aria-label="Mais ações"]')!.click()
    await flushPromises()
    const folha = document.body.querySelector('[role="dialog"]')!
    expect([...folha.querySelectorAll('button')].map((b) => b.textContent?.trim())).toEqual(
      expect.arrayContaining(['Adicionar à lista', 'Recomendar a um leitor']),
    )
    botao('Adicionar à lista', folha)!.click()
    await flushPromises()

    const dialogo = dialogoDeListas()!
    expect(dialogo.textContent).toContain('Torto Arado')
    expect(dialogo.textContent).toContain('Para ler numa viagem')
    expect(listas.listarMinhas).toHaveBeenCalledWith('livro-1', 0)

    dialogo.querySelector<HTMLButtonElement>('[data-linha-de-lista][aria-pressed]')!.click()
    await flushPromises()
    expect(listas.adicionar).toHaveBeenCalledWith('l1', 'livro-1', expect.any(String))
  })

  it('livro oficial, web: o item do dropdown abre o mesmo dialog', async () => {
    await montarNaRota('/livros/livro-1?origem=descobrir', { largo: true })
    await flushPromises()

    document.body.querySelector<HTMLButtonElement>('button[aria-label="Mais ações"]')!.click()
    await flushPromises()
    const item = [...document.body.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
      (b) => b.textContent?.trim() === 'Adicionar à lista',
    )!
    item.click()
    await flushPromises()

    expect(document.body.querySelector('[role="menu"]')).toBeNull()
    expect(dialogoDeListas()!.textContent).toContain('Torto Arado')
    expect(listas.listarMinhas).toHaveBeenCalledWith('livro-1', 0)
  })

  it('livro pessoal do dono: Adicionar à lista na web e no menu do celular, com a faixa do modo consulta', async () => {
    await montarNaRota('/livros/pessoal/lp-1')
    await flushPromises()

    // Web: ação textual ao lado de Editar e Excluir.
    botao('Adicionar à lista')!.click()
    await flushPromises()
    let dialogo = dialogoDeListas()!
    expect(dialogo.textContent).toContain('Cartas de um sertanejo')
    expect(dialogo.textContent).toContain('Livro pessoal: quem puder ver a lista vê este livro em modo consulta')
    expect(listas.listarMinhas).toHaveBeenCalledWith('lp-1', 0)

    dialogo.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')!.click()
    await flushPromises()
    expect(dialogoDeListas()).toBeUndefined()

    // Celular: primeiro item do menu de três pontos do header.
    document.body.querySelector<HTMLButtonElement>('button[aria-label="Ações do livro"]')!.click()
    await flushPromises()
    const folha = document.body.querySelector('[role="dialog"]')!
    expect([...folha.querySelectorAll('ul button')].map((b) => b.textContent?.trim())[0]).toBe('Adicionar à lista')
    botao('Adicionar à lista', folha)!.click()
    await flushPromises()
    dialogo = dialogoDeListas()!
    expect(dialogo.textContent).toContain('Cartas de um sertanejo')
  })

  it('livro pessoal visto por terceiro: nenhuma entrada Adicionar à lista', async () => {
    acervo.obterLivroPessoal.mockResolvedValue({ ...PESSOAL_DO_DONO, modoConsulta: true, dono: { nome: 'Rafael Okamoto', avatarUrl: null } })
    await montarNaRota('/livros/pessoal/lp-1?via=lista&referenciaId=l9')
    await flushPromises()

    expect(document.body.textContent).toContain('Livro pessoal de Rafael Okamoto')
    expect(botao('Adicionar à lista')).toBeUndefined()
    expect(document.body.querySelector('button[aria-label="Ações do livro"]')).toBeNull()
    expect(listas.listarMinhas).not.toHaveBeenCalled()
  })
})
