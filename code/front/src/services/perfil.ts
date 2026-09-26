import { getToken } from '../session'
import { createApiClient, type ApiClientOptions } from './api'
import { renovarSessao } from './renovacao'

/**
 * Perfil e grafo de seguidores no serviço `identidade` (F-PERFIL, RF-SOC-01..08). Espelha os
 * schemas de `docs/api/identidade.yaml`. Toda escrita exige `Idempotency-Key`, e quem guarda a
 * chave da intenção é a tela.
 */
export type Privacidade = 'publico' | 'privado'

export type RelacaoPerfil = 'proprio' | 'nenhuma' | 'seguindo' | 'solicitacao_enviada' | 'solicitacao_recebida'

export interface Perfil {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  privacidade: Privacidade
  conteudoRestrito: boolean
  relacao: RelacaoPerfil
  biografia: string | null
  contadores: { seguidores: number; seguidos: number }
}

export interface Avatar {
  url: string
  publicId: string
}

/** Schema `PerfilResumo`: o que busca, listas e caixa de pedidos devolvem. */
export interface PerfilResumo {
  id: string
  username: string
  displayName: string
  /** Pública em qualquer privacidade (RN-08); no resumo desde 25/09/2026 para busca e listas. */
  biografia: string | null
  avatarUrl: string | null
  privacidade: Privacidade
  conteudoRestrito: boolean
  relacao: RelacaoPerfil
}

export interface Pagina<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface SolicitacaoSeguir {
  id: string
  solicitante: PerfilResumo
  criadaEm: string
}

export interface ResultadoSeguir {
  estado: 'seguindo' | 'solicitacao_pendente'
  solicitacaoId?: string | null
}

/** Substituição: os quatro campos vão sempre, e `avatar: null` remove a foto. */
export interface EditarPerfil {
  displayName: string
  biografia: string | null
  avatar: Avatar | null
  privacidade: Privacidade
}

/** Padrão do contrato; o servidor aceita até 50. */
export const TAMANHO_DA_PAGINA = 20

export function createPerfilService(options: ApiClientOptions = {}) {
  const request = createApiClient({
    ...options,
    baseUrl: options.baseUrl ?? import.meta.env.VITE_IDENTIDADE_BASE_URL,
    getToken: options.getToken ?? getToken,
    renovarSessao: options.renovarSessao ?? renovarSessao,
  })

  return {
    obterMeuPerfil(): Promise<Perfil> {
      return request<Perfil>('/me/perfil')
    },
    atualizarMeuPerfil(dados: EditarPerfil, idempotencyKey: string): Promise<Perfil> {
      return request<Perfil>('/me/perfil', { method: 'PUT', json: dados, idempotencyKey })
    },
    /** Zero ou um perfil: o servidor só compara o username inteiro (RNF-SEC-19/44). */
    buscarPorUsername(username: string): Promise<PerfilResumo[]> {
      return request<PerfilResumo[]>(`/perfis?username=${encodeURIComponent(username)}`)
    },
    obterPerfil(username: string): Promise<Perfil> {
      return request<Perfil>(`/perfis/${encodeURIComponent(username)}`)
    },
    seguir(username: string, idempotencyKey: string): Promise<ResultadoSeguir> {
      return request<ResultadoSeguir>(`/perfis/${encodeURIComponent(username)}/seguir`, {
        method: 'POST',
        idempotencyKey,
      })
    },
    deixarDeSeguir(username: string, idempotencyKey: string): Promise<void> {
      return request<void>(`/perfis/${encodeURIComponent(username)}/seguir`, { method: 'DELETE', idempotencyKey })
    },
    removerSeguidor(username: string, idempotencyKey: string): Promise<void> {
      return request<void>(`/seguidores/${encodeURIComponent(username)}`, { method: 'DELETE', idempotencyKey })
    },
    listarSeguidores(page: number, size = TAMANHO_DA_PAGINA): Promise<Pagina<PerfilResumo>> {
      return request<Pagina<PerfilResumo>>(`/me/seguidores?page=${page}&size=${size}`)
    },
    listarSeguidos(page: number, size = TAMANHO_DA_PAGINA): Promise<Pagina<PerfilResumo>> {
      return request<Pagina<PerfilResumo>>(`/me/seguidos?page=${page}&size=${size}`)
    },
    listarSolicitacoes(page: number, size = TAMANHO_DA_PAGINA): Promise<Pagina<SolicitacaoSeguir>> {
      return request<Pagina<SolicitacaoSeguir>>(`/solicitacoes?page=${page}&size=${size}`)
    },
    aceitarSolicitacao(id: string, idempotencyKey: string): Promise<void> {
      return request<void>(`/solicitacoes/${encodeURIComponent(id)}/aceitar`, { method: 'POST', idempotencyKey })
    },
    recusarSolicitacao(id: string, idempotencyKey: string): Promise<void> {
      return request<void>(`/solicitacoes/${encodeURIComponent(id)}/recusar`, { method: 'POST', idempotencyKey })
    },
  }
}

export const perfilService = createPerfilService()
