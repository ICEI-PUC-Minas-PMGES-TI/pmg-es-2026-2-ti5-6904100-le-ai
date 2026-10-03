import { describe, expect, it, vi } from 'vitest'

import { createSocialService, type Comentario } from './social'

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function servico(fetchMock: typeof fetch) {
  return createSocialService({
    baseUrl: 'https://social.example.com',
    fetch: fetchMock,
    getToken: () => 'jwt',
    esperasDeRetentativaMs: [0, 0],
  })
}

const AUTOR = { id: 'u1', username: 'marinableu', nomeExibicao: 'Marina Beltrão', avatarUrl: null }

const ATIVIDADE = {
  id: 'a1',
  tipo: 'LEITURA_INICIADA',
  autor: AUTOR,
  livro: { id: 'l1', tipo: 'OFICIAL', titulo: 'Torto arado', autor: 'Itamar Vieira Junior', capaUrl: null },
  resenha: null,
  criadoEm: '2026-09-25T00:00:00Z',
  totalCurtidas: 0,
  totalComentarios: 0,
  curtidaPeloSolicitante: false,
}

const COMENTARIO: Comentario = {
  id: 'c1',
  atividadeId: 'a1',
  comentarioRaizId: null,
  comentarioRespondidoId: null,
  usuarioRespondido: null,
  autor: AUTOR,
  texto: 'Ótimo livro!',
  mencoes: [],
  nivel: 'RAIZ',
  pertenceAoSolicitante: true,
  editado: false,
  criadoEm: '2026-09-25T00:00:00Z',
  atualizadoEm: null,
}

describe('createSocialService', () => {
  it('lista o feed e converte a página pt-BR para o formato de Pagina<T>', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      resposta(200, { itens: [ATIVIDADE], pagina: 2, tamanho: 20, totalItens: 41, totalPaginas: 3, ultima: false }),
    )

    await expect(servico(fetchMock).listarFeed(2)).resolves.toEqual({
      items: [ATIVIDADE],
      page: 2,
      size: 20,
      totalElements: 41,
      totalPages: 3,
    })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://social.example.com/feed?page=2&size=20')
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer jwt')
  })

  it('lista comentários-raiz e converte a página pt-BR para o formato de Pagina<T>', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      resposta(200, { itens: [COMENTARIO], pagina: 0, tamanho: 20, totalItens: 1, totalPaginas: 1, ultima: true }),
    )

    await expect(servico(fetchMock).listarComentariosRaiz('a1', 0)).resolves.toEqual({
      items: [COMENTARIO],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    })

    expect(fetchMock.mock.calls[0]![0]).toBe('https://social.example.com/atividades/a1/comentarios?page=0&size=20')
  })

  it('obtém a atividade pelo id', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, ATIVIDADE))

    await expect(servico(fetchMock).obterAtividade('a1')).resolves.toEqual(ATIVIDADE)

    expect(fetchMock.mock.calls[0]![0]).toBe('https://social.example.com/atividades/a1')
  })

  it('curtir envia POST com a chave de idempotência recebida', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(resposta(201, { atividadeId: 'a1', curtida: true, totalCurtidas: 5 }))

    await expect(servico(fetchMock).curtir('a1', 'chave-1')).resolves.toEqual({
      atividadeId: 'a1',
      curtida: true,
      totalCurtidas: 5,
    })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://social.example.com/atividades/a1/curtir')
    expect(init?.method).toBe('POST')
    expect((init?.headers as Headers).get('Idempotency-Key')).toBe('chave-1')
  })

  it('descurtir envia DELETE com a chave de idempotência recebida', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(204))

    await servico(fetchMock).descurtir('a1', 'chave-2')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://social.example.com/atividades/a1/curtir')
    expect(init?.method).toBe('DELETE')
    expect((init?.headers as Headers).get('Idempotency-Key')).toBe('chave-2')
  })

  it('comentar envia POST com o corpo e a chave de idempotência recebida', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(201, COMENTARIO))
    const dados = { texto: 'Ótimo livro!', comentarioRespondidoId: 'c0' }

    await expect(servico(fetchMock).comentar('a1', dados, 'chave-3')).resolves.toEqual(COMENTARIO)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://social.example.com/atividades/a1/comentarios')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual(dados)
    expect((init?.headers as Headers).get('Idempotency-Key')).toBe('chave-3')
  })

  it('lista respostas sem remapear o formato (itens/proximoCursor/temMais nativos)', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(resposta(200, { itens: [COMENTARIO], proximoCursor: 'cursor-2', temMais: true }))

    await expect(servico(fetchMock).listarRespostas('c-raiz', 'cursor-1', 10)).resolves.toEqual({
      itens: [COMENTARIO],
      proximoCursor: 'cursor-2',
      temMais: true,
    })

    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://social.example.com/comentarios/c-raiz/respostas?limit=10&cursor=cursor-1',
    )
  })

  it('lista respostas sem cursor na primeira consulta', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, { itens: [], temMais: false }))

    await servico(fetchMock).listarRespostas('c-raiz')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://social.example.com/comentarios/c-raiz/respostas?limit=20')
  })
})
