import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, createApiClient, erroDoCliente } from './api'

afterEach(() => {
  vi.useRealTimers()
})

describe('createApiClient', () => {
  it('usa a base URL e envia o correlation-id', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const request = createApiClient({
      baseUrl: 'https://api.example.com/',
      fetch: fetchMock,
      createCorrelationId: () => 'correlation-id-fixo',
    })

    await expect(request('/health')).resolves.toEqual({ status: 'ok' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/health',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    )
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('X-Correlation-Id')).toBe('correlation-id-fixo')
  })

  it('preserva o erro padronizado retornado pela API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          codigo: 'RECURSO_NAO_ENCONTRADO',
          mensagem: 'Não encontramos o que você procura.',
          correlationId: 'erro-123',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const request = createApiClient({ baseUrl: 'https://api.example.com', fetch: fetchMock })

    await expect(request('/livros/1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      code: 'RECURSO_NAO_ENCONTRADO',
      correlationId: 'erro-123',
    })
  })

  it('mantém a primeira requisição pendente durante o cold start', async () => {
    vi.useFakeTimers()
    let respond: ((response: Response) => void) | undefined
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve
        }),
    )
    const request = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchMock,
      timeoutMs: 90_000,
    })
    const result = request<{ status: string }>('/health')
    const settled = vi.fn()
    void result.then(settled, settled)

    await vi.advanceTimersByTimeAsync(60_000)
    expect(settled).not.toHaveBeenCalled()

    respond?.(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
    await expect(result).resolves.toEqual({ status: 'ok' })
  })

  it('injeta Authorization quando getToken devolve um token', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }))
    const request = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchMock,
      getToken: () => 'token-fixo',
    })

    await request('/me')

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer token-fixo')
  })

  it('não envia Authorization quando getToken devolve null', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }))
    const request = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchMock,
      getToken: () => null,
    })

    await request('/health')

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.has('Authorization')).toBe(false)
  })

  it('preserva um Authorization explícito da chamada em vez do getToken da sessão', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }))
    const request = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchMock,
      getToken: () => 'token-da-sessao',
    })

    await request('/me', { headers: { Authorization: 'Bearer token-explicito' } })

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer token-explicito')
  })

  it('retorna erro acionável quando o tempo limite é excedido', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const request = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: fetchMock,
      timeoutMs: 1_000,
    })
    const result = request('/health')
    const assertion = expect(result).rejects.toEqual(
      expect.objectContaining({
        message: 'O servidor demorou para responder. Tente novamente.',
        code: 'TEMPO_LIMITE_EXCEDIDO',
      }),
    )

    await vi.advanceTimersByTimeAsync(1_000)
    await assertion
  })

  it('devolve undefined em 204, sem ler corpo', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
    const request = createApiClient({ baseUrl: 'https://api.example.com', fetch: fetchMock })

    await expect(request('/livros/pessoal/1', { method: 'DELETE', idempotencyKey: 'k' })).resolves.toBeUndefined()
  })
})

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createApiClient: idempotência e retentativa (RNF-ERR-03/04)', () => {
  function cliente(fetchMock: typeof fetch) {
    let n = 0
    return createApiClient({
      baseUrl: 'https://acervo.example.com',
      fetch: fetchMock,
      esperasDeRetentativaMs: [0, 0],
      createCorrelationId: () => `correlation-${++n}`,
    })
  }

  it('só envia Idempotency-Key quando a chamada pede, e serializa o corpo JSON', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(202, { importacaoId: 'i1' }))
    const request = cliente(fetchMock)

    await request('/livros/oficial', { method: 'POST', json: { isbn: '9788535914849' }, idempotencyKey: 'chave-1' })
    await request('/me')

    const primeira = fetchMock.mock.calls[0]![1]!
    expect((primeira.headers as Headers).get('Idempotency-Key')).toBe('chave-1')
    expect((primeira.headers as Headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(primeira.body as string)).toEqual({ isbn: '9788535914849' })
    expect((fetchMock.mock.calls[1]![1]!.headers as Headers).has('Idempotency-Key')).toBe(false)
  })

  it('escrita com chave: repete em 503 com a mesma chave e o mesmo correlation-id', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(resposta(503, { codigo: 'SERVICO_INDISPONIVEL', mensagem: 'x' }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(resposta(201, { id: 'l1' }))
    const request = cliente(fetchMock)

    await expect(
      request('/livros/pessoal', { method: 'POST', json: { titulo: 't' }, idempotencyKey: 'chave-1' }),
    ).resolves.toEqual({ id: 'l1' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const headers = fetchMock.mock.calls.map((chamada) => chamada[1]!.headers as Headers)
    expect(new Set(headers.map((h) => h.get('Idempotency-Key')))).toEqual(new Set(['chave-1']))
    expect(new Set(headers.map((h) => h.get('X-Correlation-Id')))).toEqual(new Set(['correlation-1']))
  })

  it('GET repete em falha de rede e desiste depois de três tentativas', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    const request = cliente(fetchMock)

    await expect(request('/livros/importacoes/1')).rejects.toMatchObject({ code: 'SERVICO_INDISPONIVEL', status: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.each([
    ['POST sem chave em 503', { method: 'POST', json: {} }, resposta(503, {})],
    ['GET em 500', {}, resposta(500, { codigo: 'ERRO_INTERNO', mensagem: 'x' })],
    ['GET em 404', {}, resposta(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'x' })],
    ['POST com chave em 429', { method: 'POST', idempotencyKey: 'k' }, resposta(429, { codigo: 'MUITAS_REQUISICOES', mensagem: 'x' })],
  ])('não repete: %s', async (_nome, opcoes, primeira) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(primeira)
    const request = cliente(fetchMock)

    await expect(request('/x', opcoes)).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('não repete o timeout: cold start é espera, não falha de rede', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const request = createApiClient({ baseUrl: 'https://x', fetch: fetchMock, timeoutMs: 1_000, esperasDeRetentativaMs: [0, 0] })
    const assertion = expect(request('/x')).rejects.toMatchObject({ code: 'TEMPO_LIMITE_EXCEDIDO' })

    await vi.advanceTimersByTimeAsync(1_000)
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('409 traz livroId e 400 traz campos por nome', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        resposta(409, { codigo: 'LIVRO_JA_CADASTRADO', mensagem: 'Já existe.', correlationId: 'c1', livroId: 'livro-1' }),
      )
      .mockResolvedValueOnce(
        resposta(400, {
          codigo: 'REQUISICAO_INVALIDA',
          mensagem: 'Dados inválidos.',
          campos: [
            { campo: 'titulo', mensagem: 'Informe o título do livro.' },
            { campo: 'capaUrl', mensagem: 'URL de capa não aceita.' },
          ],
        }),
      )
    const request = cliente(fetchMock)

    await expect(request('/livros/oficial', { method: 'POST', idempotencyKey: 'k' })).rejects.toMatchObject({
      status: 409,
      livroId: 'livro-1',
      correlationId: 'c1',
    })
    await expect(request('/livros/pessoal', { method: 'POST', idempotencyKey: 'k2' })).rejects.toMatchObject({
      status: 400,
      campos: { titulo: 'Informe o título do livro.', capaUrl: 'URL de capa não aceita.' },
    })
  })

  describe('renovação no 401', () => {
    const naoAutenticado = () =>
      new Response(JSON.stringify({ codigo: 'NAO_AUTENTICADO', mensagem: 'Sessão expirada.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })

    it('não renova quando o Authorization veio de quem chamou', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(naoAutenticado())
      const renovarSessao = vi.fn()
      const request = createApiClient({ fetch: fetchMock, getToken: () => 'da-sessao', renovarSessao })

      await expect(request('/me', { headers: { Authorization: 'Bearer explicito' } })).rejects.toMatchObject({
        status: 401,
      })
      expect(renovarSessao).not.toHaveBeenCalled()
    })

    it('renovação recusada devolve o 401 original sem repetir', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(naoAutenticado())
      const renovarSessao = vi.fn().mockResolvedValue(false)
      const request = createApiClient({ fetch: fetchMock, getToken: () => 'vencido', renovarSessao })

      await expect(request('/me')).rejects.toMatchObject({ status: 401 })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('repete uma vez só: 401 depois de renovar volta como erro', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => naoAutenticado())
      const renovarSessao = vi.fn().mockResolvedValue(true)
      const request = createApiClient({ fetch: fetchMock, getToken: () => 'sempre-recusado', renovarSessao })

      await expect(request('/me')).rejects.toMatchObject({ status: 401 })
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(renovarSessao).toHaveBeenCalledTimes(1)
    })
  })
})

describe('erroDoCliente', () => {
  it.each([
    [399, false],
    [400, true],
    [409, true],
    [422, true],
    [499, true],
    [500, false],
    [503, false],
  ])('status %i é erro do cliente: %s', (status, esperado) => {
    expect(erroDoCliente(new ApiError('falha', status, 'X'))).toBe(esperado)
  })
})
