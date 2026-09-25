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

  it('busca por username codificado e segue com POST e chave', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(resposta(200, []))
      .mockResolvedValueOnce(resposta(201, { estado: 'seguindo', solicitacaoId: null }))

    await expect(servico(fetchMock).buscarPorUsername('bia.nogueira')).resolves.toEqual([])
    await expect(servico(fetchMock).seguir('bia.nogueira', 'chave-2')).resolves.toEqual({
      estado: 'seguindo',
      solicitacaoId: null,
    })

    expect(fetchMock.mock.calls[0]![0]).toBe('https://identidade.example.com/perfis?username=bia.nogueira')
    const [url, init] = fetchMock.mock.calls[1]!
    expect(url).toBe('https://identidade.example.com/perfis/bia.nogueira/seguir')
    expect(init?.method).toBe('POST')
    expect((init?.headers as Headers).get('Idempotency-Key')).toBe('chave-2')
  })

  it('listas paginadas levam page e size, e decidir pedido vai pelo id', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(resposta(200, { items: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }))
      .mockResolvedValueOnce(resposta(204))
      .mockResolvedValueOnce(resposta(204))

    await servico(fetchMock).listarSeguidos(1)
    await servico(fetchMock).aceitarSolicitacao('s1', 'k1')
    await servico(fetchMock).removerSeguidor('caio', 'k2')

    expect(fetchMock.mock.calls[0]![0]).toBe('https://identidade.example.com/me/seguidos?page=1&size=20')
    expect(fetchMock.mock.calls[1]![0]).toBe('https://identidade.example.com/solicitacoes/s1/aceitar')
    expect(fetchMock.mock.calls[2]![0]).toBe('https://identidade.example.com/seguidores/caio')
    expect(fetchMock.mock.calls[2]![1]?.method).toBe('DELETE')
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
