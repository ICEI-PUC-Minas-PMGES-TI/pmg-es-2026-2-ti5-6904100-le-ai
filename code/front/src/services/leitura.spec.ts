import { describe, expect, it, vi } from 'vitest'

import { createLeituraService } from './leitura'

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function servico(fetchMock: typeof fetch) {
  return createLeituraService({
    baseUrl: 'https://leitura.example.com',
    fetch: fetchMock,
    getToken: () => 'jwt',
    esperasDeRetentativaMs: [0, 0],
  })
}

const NOTA = { livroId: 'l1', valor: 4.5, criadoEm: '2026-09-12T12:00:00Z', atualizadoEm: '2026-09-12T12:00:00Z' }

describe('createLeituraService', () => {
  it('consulta minha-avaliacao do livro com o token', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, { livroId: 'l1', nota: null, resenha: null }))

    await expect(servico(fetchMock).obterMinhaAvaliacao('l1')).resolves.toEqual({
      livroId: 'l1',
      nota: null,
      resenha: null,
    })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/livros/l1/minha-avaliacao')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer jwt')
  })

  it('salva a nota com PUT, só o valor no corpo e a chave da intenção', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, NOTA))

    await expect(servico(fetchMock).salvarNota('l1', 4.5, 'chave-1')).resolves.toEqual(NOTA)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/livros/l1/nota')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({ valor: 4.5 })
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('chave-1')
  })

  // Com chave, a escrita é idempotente e o cliente pode retentar o 503 sem duplicar a nota.
  it('retenta o PUT com a mesma chave quando o serviço responde 503', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(resposta(503, { codigo: 'SERVICO_INDISPONIVEL', mensagem: 'x' }))
      .mockResolvedValueOnce(resposta(200, NOTA))

    await servico(fetchMock).salvarNota('l1', 4.5, 'chave-1')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const chaves = fetchMock.mock.calls.map(([, init]) => new Headers(init?.headers).get('Idempotency-Key'))
    expect(chaves).toEqual(['chave-1', 'chave-1'])
  })

  it('remove a nota com DELETE e a chave; o 204 não tem corpo', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))

    await expect(servico(fetchMock).excluirNota('l1', 'chave-2')).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/livros/l1/nota')
    expect(init?.method).toBe('DELETE')
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('chave-2')
  })

  it('lista as resenhas do perfil com page e limite', async () => {
    const pagina = { itens: [], paginacao: { page: 2, limite: 5, totalItens: 6, totalPaginas: 2 } }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, pagina))

    await expect(servico(fetchMock).listarResenhasPerfil('u2', 2, 5)).resolves.toEqual(pagina)

    const [url] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://leitura.example.com/perfis/u2/resenhas?page=2&limite=5')
  })
})
