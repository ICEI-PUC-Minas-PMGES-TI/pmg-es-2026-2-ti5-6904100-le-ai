import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService } from '../../services/acervo'
import { ApiError } from '../../services/api'
import { leituraService, type Frase, type PaginaFrases } from '../../services/leitura'
import { moderacaoService } from '../../services/moderacao'
import { livroOficial } from '../../testes/massaDoLivro'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/acervo', async (original) => ({
  ...(await original<typeof import('../../services/acervo')>()),
  acervoService: { obterLivroOficial: vi.fn(), obterLivroPessoal: vi.fn() },
}))
vi.mock('../../services/leitura', () => ({
  leituraService: { listarFrases: vi.fn(), excluirFrase: vi.fn(), criarFrase: vi.fn() },
}))
vi.mock('../../services/moderacao', () => ({
  moderacaoService: { removerFrase: vi.fn() },
}))

const acervo = vi.mocked(acervoService)
const leitura = vi.mocked(leituraService)
const moderacao = vi.mocked(moderacaoService)

function frase(id: string, pagina: number, minha = false): Frase {
  return {
    id,
    livroId: 'livro-1',
    texto: `Trecho ${id}.`,
    pagina,
    criadoEm: '2026-10-09T12:00:00Z',
    autor: { id: minha ? 'eu' : 'u2', username: minha ? 'eu' : 'marina.antunes', nome: 'Marina', avatarUrl: null },
    minha,
  }
}

function pagina(itens: Frase[], total: number, minhasFrases: number): PaginaFrases {
  return { itens, paginacao: { page: 1, limite: 20, totalItens: total, totalPaginas: 1 }, minhasFrases, limitePorLivro: 10 }
}

const texto = () => document.body.textContent ?? ''
const botao = (rotulo: string) => [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === rotulo)

describe('FrasesDoLivroView', () => {
  beforeEach(() => {
    acervo.obterLivroOficial.mockReset().mockResolvedValue(livroOficial())
    leitura.listarFrases.mockReset()
    leitura.excluirFrase.mockReset()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lista as frases com a cota; só a própria tem excluir', async () => {
    leitura.listarFrases.mockResolvedValue(pagina([frase('a', 57), frase('b', 112, true)], 2, 1))
    await montarNaRota('/livros/livro-1/frases')
    await flushPromises()

    expect(texto()).toContain('Você guardou 1 de 10 frases deste livro.')
    expect(texto()).toContain('Adicionar frase')
    expect(document.querySelectorAll('[aria-label^="Excluir frase"]')).toHaveLength(1)
    expect(document.querySelector('[aria-label="Excluir frase da página 112"]')).not.toBeNull()
  })

  it('no limite, a explicação ocupa o lugar do botão, sem ser erro', async () => {
    leitura.listarFrases.mockResolvedValue(pagina([frase('b', 112, true)], 22, 10))
    await montarNaRota('/livros/livro-1/frases')
    await flushPromises()

    expect(texto()).toContain('Você chegou ao limite de 10 frases por livro. Exclua uma das suas para guardar outra.')
    expect(botao('Adicionar frase')).toBeUndefined()
  })

  it('excluir pede confirmação mostrando a frase, tira da lista e anuncia', async () => {
    leitura.listarFrases.mockResolvedValue(pagina([frase('a', 57), frase('b', 112, true)], 14, 2))
    leitura.excluirFrase.mockResolvedValue(undefined)
    await montarNaRota('/livros/livro-1/frases')
    await flushPromises()

    document.querySelector<HTMLButtonElement>('[aria-label="Excluir frase da página 112"]')!.click()
    await flushPromises()
    const dialogo = document.querySelector('[role="dialog"]')!
    expect(dialogo.textContent).toContain('Excluir esta frase?')
    expect(dialogo.textContent).toContain('Trecho b.')
    botao('Excluir frase')!.click()
    await flushPromises()

    expect(leitura.excluirFrase).toHaveBeenCalledWith('b', expect.any(String))
    expect(document.querySelectorAll('blockquote')).toHaveLength(1)
    expect(texto()).toContain('Frase excluída. 13 frases.')
    expect(texto()).toContain('Você guardou 1 de 10 frases deste livro.')
  })

  it('falha ao excluir mantém a frase e avisa no diálogo', async () => {
    leitura.listarFrases.mockResolvedValue(pagina([frase('b', 112, true)], 1, 1))
    leitura.excluirFrase.mockRejectedValue(new ApiError('Fora.', 503, 'SERVICO_INDISPONIVEL'))
    await montarNaRota('/livros/livro-1/frases')
    await flushPromises()

    document.querySelector<HTMLButtonElement>('[aria-label="Excluir frase da página 112"]')!.click()
    await flushPromises()
    botao('Excluir frase')!.click()
    await flushPromises()

    expect(texto()).toContain('Não foi possível excluir a frase. Verifique sua conexão e tente de novo.')
    expect(document.querySelectorAll('[data-frase]')).toHaveLength(1)
  })

  describe('administrador (F-MOD)', () => {
    beforeEach(() => {
      moderacao.removerFrase.mockReset()
    })

    it('a partir de 768px: faixa, Remover frase em toda frase, sem cota nem Adicionar', async () => {
      leitura.listarFrases.mockResolvedValue(pagina([frase('a', 57), frase('b', 203)], 2, 0))
      await montarNaRota('/livros/livro-1/frases', { admin: true, largo: true })
      await flushPromises()

      expect(texto()).toContain('Você está vendo como administrador.')
      expect(document.querySelectorAll('[aria-label^="Remover frase de @marina.antunes"]')).toHaveLength(2)
      expect(document.querySelector('[aria-label^="Excluir frase"]')).toBeNull()
      expect(texto()).not.toContain('Você ainda não guardou frases')
      expect(botao('Adicionar frase')).toBeUndefined()
    })

    it('abaixo de 768px o administrador não remove, como no app', async () => {
      leitura.listarFrases.mockResolvedValue(pagina([frase('a', 57)], 1, 0))
      await montarNaRota('/livros/livro-1/frases', { admin: true })
      await flushPromises()

      expect(texto()).not.toContain('Você está vendo como administrador.')
      expect(document.querySelector('[aria-label^="Remover frase"]')).toBeNull()
    })

    it('remover confirma, só tira da lista depois do servidor e a falha fica no dialog', async () => {
      leitura.listarFrases.mockResolvedValue(pagina([frase('a', 57), frase('b', 203)], 2, 0))
      moderacao.removerFrase.mockRejectedValueOnce(new ApiError('fora', 503, 'SERVICO_INDISPONIVEL')).mockResolvedValueOnce()
      await montarNaRota('/livros/livro-1/frases', { admin: true, largo: true })
      await flushPromises()

      document.querySelector<HTMLButtonElement>('[aria-label="Remover frase de @marina.antunes, página 203"]')!.click()
      await flushPromises()
      expect(texto()).toContain('Remover esta frase?')
      expect(texto()).toContain('O trecho sai deste livro para todos os leitores')
      const confirmar = () =>
        [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent?.trim() === 'Remover frase') as HTMLButtonElement
      confirmar().click()
      await flushPromises()

      expect(texto()).toContain('Não foi possível remover a frase. Ela continua no livro.')
      expect(texto()).toContain('Trecho b.')

      confirmar().click()
      await flushPromises()

      expect(moderacao.removerFrase.mock.calls[0]).toEqual(moderacao.removerFrase.mock.calls[1])
      expect(texto()).not.toContain('Trecho b.')
      expect(texto()).toContain('Trecho a.')
    })
  })

  it('erro de carga mostra o banner e Tentar de novo', async () => {
    leitura.listarFrases
      .mockRejectedValueOnce(new ApiError('Fora.', 503, 'SERVICO_INDISPONIVEL'))
      .mockResolvedValueOnce(pagina([frase('a', 57)], 1, 0))
    await montarNaRota('/livros/livro-1/frases')
    await flushPromises()

    expect(texto()).toContain('Não foi possível carregar as frases deste livro.')
    botao('Tentar de novo')!.click()
    await flushPromises()
    expect(texto()).toContain('Página 57 · @marina.antunes')
  })
})
