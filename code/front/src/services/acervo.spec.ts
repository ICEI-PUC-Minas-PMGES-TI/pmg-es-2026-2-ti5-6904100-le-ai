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
      .mockResolvedValue(resposta(409, { codigo: 'LIVRO_JA_CADASTRADO', mensagem: 'Já existe.', livroId: 'livro-9' }))

    await expect(servico(fetchMock).solicitarImportacao('9788535914849', 'k')).resolves.toEqual({
      tipo: 'existente',
      livroId: 'livro-9',
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

describe('corpoDoLivroPessoal', () => {
  it('na criação, opcional ausente não vai no corpo', () => {
    expect(corpoDoLivroPessoal(dados, false)).toEqual({ titulo: dados.titulo, autor: dados.autor, paginas: 184 })
  })

  it('na edição, null explícito limpa sinopse e capa', () => {
    expect(corpoDoLivroPessoal(dados, true)).toEqual({ ...dados })
  })
})
