import { describe, expect, it, vi } from 'vitest'

import { ApiError } from './api'
import { corpoDoLivroPessoal, createAcervoService } from './acervo'

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function servico(fetchMock: typeof fetch) {
  return createAcervoService({
    baseUrl: 'https://acervo.example.com',
    fetch: fetchMock,
    getToken: () => 'jwt',
    esperasDeRetentativaMs: [0, 0],
  })
}

const RESUMO = {
  id: 'livro-9',
  titulo: '1984',
  autores: 'George Orwell',
  editora: 'Companhia das Letras',
  anoPublicacao: 2009,
  paginas: 416,
  capaUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
}

const dados = { titulo: 'Cartas de um sertanejo', autor: 'Marina Albuquerque', paginas: 184, sinopse: null, capaUrl: null }

describe('createAcervoService', () => {
  it('solicita a importação só com o ISBN, com a chave da intenção e o token', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(202, { importacaoId: 'imp-1', status: 'pendente' }))

    await expect(servico(fetchMock).solicitarImportacao('9788535914849', 'chave-1')).resolves.toEqual({
      tipo: 'aceita',
      importacaoId: 'imp-1',
    })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://acervo.example.com/livros/oficial')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ isbn: '9788535914849' })
    const headers = init?.headers as Headers
    expect(headers.get('Idempotency-Key')).toBe('chave-1')
    expect(headers.get('Authorization')).toBe('Bearer jwt')
  })

  it('409 com livroId vira resultado, não exceção (RF-ACV-07)', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        resposta(409, { codigo: 'LIVRO_JA_CADASTRADO', mensagem: 'Já existe.', livroId: 'livro-9', livro: RESUMO }),
      )

    await expect(servico(fetchMock).solicitarImportacao('9788535914849', 'k')).resolves.toEqual({
      tipo: 'existente',
      livroId: 'livro-9',
      livro: RESUMO,
    })
  })

  it('409 sem livroId (chave reutilizada com outro corpo) continua exceção', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(resposta(409, { codigo: 'CHAVE_IDEMPOTENCIA_CONFLITANTE', mensagem: 'Chave já usada.' }))

    await expect(servico(fetchMock).solicitarImportacao('9788535914849', 'k')).rejects.toBeInstanceOf(ApiError)
  })

  it('terceiro abre o livro pessoal com via e referência; o dono, sem nada', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(200, { id: 'l1' }))
    const acervo = servico(fetchMock)

    await acervo.obterLivroPessoal('l1', { via: 'feed', referenciaId: 'atv-1' })
    await acervo.obterLivroPessoal('l1')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://acervo.example.com/livros/pessoal/l1?via=feed&referenciaId=atv-1')
    expect(fetchMock.mock.calls[1]![0]).toBe('https://acervo.example.com/livros/pessoal/l1')
  })

  it('exclui com chave e aceita 204 sem corpo', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))

    await expect(servico(fetchMock).excluirLivroPessoal('l1', 'chave-x')).resolves.toBeUndefined()
    const init = fetchMock.mock.calls[0]![1]!
    expect(init.method).toBe('DELETE')
    expect((init.headers as Headers).get('Idempotency-Key')).toBe('chave-x')
  })

  it('reprocessa sem corpo, com chave própria', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(202, { importacaoId: 'imp-1', status: 'pendente' }))

    await servico(fetchMock).reprocessarImportacao('imp-1', 'chave-r')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://acervo.example.com/livros/importacoes/imp-1/reprocessar')
    expect(init?.body).toBeUndefined()
  })
})

describe('busca do acervo', () => {
  it('busca com q, assunto, página e o limite do contrato', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      resposta(200, { itens: [], page: 2, limit: 20, totalItens: 0, totalPaginas: 0 }),
    )

    await servico(fetchMock).buscarLivros({ q: 'conceição evaristo', assunto: 'romance', page: 2 })

    const url = new URL(fetchMock.mock.calls[0]![0] as string)
    expect(url.pathname).toBe('/livros')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'conceição evaristo',
      assunto: 'romance',
      page: '2',
      limit: '20',
    })
  })

  it('omite q e assunto ausentes e começa pela página 1', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      resposta(200, { itens: [], page: 1, limit: 20, totalItens: 0, totalPaginas: 0 }),
    )

    await servico(fetchMock).buscarLivros({ q: null, assunto: 'terror' })

    const url = new URL(fetchMock.mock.calls[0]![0] as string)
    expect(Object.fromEntries(url.searchParams)).toEqual({ assunto: 'terror', page: '1', limit: '20' })
  })

  it('lista os assuntos de dentro de itens, e corpo sem itens vira lista vazia', async () => {
    const assuntos = [{ id: 'romance', nome: 'Romance' }]
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(resposta(200, { itens: assuntos }))
      .mockResolvedValueOnce(resposta(200, {}))

    await expect(servico(fetchMock).listarAssuntos()).resolves.toEqual(assuntos)
    await expect(servico(fetchMock).listarAssuntos()).resolves.toEqual([])
    expect(fetchMock.mock.calls[0]![0]).toBe('https://acervo.example.com/assuntos')
  })

  it('503 é retentado e, persistindo, chega como ApiError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(503, { codigo: 'SERVICO_INDISPONIVEL' }))

    await expect(servico(fetchMock).buscarLivros({ q: 'poncia' })).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

describe('filtros e páginas de catálogo (F-ACV-DESCOBERTA)', () => {
  const PAGINA_VAZIA = { itens: [], page: 1, limit: 20, totalItens: 0, totalPaginas: 0 }

  it('manda os filtros preenchidos na URL da busca e omite os vazios', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, PAGINA_VAZIA))

    await servico(fetchMock).buscarLivros({
      q: null,
      autor: 'evaristo',
      editora: '',
      serie: null,
      ano: 2003,
      paginasMin: 100,
      paginasMax: 150,
    })

    const url = new URL(fetchMock.mock.calls[0]![0] as string)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      autor: 'evaristo',
      ano: '2003',
      paginasMin: '100',
      paginasMax: '150',
      page: '1',
      limit: '20',
    })
  })

  it.each([
    ['obterAutor', '/autores/autor%201'],
    ['obterEditora', '/editoras/autor%201'],
    ['obterSerie', '/series/autor%201'],
  ] as const)('%s pede a página pelo id, com página e limite', async (metodo, caminho) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, { id: 'x', nome: 'X', livros: PAGINA_VAZIA }))

    await servico(fetchMock)[metodo]('autor 1', 3)

    const url = new URL(fetchMock.mock.calls[0]![0] as string)
    expect(url.pathname).toBe(caminho)
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: '3', limit: '20' })
  })

  it('404 da página de catálogo chega como ApiError', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      resposta(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Não encontramos este autor.', correlationId: 'c' }),
    )

    await expect(servico(fetchMock).obterAutor('a1')).rejects.toMatchObject({ status: 404 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('página do livro oficial', () => {
  it('pede a página pelo id', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, { id: 'livro-1' }))

    await servico(fetchMock).obterLivroOficial('livro-1')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://acervo.example.com/livros/livro-1')
  })

  it('pede as resenhas seguintes pelo cursor, e a primeira página sem ele', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => resposta(200, { itens: [], limit: 20, proximoCursor: null }))

    await servico(fetchMock).listarResenhasDoLivro('livro-1', 'abc=')
    await servico(fetchMock).listarResenhasDoLivro('livro-1')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://acervo.example.com/livros/livro-1/resenhas?cursor=abc%3D')
    expect(fetchMock.mock.calls[1]![0]).toBe('https://acervo.example.com/livros/livro-1/resenhas')
  })
})

describe('corpoDoLivroPessoal', () => {
  it('na criação, opcional ausente não vai no corpo', () => {
    expect(corpoDoLivroPessoal(dados, false)).toEqual({ titulo: dados.titulo, autor: dados.autor, paginas: 184 })
  })

  it('na edição, null explícito limpa sinopse e capa', () => {
    expect(corpoDoLivroPessoal(dados, true)).toEqual({ ...dados })
  })
})
