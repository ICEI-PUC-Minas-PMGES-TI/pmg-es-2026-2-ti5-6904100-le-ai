import { getToken } from '../session'
import { createApiClient, type ApiClientOptions } from './api'
import { renovarSessao } from './renovacao'

/** Pessoa citada no painel; nula quando a conta saiu da VIEW de perfil (conta excluída). */
export interface PessoaDaModeracao {
  id: string
  username: string
  nomeExibicao: string
  avatarUrl: string | null
}

/** Item da fila do painel (F-MOD, `DenunciaPendente` de `docs/api/social.yaml`). */
export interface DenunciaPendente {
  id: string
  tipo: 'resenha' | 'comentario'
  criadoEm: string
  motivo: string
  denunciante: PessoaDaModeracao | null
  autor: PessoaDaModeracao | null
  livro: { id: string; titulo: string; pessoal: boolean } | null
  atividade: {
    id: string
    tipo: string
    autorNome: string
    livroTitulo: string
    visivelParaAdmin: boolean
  } | null
  /** Nulo quando quem escreveu já excluiu o conteúdo. */
  conteudo: {
    texto: string
    spoiler: boolean
    nota: number | null
    publicadoEm: string
    respostas: number
  } | null
  remocaoNaoConfirmada: boolean
}

export interface PaginaPorCursor<T> {
  itens: T[]
  proximoCursor: string | null
  temMais: boolean
}

export interface ResultadoModeracao {
  denunciasFechadas: string[]
}

export interface RegistroDeModeracao {
  id: string
  criadoEm: string
  acao: 'remover_conteudo' | 'arquivar_denuncia'
  alvoTipo: 'resenha' | 'comentario' | 'frase'
  comDenuncia: boolean
  alvoAutor: string | null
  atividadeAutor: string | null
  livroTitulo: string | null
  anonimizado: boolean
}

function comCursor(caminho: string, cursor?: string | null): string {
  return cursor ? `${caminho}?cursor=${encodeURIComponent(cursor)}` : caminho
}

/**
 * Painel de moderação (F-MOD), só para a conta de administrador: o `social` devolve 403 a quem
 * não tem o papel, e o cliente só esconde a entrada.
 */
export function createModeracaoService(options: ApiClientOptions = {}) {
  const base = {
    ...options,
    baseUrl: options.baseUrl ?? import.meta.env.VITE_SOCIAL_BASE_URL,
    getToken: options.getToken ?? getToken,
    renovarSessao: options.renovarSessao ?? renovarSessao,
  }
  const request = createApiClient(base)
  // As ações não repetem sozinhas: a remoção já espera até um minuto pelo `leitura` no servidor,
  // e um 504 vira o banner de "não confirmada", com o reenvio na mão do administrador.
  const acao = createApiClient({ ...base, esperasDeRetentativaMs: [] })

  return {
    listarDenuncias(cursor?: string | null): Promise<PaginaPorCursor<DenunciaPendente>> {
      return request<PaginaPorCursor<DenunciaPendente>>(comCursor('/admin/denuncias', cursor))
    },
    arquivar(denunciaId: string, idempotencyKey: string): Promise<ResultadoModeracao> {
      return acao<ResultadoModeracao>(`/admin/denuncias/${encodeURIComponent(denunciaId)}/arquivar`, {
        method: 'POST',
        idempotencyKey,
      })
    },
    remover(denunciaId: string, idempotencyKey: string): Promise<ResultadoModeracao> {
      return acao<ResultadoModeracao>(`/admin/denuncias/${encodeURIComponent(denunciaId)}/remover`, {
        method: 'POST',
        idempotencyKey,
      })
    },
    listarRegistros(cursor?: string | null): Promise<PaginaPorCursor<RegistroDeModeracao>> {
      return request<PaginaPorCursor<RegistroDeModeracao>>(comCursor('/admin/moderacao/logs', cursor))
    },
  }
}

export type ModeracaoService = ReturnType<typeof createModeracaoService>

export const moderacaoService = createModeracaoService()

/**
 * Acorda o `leitura` quando o painel abre: no plano gratuito do Render ele dorme e leva até um
 * minuto para responder, e a primeira remoção de resenha esperaria por isso. Falha é ignorada.
 */
export function aquecerLeitura(fetcher: typeof fetch = fetch): void {
  const base = import.meta.env.VITE_LEITURA_BASE_URL
  if (!base) {
    return
  }
  void fetcher(`${base}/health`).catch(() => undefined)
}
