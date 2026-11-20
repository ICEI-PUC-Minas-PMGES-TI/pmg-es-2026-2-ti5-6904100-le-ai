import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './api'
import { aquecerLeitura, createModeracaoService } from './moderacao'

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function servico(fetchMock: typeof fetch) {
  return createModeracaoService({
    baseUrl: 'https://social.example.com',
    fetch: fetchMock,
    getToken: () => 'jwt',
    esperasDeRetentativaMs: [0, 0],
  })
}

const PAGINA = { itens: [], proximoCursor: null, temMais: false }
const RESULTADO = { denunciasFechadas: ['d1', 'd2'] }
const CONTA = { usuarioId: 'u 1', suspensa: true, suspensaEm: '2026-11-05T12:00:00Z', reativadaEm: null }

describe('createModeracaoService (F-MOD, F-MOD-OPC)', () => {
  it('lista as denúncias pendentes com o token e o cursor codificado só quando há', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(200, PAGINA))
    const moderacao = servico(fetchMock)

    await expect(moderacao.listarDenuncias()).resolves.toEqual(PAGINA)
    await moderacao.listarDenuncias('c/1 2')

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://social.example.com/admin/denuncias',
      'https://social.example.com/admin/denuncias?cursor=c%2F1%202',
    ])
    expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).get('Authorization')).toBe('Bearer jwt')
  })

  it('a leitura da fila retenta o 503, como todo GET', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(resposta(503, { codigo: 'SERVICO_INDISPONIVEL', mensagem: 'x' }))
      .mockResolvedValueOnce(resposta(200, PAGINA))

    await expect(servico(fetchMock).listarDenuncias()).resolves.toEqual(PAGINA)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('arquivar e remover vão por POST com a chave e devolvem as denúncias fechadas', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(200, RESULTADO))
    const moderacao = servico(fetchMock)

    await expect(moderacao.arquivar('d 1', 'chave-a')).resolves.toEqual(RESULTADO)
    await expect(moderacao.remover('d 1', 'chave-r')).resolves.toEqual(RESULTADO)

    const chamadas = fetchMock.mock.calls
    expect(chamadas.map(([url, init]) => [init?.method, url])).toEqual([
      ['POST', 'https://social.example.com/admin/denuncias/d%201/arquivar'],
      ['POST', 'https://social.example.com/admin/denuncias/d%201/remover'],
    ])
    expect(chamadas.map(([, init]) => new Headers(init?.headers).get('Idempotency-Key'))).toEqual([
      'chave-a',
      'chave-r',
    ])
  })

  // A remoção já espera até um minuto pelo `leitura` no servidor; o reenvio é do administrador.
  it.each([
    ['arquivar', (m: ReturnType<typeof servico>) => m.arquivar('d1', 'chave')],
    ['remover', (m: ReturnType<typeof servico>) => m.remover('d1', 'chave')],
    ['removerFrase', (m: ReturnType<typeof servico>) => m.removerFrase('f1', 'chave')],
    ['suspenderConta', (m: ReturnType<typeof servico>) => m.suspenderConta('u1', 'Motivo.', 'chave')],
    ['reativarConta', (m: ReturnType<typeof servico>) => m.reativarConta('u1', 'Motivo.', 'chave')],
  ])('%s envia a chave e não retenta quando o serviço responde 503', async (_, chamar) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(resposta(503, { codigo: 'SERVICO_INDISPONIVEL', mensagem: 'Indisponível.' }))

    const erro = await chamar(servico(fetchMock)).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect(erro).toMatchObject({ status: 503, code: 'SERVICO_INDISPONIVEL' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).get('Idempotency-Key')).toBe('chave')
  })

  it('remover não retenta nem a falha de rede', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('rede'))

    await expect(servico(fetchMock).remover('d1', 'chave')).rejects.toMatchObject({ status: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('remover frase vai por DELETE com a chave e aceita 204 sem corpo', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))

    await expect(servico(fetchMock).removerFrase('f 1', 'chave-f')).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://social.example.com/admin/frases/f%201')
    expect(init?.method).toBe('DELETE')
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('chave-f')
  })

  it('consulta a conta pelo username codificado, por GET e sem chave', async () => {
    const conta = {
      id: 'u1', username: 'ana b', nomeExibicao: 'Ana', avatarUrl: null,
      privacidade: 'publico', suspensa: true, suspensaEm: '2026-11-05T12:00:00Z', motivo: 'Spam.',
    }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, conta))

    await expect(servico(fetchMock).contaPorUsername('ana b')).resolves.toEqual(conta)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://social.example.com/admin/usuarios?username=ana%20b')
    expect(init?.method ?? 'GET').toBe('GET')
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBeNull()
  })

  it('suspender e reativar levam o motivo no corpo e a chave', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(200, CONTA))
    const moderacao = servico(fetchMock)

    await expect(moderacao.suspenderConta('u 1', 'Ataques repetidos.', 'chave-s')).resolves.toEqual(CONTA)
    await moderacao.reativarConta('u 1', 'Revisto.', 'chave-r')

    const chamadas = fetchMock.mock.calls
    expect(chamadas.map(([url, init]) => [init?.method, url])).toEqual([
      ['POST', 'https://social.example.com/admin/usuarios/u%201/suspender'],
      ['POST', 'https://social.example.com/admin/usuarios/u%201/reativar'],
    ])
    expect(chamadas.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
      { motivo: 'Ataques repetidos.' },
      { motivo: 'Revisto.' },
    ])
    expect(chamadas.map(([, init]) => new Headers(init?.headers).get('Idempotency-Key'))).toEqual([
      'chave-s',
      'chave-r',
    ])
  })

  it('lista o registro de moderação com o cursor', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => resposta(200, PAGINA))
    const moderacao = servico(fetchMock)

    await moderacao.listarRegistros()
    await moderacao.listarRegistros('c2')

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://social.example.com/admin/moderacao/logs',
      'https://social.example.com/admin/moderacao/logs?cursor=c2',
    ])
  })

  it('403 de quem não é administrador chega como ApiError', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(resposta(403, { codigo: 'ACESSO_NEGADO', mensagem: 'Só administradores.' }))

    await expect(servico(fetchMock).listarDenuncias()).rejects.toMatchObject({ status: 403, code: 'ACESSO_NEGADO' })
  })
})

describe('aquecerLeitura', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('chama o health do leitura', () => {
    vi.stubEnv('VITE_LEITURA_BASE_URL', 'https://leitura.example.com')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))

    aquecerLeitura(fetcher)

    expect(fetcher).toHaveBeenCalledWith('https://leitura.example.com/health')
  })

  it('aquecer o leitura ignora a falha', async () => {
    vi.stubEnv('VITE_LEITURA_BASE_URL', 'https://leitura.example.com')
    const falha = Promise.reject(new TypeError('rede'))
    // `catch(fn)` chama `then(undefined, fn)` na própria promessa: o espião vê o tratamento.
    const then = vi.spyOn(falha, 'then')
    const fetcher = vi.fn<typeof fetch>().mockReturnValue(falha as Promise<Response>)

    expect(() => aquecerLeitura(fetcher)).not.toThrow()

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(then).toHaveBeenCalledWith(undefined, expect.any(Function))
    await falha.catch(() => undefined)
  })

  it('sem a URL do leitura, não chama nada', () => {
    vi.stubEnv('VITE_LEITURA_BASE_URL', '')
    const fetcher = vi.fn<typeof fetch>()

    aquecerLeitura(fetcher)

    expect(fetcher).not.toHaveBeenCalled()
  })
})
