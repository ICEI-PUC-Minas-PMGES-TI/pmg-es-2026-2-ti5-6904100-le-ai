import { describe, expect, it, vi } from 'vitest'

import { createListasService } from './listas'

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function servico(fetchMock: typeof fetch) {
  return createListasService({
    baseUrl: 'https://social.example.com',
    fetch: fetchMock,
    getToken: () => 'jwt',
    esperasDeRetentativaMs: [0, 0],
  })
}

function chamada(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, indice = 0) {
  const [url, init] = fetchMock.mock.calls[indice]
  const cabecalhos = new Headers(init?.headers)
  return { url: String(url), metodo: init?.method ?? 'GET', corpo: init?.body, chave: cabecalhos.get('Idempotency-Key') }
}

describe('createListasService', () => {
  it('cria com a chave da intenção e o livro opcional no corpo', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(201, { id: 'l1' }))

    await servico(fetchMock).criar({ titulo: 'Sertão', descricao: null, livroId: 'b1' }, 'chave-1')

    const { url, metodo, corpo, chave } = chamada(fetchMock)
    expect(url).toBe('https://social.example.com/listas')
    expect(metodo).toBe('POST')
    expect(JSON.parse(String(corpo))).toEqual({ titulo: 'Sertão', descricao: null, livroId: 'b1' })
    expect(chave).toBe('chave-1')
  })

  it('edita só os campos enviados, com descricao nula para apagar', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, { id: 'l1' }))

    await servico(fetchMock).editar('l1', { descricao: null }, 'chave-2')

    const { url, metodo, corpo } = chamada(fetchMock)
    expect(url).toBe('https://social.example.com/listas/l1')
    expect(metodo).toBe('PATCH')
    expect(JSON.parse(String(corpo))).toEqual({ descricao: null })
  })

  it('lista os itens por cursor e limite', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, { itens: [], proximoCursor: null, temMais: false }))

    await servico(fetchMock).listarItens('l1', 'abc', 50)

    expect(chamada(fetchMock).url).toBe('https://social.example.com/listas/l1/livros?limit=50&cursor=abc')
  })

  it('move pela posição visível com PUT', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, { id: 'i1', posicao: 2 }))

    await servico(fetchMock).mover('l1', 'i1', 2, 'chave-3')

    const { url, metodo, corpo, chave } = chamada(fetchMock)
    expect(url).toBe('https://social.example.com/listas/l1/livros/i1/posicao')
    expect(metodo).toBe('PUT')
    expect(JSON.parse(String(corpo))).toEqual({ posicao: 2 })
    expect(chave).toBe('chave-3')
  })

  it('adiciona e remove livro com a chave recebida', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(resposta(200, { id: 'i1' }))
      .mockResolvedValueOnce(resposta(204))

    await servico(fetchMock).adicionar('l1', 'b1', 'k1')
    await servico(fetchMock).remover('l1', 'b1', 'k2')

    expect(chamada(fetchMock, 0)).toMatchObject({ url: 'https://social.example.com/listas/l1/livros', metodo: 'POST', chave: 'k1' })
    expect(chamada(fetchMock, 1)).toMatchObject({ url: 'https://social.example.com/listas/l1/livros/b1', metodo: 'DELETE', chave: 'k2' })
  })

  it('converte o índice de listas para Pagina<T>, com livroId só quando informado', async () => {
    const pagina = { itens: [{ id: 'l1' }], pagina: 0, tamanho: 20, totalItens: 1, totalPaginas: 1, ultima: true }
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(200, pagina))

    await expect(servico(fetchMock).listarDoPerfil('u2', 0)).resolves.toEqual({
      items: [{ id: 'l1' }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    })
    await servico(fetchMock).listarMinhas('b1', 1)
    await servico(fetchMock).listarMinhas(null, 0)

    expect(chamada(fetchMock, 0).url).toBe('https://social.example.com/perfis/u2/listas?page=0&size=20')
    expect(chamada(fetchMock, 1).url).toBe('https://social.example.com/me/listas?page=1&size=20&livroId=b1')
    expect(chamada(fetchMock, 2).url).toBe('https://social.example.com/me/listas?page=0&size=20')
  })
})
