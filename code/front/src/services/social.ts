import { getToken } from '../session'
import { createApiClient, type ApiClientOptions } from './api'
import { TAMANHO_DA_PAGINA, type Pagina } from './perfil'
import { renovarSessao } from './renovacao'

export type TipoAtividade =
  | 'LEITURA_INICIADA'
  | 'LEITURA_RETOMADA'
  | 'LEITURA_FINALIZADA'
  | 'LEITURA_ABANDONADA'
  | 'RESENHA_PUBLICADA'

export interface AutorSnapshot {
  id: string
  username: string
  nomeExibicao: string
  avatarUrl: string | null
}

export type TipoLivro = 'OFICIAL' | 'PESSOAL'

export interface LinkLivro {
  livroId: string
  /** `lista` nos itens de lista (F-LST): `referenciaId` é a lista. */
  via: 'catalogo' | 'feed' | 'lista'
  referenciaId: string | null
}

export interface LivroSnapshot {
  id: string
  tipo: TipoLivro
  titulo: string
  /** `null` em livro oficial sem autor (common-v1, 27/09/2026). */
  autor: string | null
  capaUrl: string | null
  link?: LinkLivro
}

export interface ResenhaSnapshot {
  id: string
  texto: string
  spoiler: boolean
  nota: number | null
}

export interface Atividade {
  id: string
  tipo: TipoAtividade
  autor: AutorSnapshot
  livro: LivroSnapshot
  resenha: ResenhaSnapshot | null
  criadoEm: string
  totalCurtidas: number
  totalComentarios: number
  curtidaPeloSolicitante: boolean
}

export type NivelComentario = 'RAIZ' | 'RESPOSTA'

export interface Mencao {
  posicao: number
  comprimento: number
  usuarioId: string
  username: string
}

export interface Comentario {
  id: string
  atividadeId: string
  comentarioRaizId: string | null
  comentarioRespondidoId: string | null
  usuarioRespondido: AutorSnapshot | null
  autor: AutorSnapshot
  texto: string
  mencoes: Mencao[]
  nivel: NivelComentario
  totalRespostas?: number
  pertenceAoSolicitante: boolean
  editado: boolean
  criadoEm: string
  atualizadoEm: string | null
}

interface PaginaHttp<T> {
  itens: T[]
  pagina: number
  tamanho: number
  totalItens: number
  totalPaginas: number
  ultima: boolean
}

export interface EstadoCurtida {
  atividadeId: string
  curtida: true
  totalCurtidas: number
}

export interface CriarComentario {
  texto: string
  comentarioRespondidoId?: string
}

export interface ListaRespostas {
  itens: Comentario[]
  proximoCursor: string | null
  temMais: boolean
}

function paraPagina<T>(resp: PaginaHttp<T>): Pagina<T> {
  return {
    items: resp.itens,
    page: resp.pagina,
    size: resp.tamanho,
    totalElements: resp.totalItens,
    totalPages: resp.totalPaginas,
  }
}

export function createSocialService(options: ApiClientOptions = {}) {
  const request = createApiClient({
    ...options,
    baseUrl: options.baseUrl ?? import.meta.env.VITE_SOCIAL_BASE_URL,
    getToken: options.getToken ?? getToken,
    renovarSessao: options.renovarSessao ?? renovarSessao,
  })

  return {
    async listarFeed(page: number, size = TAMANHO_DA_PAGINA): Promise<Pagina<Atividade>> {
      return paraPagina(await request<PaginaHttp<Atividade>>(`/feed?page=${page}&size=${size}`))
    },
    obterAtividade(id: string): Promise<Atividade> {
      return request<Atividade>(`/atividades/${encodeURIComponent(id)}`)
    },
    curtir(id: string, idempotencyKey: string): Promise<EstadoCurtida> {
      return request<EstadoCurtida>(`/atividades/${encodeURIComponent(id)}/curtir`, {
        method: 'POST',
        idempotencyKey,
      })
    },
    descurtir(id: string, idempotencyKey: string): Promise<void> {
      return request<void>(`/atividades/${encodeURIComponent(id)}/curtir`, { method: 'DELETE', idempotencyKey })
    },
    async listarComentariosRaiz(
      atividadeId: string,
      page: number,
      size = TAMANHO_DA_PAGINA,
    ): Promise<Pagina<Comentario>> {
      return paraPagina(
        await request<PaginaHttp<Comentario>>(
          `/atividades/${encodeURIComponent(atividadeId)}/comentarios?page=${page}&size=${size}`,
        ),
      )
    },
    listarRespostas(comentarioRaizId: string, cursor?: string, limit = TAMANHO_DA_PAGINA): Promise<ListaRespostas> {
      const parametros = new URLSearchParams({ limit: String(limit) })
      if (cursor) {
        parametros.set('cursor', cursor)
      }
      return request<ListaRespostas>(`/comentarios/${encodeURIComponent(comentarioRaizId)}/respostas?${parametros}`)
    },
    comentar(atividadeId: string, dados: CriarComentario, idempotencyKey: string): Promise<Comentario> {
      return request<Comentario>(`/atividades/${encodeURIComponent(atividadeId)}/comentarios`, {
        method: 'POST',
        json: dados,
        idempotencyKey,
      })
    },
    editarComentario(comentarioId: string, texto: string, idempotencyKey: string): Promise<Comentario> {
      return request<Comentario>(`/comentarios/${encodeURIComponent(comentarioId)}`, {
        method: 'PATCH',
        json: { texto },
        idempotencyKey,
      })
    },
    excluirComentario(comentarioId: string, idempotencyKey: string): Promise<void> {
      return request<void>(`/comentarios/${encodeURIComponent(comentarioId)}`, { method: 'DELETE', idempotencyKey })
    },
  }
}

export const socialService = createSocialService()
