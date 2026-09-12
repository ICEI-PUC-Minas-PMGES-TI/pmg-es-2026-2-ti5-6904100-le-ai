import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApiClient } from './api'

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
})
