import { describe, expect, it, vi } from 'vitest'

import { ApiError } from './api'
import { createPerfilService, type EditarPerfil } from './perfil'

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function servico(fetchMock: typeof fetch) {
  return createPerfilService({
    baseUrl: 'https://identidade.example.com',
    fetch: fetchMock,
    getToken: () => 'jwt',
    esperasDeRetentativaMs: [0, 0],
  })
}

const PERFIL = {
  id: 'u1',
  username: 'marinableu',
  displayName: 'Marina Beltrão',
  avatarUrl: null,
  privacidade: 'publico',
  conteudoRestrito: false,
  relacao: 'proprio',
  biografia: null,
  contadores: { seguidores: 84, seguidos: 97 },
}

describe('createPerfilService', () => {
  it('lê o próprio perfil com o token da sessão', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, PERFIL))

    await expect(servico(fetchMock).obterMeuPerfil()).resolves.toEqual(PERFIL)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://identidade.example.com/me/perfil')
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer jwt')
  })

  it('substitui o perfil por PUT com os quatro campos e a chave da intenção', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(resposta(200, PERFIL))
    const dados: EditarPerfil = {
      displayName: 'Marina Beltrão',
      biografia: null,
      avatar: { url: 'https://res.cloudinary.com/leai/image/upload/v1/avatares/a.png', publicId: 'avatares/a' },
      privacidade: 'privado',
    }

    await servico(fetchMock).atualizarMeuPerfil(dados, 'chave-1')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://identidade.example.com/me/perfil')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(init?.body as string)).toEqual(dados)
    expect((init?.headers as Headers).get('Idempotency-Key')).toBe('chave-1')
  })

  it('avatar recusado chega como ApiError 422 com a mensagem do servidor', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      resposta(422, { codigo: 'REGRA_DE_NEGOCIO', mensagem: 'Não foi possível usar essa imagem.', correlationId: 'c' }),
    )

    const erro = await servico(fetchMock)
      .atualizarMeuPerfil({ displayName: 'M', biografia: null, avatar: null, privacidade: 'publico' }, 'k')
      .catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as ApiError).status).toBe(422)
    expect((erro as ApiError).message).toBe('Não foi possível usar essa imagem.')
  })
})
