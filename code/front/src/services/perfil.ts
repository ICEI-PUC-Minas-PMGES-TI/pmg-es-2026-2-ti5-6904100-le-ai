import { getToken } from '../session'
import { createApiClient, type ApiClientOptions } from './api'
import { renovarSessao } from './renovacao'

/**
 * Perfil próprio no serviço `identidade` (F-PERFIL, RF-SOC-01/04). Espelha os schemas `Perfil`
 * e `EditarPerfilRequisicao` de `docs/api/identidade.yaml`. A escrita exige `Idempotency-Key`, e
 * quem guarda a chave da intenção é a tela.
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

/** Substituição: os quatro campos vão sempre, e `avatar: null` remove a foto. */
export interface EditarPerfil {
  displayName: string
  biografia: string | null
  avatar: Avatar | null
  privacidade: Privacidade
}

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
  }
}

export const perfilService = createPerfilService()
