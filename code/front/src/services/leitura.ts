import { getToken } from '../session'
import { ApiError, createApiClient, type ApiClientOptions } from './api'
import { renovarSessao } from './renovacao'

export type StatusEstante = 'QUERO_LER' | 'LENDO' | 'LIDO' | 'RELENDO' | 'ABANDONADO'

export type OrdenacaoEstante =
  | 'adicionado_desc'
  | 'adicionado_asc'
  | 'titulo_asc'
  | 'titulo_desc'
  | 'autor_asc'
  | 'autor_desc'
  | 'progresso_asc'
  | 'progresso_desc'

export interface LivroDaEstante {
  titulo: string
  autor: string | null
  capaUrl: string | null
}

export interface ItemEstante {
  livroId: string
  livro: LivroDaEstante
  status: StatusEstante
  vezesLido: number
  leituraEmAndamentoId?: string | null
  ultimaLeituraId: string | null
  retomavel: boolean
  paginaAtual?: number | null
  totalPaginas?: number | null
  percentualConcluido?: number | null
  adicionadoEm: string
}

export interface Paginacao {
  page: number
  limite: number
  totalItens: number
  totalPaginas: number
}

export type TotaisEstante = Record<StatusEstante, number>

export interface PaginaEstante {
  itens: ItemEstante[]
  paginacao: Paginacao
  totaisPorStatus: TotaisEstante
}

export interface Leitura {
  id: string
  livroId: string
  status: StatusEstante
  dataInicio: string
  dataFim?: string | null
  releitura: boolean
  incompleta: boolean
  retomavel: boolean
  paginaAtual: number
  totalPaginas?: number | null
  percentualConcluido: number | null
  vezesLido: number
  ultimaAtividadeEm: string
  finalizadaEm?: string | null
  finalizacaoFusoHorario?: string | null
  finalizacaoDataLocal?: string | null
}

export interface ConclusoesLivro {
  livroId: string
  vezesLido: number
}

export interface FiltroEstante {
  status?: StatusEstante
  ordenacao?: OrdenacaoEstante
  page?: number
  limite?: number
}

export interface IniciarLeituraEntrada {
  livroId: string
  dataInicio?: string
}

export interface FinalizarLeituraEntrada {
  dataFim?: string
  fusoHorarioDispositivo: string
}

const NAO_ENCONTRADO = 404

export function consultaDaEstante(filtro: FiltroEstante = {}): string {
  const parametros = new URLSearchParams()
  if (filtro.status) parametros.set('status', filtro.status)
  if (filtro.ordenacao) parametros.set('ordenacao', filtro.ordenacao)
  if (filtro.page !== undefined) parametros.set('page', String(filtro.page))
  if (filtro.limite !== undefined) parametros.set('limite', String(filtro.limite))
  const consulta = parametros.toString()
  return consulta ? `?${consulta}` : ''
}

export function createLeituraService(options: ApiClientOptions = {}) {
  const request = createApiClient({
    ...options,
    baseUrl: options.baseUrl ?? import.meta.env.VITE_LEITURA_BASE_URL,
    getToken: options.getToken ?? getToken,
    renovarSessao: options.renovarSessao ?? renovarSessao,
  })

  const daLeitura = (leituraId: string, acao = '') => `/leituras/${encodeURIComponent(leituraId)}${acao}`

  function listarEstante(filtro?: FiltroEstante): Promise<PaginaEstante> {
    return request<PaginaEstante>(`/estante${consultaDaEstante(filtro)}`)
  }

  function listarEstantePerfil(usuarioId: string, filtro?: FiltroEstante): Promise<PaginaEstante> {
    return request<PaginaEstante>(`/perfis/${encodeURIComponent(usuarioId)}/estante${consultaDaEstante(filtro)}`)
  }

  async function consultarItemEstante(livroId: string): Promise<ItemEstante | null> {
    try {
      return await request<ItemEstante>(`/estante/${encodeURIComponent(livroId)}`)
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === NAO_ENCONTRADO) return null
      throw erro
    }
  }

  function adicionarEstante(livroId: string, chave: string): Promise<ItemEstante> {
    return request<ItemEstante>('/estante', { method: 'POST', json: { livroId }, idempotencyKey: chave })
  }

  async function removerEstante(livroId: string, chave: string): Promise<void> {
    await request(`/estante/${encodeURIComponent(livroId)}`, { method: 'DELETE', idempotencyKey: chave })
  }

  function iniciarLeitura(entrada: IniciarLeituraEntrada, chave: string): Promise<Leitura> {
    return request<Leitura>('/leituras', { method: 'POST', json: entrada, idempotencyKey: chave })
  }

  function iniciarReleitura(entrada: IniciarLeituraEntrada, chave: string): Promise<Leitura> {
    return request<Leitura>('/releituras', { method: 'POST', json: entrada, idempotencyKey: chave })
  }

  function finalizarLeitura(leituraId: string, entrada: FinalizarLeituraEntrada, chave: string): Promise<Leitura> {
    return request<Leitura>(daLeitura(leituraId, '/finalizar'), { method: 'POST', json: entrada, idempotencyKey: chave })
  }

  function abandonarLeitura(leituraId: string, chave: string): Promise<Leitura> {
    return request<Leitura>(daLeitura(leituraId, '/abandonar'), { method: 'POST', idempotencyKey: chave })
  }

  function retomarLeitura(leituraId: string, chave: string): Promise<Leitura> {
    return request<Leitura>(daLeitura(leituraId, '/retomar'), { method: 'POST', idempotencyKey: chave })
  }

  function detalharLeitura(leituraId: string): Promise<Leitura> {
    return request<Leitura>(daLeitura(leituraId))
  }

  function consultarConclusoes(livroId: string): Promise<ConclusoesLivro> {
    return request<ConclusoesLivro>(`/livros/${encodeURIComponent(livroId)}/conclusoes`)
  }

  return {
    listarEstante,
    listarEstantePerfil,
    consultarItemEstante,
    adicionarEstante,
    removerEstante,
    iniciarLeitura,
    iniciarReleitura,
    finalizarLeitura,
    abandonarLeitura,
    retomarLeitura,
    detalharLeitura,
    consultarConclusoes,
  }
}

export type LeituraService = ReturnType<typeof createLeituraService>

export const leituraService = createLeituraService()
