import { getToken } from '../session'
import { createApiClient, type ApiClientOptions } from './api'
import { TAMANHO_DA_PAGINA, type Pagina } from './perfil'
import { renovarSessao } from './renovacao'
import type { LinkLivro, TipoLivro } from './social'

/**
 * Listas de livros do `social` (F-LST, `docs/api/social.yaml`, tag `listas`). Toda escrita leva
 * `Idempotency-Key`; quem chama guarda a chave da intenção e a repete no reenvio da mesma
 * mudança (mover, adicionar), como pede o cliente central.
 */

/** Limites decididos em 30/09/2026 e conferidos pelo servidor (CHECK de `V20261005100000`). */
export const LIMITE_DO_TITULO = 80
export const LIMITE_DA_DESCRICAO = 300

export interface DonoDaLista {
  id: string
  username: string
  nomeExibicao: string
  avatarUrl: string | null
}

export interface Lista {
  id: string
  dono: DonoDaLista
  titulo: string
  descricao: string | null
  quantidadeLivros: number
  pertenceAoSolicitante: boolean
  criadaEm: string
  atualizadaEm: string
}

export interface CapaDaLista {
  livroId: string
  tipo: TipoLivro
  titulo: string
  capaUrl: string | null
}

export interface ListaResumo {
  id: string
  titulo: string
  descricao: string | null
  quantidadeLivros: number
  capas: CapaDaLista[]
  atualizadaEm: string
  /** Só em `listarMinhas` com `livroId`. */
  contemLivro?: boolean
}

export interface LivroDaLista {
  id: string
  tipo: TipoLivro
  titulo: string
  autor: string | null
  capaUrl: string | null
  link: LinkLivro
}

export interface ItemDeLista {
  id: string
  listaId: string
  livro: LivroDaLista
  /** Posição visível, contínua a partir de 1 (livro inativo não conta). */
  posicao: number
  adicionadoEm: string
}

export interface ListaItens {
  itens: ItemDeLista[]
  proximoCursor: string | null
  temMais: boolean
}

export interface CriarLista {
  titulo: string
  descricao?: string | null
  livroId?: string
}

/** Campo omitido mantém; `descricao: null` apaga. */
export interface EditarLista {
  titulo?: string
  descricao?: string | null
}

interface PaginaHttp<T> {
  itens: T[]
  pagina: number
  tamanho: number
  totalItens: number
  totalPaginas: number
  ultima: boolean
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

/** Itens por segmento: o teto do servidor (RNF-DES-02). */
export const LIMITE_DE_ITENS = 50

export function createListasService(options: ApiClientOptions = {}) {
  const request = createApiClient({
    ...options,
    baseUrl: options.baseUrl ?? import.meta.env.VITE_SOCIAL_BASE_URL,
    getToken: options.getToken ?? getToken,
    renovarSessao: options.renovarSessao ?? renovarSessao,
  })

  const lista = (id: string) => `/listas/${encodeURIComponent(id)}`

  return {
    criar(dados: CriarLista, idempotencyKey: string): Promise<Lista> {
      return request<Lista>('/listas', { method: 'POST', json: dados, idempotencyKey })
    },
    obter(id: string): Promise<Lista> {
      return request<Lista>(lista(id))
    },
    editar(id: string, dados: EditarLista, idempotencyKey: string): Promise<Lista> {
      return request<Lista>(lista(id), { method: 'PATCH', json: dados, idempotencyKey })
    },
    excluir(id: string, idempotencyKey: string): Promise<void> {
      return request<void>(lista(id), { method: 'DELETE', idempotencyKey })
    },
    listarItens(id: string, cursor?: string | null, limit = TAMANHO_DA_PAGINA): Promise<ListaItens> {
      const parametros = new URLSearchParams({ limit: String(limit) })
      if (cursor) {
        parametros.set('cursor', cursor)
      }
      return request<ListaItens>(`${lista(id)}/livros?${parametros}`)
    },
    /** 201 quando entrou agora, 200 quando já estava: os dois devolvem o item. */
    adicionar(id: string, livroId: string, idempotencyKey: string): Promise<ItemDeLista> {
      return request<ItemDeLista>(`${lista(id)}/livros`, { method: 'POST', json: { livroId }, idempotencyKey })
    },
    remover(id: string, livroId: string, idempotencyKey: string): Promise<void> {
      return request<void>(`${lista(id)}/livros/${encodeURIComponent(livroId)}`, {
        method: 'DELETE',
        idempotencyKey,
      })
    },
    /** `posicao` é a visível, de 1 até a quantidade de livros. */
    mover(id: string, itemId: string, posicao: number, idempotencyKey: string): Promise<ItemDeLista> {
      return request<ItemDeLista>(`${lista(id)}/livros/${encodeURIComponent(itemId)}/posicao`, {
        method: 'PUT',
        json: { posicao },
        idempotencyKey,
      })
    },
    async listarDoPerfil(usuarioId: string, page: number, size = TAMANHO_DA_PAGINA): Promise<Pagina<ListaResumo>> {
      return paraPagina(
        await request<PaginaHttp<ListaResumo>>(
          `/perfis/${encodeURIComponent(usuarioId)}/listas?page=${page}&size=${size}`,
        ),
      )
    },
    async listarMinhas(livroId: string | null, page: number, size = TAMANHO_DA_PAGINA): Promise<Pagina<ListaResumo>> {
      const parametros = new URLSearchParams({ page: String(page), size: String(size) })
      if (livroId) {
        parametros.set('livroId', livroId)
      }
      return paraPagina(await request<PaginaHttp<ListaResumo>>(`/me/listas?${parametros}`))
    },
  }
}

export const listasService = createListasService()
