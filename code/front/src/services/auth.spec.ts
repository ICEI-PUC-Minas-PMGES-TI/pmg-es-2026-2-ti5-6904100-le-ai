import { beforeEach, describe, expect, it, vi } from 'vitest'

import { encerrarSessao, getToken, iniciarSessao, useSession } from '../session'
import { createAuthService } from './auth'

const BASE = 'https://identidade.example.com'
const USUARIO = { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }
const SESSAO = { accessToken: 'jwt-novo', tokenType: 'Bearer', expiresIn: 900, refreshToken: 'renovacao' }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function erro(status: number, codigo: string): Response {
  return jsonResponse({ codigo, mensagem: 'falhou', correlationId: 'c1' }, status)
}

/** Lock que só executa: a serialização entre abas é testada em `renovacao.spec.ts`. */
const semLock = <T>(tarefa: () => Promise<T>) => tarefa()

function headersDa(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, chamada: number): Headers {
  return fetchMock.mock.calls[chamada]![1]!.headers as Headers
}

describe('createAuthService', () => {
  beforeEach(() => {
    localStorage.clear()
    encerrarSessao()
  })

  it('cadastrar envia a chave de quem chama e nunca o token da sessão', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(USUARIO, 201))
    const servico = createAuthService({ baseUrl: BASE, fetch: fetchMock, getToken: () => 'jwt-vencido' })

    const resultado = await servico.cadastrar(
      {
        email: 'marina.beltrao@gmail.com',
        username: 'marinableu',
        displayName: 'Marina Beltrão',
        dataNascimento: '1999-03-14',
        senha: 'senha-bem-comprida',
      },
      'chave-do-formulario',
    )

    expect(resultado).toEqual(USUARIO)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${BASE}/auth/register`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toMatchObject({ username: 'marinableu' })
    expect(headersDa(fetchMock, 0).get('Idempotency-Key')).toBe('chave-do-formulario')
    expect(headersDa(fetchMock, 0).get('Authorization')).toBeNull()
  })

  it('entrar faz login com chave e busca /me com o token recém-emitido', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    fetchMock.mockResolvedValueOnce(jsonResponse(SESSAO))
    fetchMock.mockResolvedValueOnce(jsonResponse(USUARIO))
    const servico = createAuthService({ baseUrl: BASE, fetch: fetchMock, getToken: () => null })

    const resultado = await servico.entrar({ identificador: 'marinableu', senha: 'senha-bem-comprida' })

    expect(resultado).toEqual({ sessao: SESSAO, usuario: USUARIO })
    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE}/auth/login`)
    expect(headersDa(fetchMock, 0).get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/)
    expect(fetchMock.mock.calls[1]![0]).toBe(`${BASE}/me`)
    expect(headersDa(fetchMock, 1).get('Authorization')).toBe('Bearer jwt-novo')
  })

  it('entrar propaga o erro do login sem chamar /me nem tentar renovar', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(erro(401, 'NAO_AUTENTICADO'))
    const renovarSessao = vi.fn()
    const servico = createAuthService({ baseUrl: BASE, fetch: fetchMock, renovarSessao })

    await expect(servico.entrar({ identificador: 'marinableu', senha: 'errada' })).rejects.toMatchObject({
      code: 'NAO_AUTENTICADO',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(renovarSessao).not.toHaveBeenCalled()
  })

  it('buscarUsuarioAtual renova no 401 e repete com o token novo', async () => {
    let tokenAtual = 'jwt-vencido'
    const fetchMock = vi.fn<typeof fetch>()
    fetchMock.mockResolvedValueOnce(erro(401, 'NAO_AUTENTICADO'))
    fetchMock.mockResolvedValueOnce(jsonResponse(USUARIO))
    const renovarSessao = vi.fn(async (tokenQueFalhou: string) => {
      expect(tokenQueFalhou).toBe('jwt-vencido')
      tokenAtual = 'jwt-renovado'
      return true
    })
    const servico = createAuthService({
      baseUrl: BASE,
      fetch: fetchMock,
      getToken: () => tokenAtual,
      renovarSessao,
    })

    await expect(servico.buscarUsuarioAtual()).resolves.toEqual(USUARIO)
    expect(headersDa(fetchMock, 0).get('Authorization')).toBe('Bearer jwt-vencido')
    expect(headersDa(fetchMock, 1).get('Authorization')).toBe('Bearer jwt-renovado')
  })

  it('sair revoga a renovação no servidor, sem token de acesso, e limpa a sessão', async () => {
    iniciarSessao({ accessToken: 'jwt', refreshToken: 'renovacao-da-sessao' }, USUARIO)
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
    const servico = createAuthService({ baseUrl: BASE, fetch: fetchMock, comLock: semLock })

    await servico.sair()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(`${BASE}/auth/logout`)
    expect(JSON.parse(init?.body as string)).toEqual({ refreshToken: 'renovacao-da-sessao' })
    expect(headersDa(fetchMock, 0).get('Idempotency-Key')).not.toBeNull()
    expect(headersDa(fetchMock, 0).get('Authorization')).toBeNull()
    expect(getToken()).toBeNull()
    expect(localStorage.getItem('le-ai-sessao')).toBeNull()
  })

  it('sair limpa a sessão mesmo com o servidor fora', async () => {
    iniciarSessao({ accessToken: 'jwt', refreshToken: 'renovacao' }, USUARIO)
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('rede'))
    const servico = createAuthService({
      baseUrl: BASE,
      fetch: fetchMock,
      comLock: semLock,
      esperasDeRetentativaMs: [0, 0],
    })

    await servico.sair()

    expect(useSession().autenticado.value).toBe(false)
  })

  describe('exclusão de conta (F-CONTA-2)', () => {
    const ACESSO = {
      accessToken: 'jwt-recuperacao',
      tokenType: 'Bearer',
      expiresIn: 900,
      tipo: 'recuperacao_exclusao',
      exclusaoSolicitadaEm: '2026-09-29T12:00:00Z',
      exclusaoPrevistaEm: '2026-10-29T12:00:00Z',
      username: 'marinableu',
      nomeExibicao: 'Marina Beltrão',
    }

    it('login de conta em exclusão devolve o acesso de recuperação e não chama /me', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(ACESSO))
      const servico = createAuthService({ baseUrl: BASE, fetch: fetchMock })

      const resultado = await servico.entrar({ identificador: 'marinableu', senha: 'senha-bem-comprida' })

      expect(resultado).toEqual({ recuperacao: ACESSO })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('pedir a exclusão manda DELETE /me/conta com senha, confirmação e a chave de quem chama', async () => {
      iniciarSessao({ accessToken: 'jwt-sessao', refreshToken: 'renovacao' }, USUARIO)
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ exclusaoSolicitadaEm: ACESSO.exclusaoSolicitadaEm, exclusaoPrevistaEm: ACESSO.exclusaoPrevistaEm }, 202),
      )
      const servico = createAuthService({ baseUrl: BASE, fetch: fetchMock })

      const resposta = await servico.solicitarExclusao('senha-bem-comprida', 'chave-do-pedido')

      expect(resposta.exclusaoPrevistaEm).toBe(ACESSO.exclusaoPrevistaEm)
      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe(`${BASE}/me/conta`)
      expect(init?.method).toBe('DELETE')
      expect(JSON.parse(init?.body as string)).toEqual({ senha: 'senha-bem-comprida', confirmacao: true })
      expect(headersDa(fetchMock, 0).get('Idempotency-Key')).toBe('chave-do-pedido')
      expect(headersDa(fetchMock, 0).get('Authorization')).toBe('Bearer jwt-sessao')
    })

    it('cancelar usa o acesso de recuperação, nunca o token da sessão', async () => {
      iniciarSessao({ accessToken: 'jwt-sessao', refreshToken: 'renovacao' }, USUARIO)
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
      const servico = createAuthService({ baseUrl: BASE, fetch: fetchMock })

      await servico.cancelarExclusao('jwt-recuperacao', 'chave-do-cancelamento')

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe(`${BASE}/me/conta/cancelar-exclusao`)
      expect(init?.method).toBe('POST')
      expect(headersDa(fetchMock, 0).get('Authorization')).toBe('Bearer jwt-recuperacao')
      expect(headersDa(fetchMock, 0).get('Idempotency-Key')).toBe('chave-do-cancelamento')
    })

    it('acesso de recuperação vencido chega como 401, sem tentar renovar', async () => {
      const renovarSessao = vi.fn()
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(erro(401, 'NAO_AUTENTICADO'))
      const servico = createAuthService({ baseUrl: BASE, fetch: fetchMock, renovarSessao })

      await expect(servico.cancelarExclusao('jwt-vencido', 'chave')).rejects.toMatchObject({ status: 401 })
      expect(renovarSessao).not.toHaveBeenCalled()
    })
  })
})
