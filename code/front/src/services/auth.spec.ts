import { describe, expect, it, vi } from 'vitest'

import { createAuthService } from './auth'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('createAuthService', () => {
  it('cadastrar envia POST /auth/register com o corpo e devolve o usuário criado', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }, 201),
    )
    const servico = createAuthService({ baseUrl: 'https://identidade.example.com', fetch: fetchMock })

    const resultado = await servico.cadastrar({
      email: 'marina.beltrao@gmail.com',
      username: 'marinableu',
      displayName: 'Marina Beltrão',
      dataNascimento: '1999-03-14',
      senha: 'senha-bem-comprida',
    })

    expect(resultado).toEqual({ id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://identidade.example.com/auth/register')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toMatchObject({ username: 'marinableu' })
  })

  it('entrar faz login e busca /me com o token recém-emitido, sem depender da sessão global', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ accessToken: 'jwt-novo', tokenType: 'Bearer', expiresIn: 900 }),
    )
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }),
    )
    // getToken da sessão fica vazio de propósito: a busca de /me não pode depender dele.
    const servico = createAuthService({
      baseUrl: 'https://identidade.example.com',
      fetch: fetchMock,
      getToken: () => null,
    })

    const resultado = await servico.entrar({ identificador: 'marinableu', senha: 'senha-bem-comprida' })

    expect(resultado).toEqual({
      token: { accessToken: 'jwt-novo', tokenType: 'Bearer', expiresIn: 900 },
      usuario: { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' },
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [loginUrl, loginInit] = fetchMock.mock.calls[0]!
    expect(loginUrl).toBe('https://identidade.example.com/auth/login')
    expect(loginInit?.method).toBe('POST')

    const [meUrl, meInit] = fetchMock.mock.calls[1]!
    expect(meUrl).toBe('https://identidade.example.com/me')
    const meHeaders = meInit?.headers as Headers
    expect(meHeaders.get('Authorization')).toBe('Bearer jwt-novo')
  })

  it('entrar propaga o erro do login sem chamar /me', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(
        {
          codigo: 'NAO_AUTENTICADO',
          mensagem: 'E-mail, nome de usuário ou senha incorretos.',
          correlationId: 'c1',
        },
        401,
      ),
    )
    const servico = createAuthService({ baseUrl: 'https://identidade.example.com', fetch: fetchMock })

    await expect(
      servico.entrar({ identificador: 'marinableu', senha: 'errada' }),
    ).rejects.toMatchObject({ code: 'NAO_AUTENTICADO' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('buscarUsuarioAtual usa o getToken configurado, sem token explícito', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }),
    )
    const servico = createAuthService({
      baseUrl: 'https://identidade.example.com',
      fetch: fetchMock,
      getToken: () => 'token-da-sessao',
    })

    await servico.buscarUsuarioAtual()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://identidade.example.com/me')
    const headers = init?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer token-da-sessao')
  })
})
