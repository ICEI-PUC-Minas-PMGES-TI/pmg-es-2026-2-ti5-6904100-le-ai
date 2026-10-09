import { getToken } from '../session'
import type { ViaDeAcesso } from './acervo'
import { ApiError, createApiClient, type ApiClientOptions } from './api'
import { renovarSessao } from './renovacao'

/**
 * Contrato do serviço `leitura` usado por F-AVA. Espelha `docs/api/leitura.yaml`: mesmos campos,
 * mesmas rotas. Toda escrita exige `Idempotency-Key`, e quem guarda a chave da intenção é quem
 * chama (o composable), não este serviço.
 */

/** `Nota` do contrato: de 0 a 5 em passos de 0,5 (RN-06). */
export interface Nota {
  livroId: string
  valor: number
  criadoEm: string
  atualizadoEm: string
}

/** `Resenha` do contrato: texto cru, até 5.000 caracteres (RN-07). */
export interface Resenha {
  id: string
  usuarioId: string
  livroId: string
  texto: string
  spoiler: boolean
  criadoEm: string
  atualizadoEm: string
}

export type TipoDeReacao = 'curtida' | 'descurtida'

/** `Reacoes` do contrato (F-AVA-2): contagens separadas e a reação de quem olha (RF-AVA-08). */
export interface EstadoDasReacoes {
  minhaReacao: TipoDeReacao | null
  curtidas: number
  descurtidas: number
}

/**
 * A via de RN-15 pela qual o leitor abriu um livro pessoal de outra pessoa (`ViaDeAcesso` do
 * acervo): o servidor só aceita a reação à resenha do dono com ela. Em livro oficial não vai.
 */
export type { ViaDeAcesso }

/** `MinhaResenha` do contrato: a resenha do próprio leitor com as contagens, só para leitura. */
export interface MinhaResenha extends Resenha {
  curtidas: number
  descurtidas: number
}

/** Ausente é `null`, nunca valor inventado: nota `0` é uma nota. */
export interface MinhaAvaliacao {
  livroId: string
  nota: Nota | null
  /** Depois de salvar no editor, as contagens podem faltar até a próxima carga. */
  resenha: (Resenha & Partial<Pick<MinhaResenha, 'curtidas' | 'descurtidas'>>) | null
}

/** `LivroDaResenha` do contrato: o que o card do perfil mostra do livro. */
export interface LivroDaResenha {
  id: string
  tipo: 'oficial' | 'pessoal'
  titulo: string
  /** `null` em livro oficial sem autor. */
  autor: string | null
  capaUrl: string | null
}

/** `ResenhaDoPerfil` do contrato: a resenha com o livro, a nota do autor e as reações. */
export interface ResenhaDoPerfil extends Resenha, EstadoDasReacoes {
  livro: LivroDaResenha
  nota: number | null
}

export interface PaginaResenhasPerfil {
  itens: ResenhaDoPerfil[]
  paginacao: { page: number; limite: number; totalItens: number; totalPaginas: number }
}

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

export interface Progresso {
  id: string
  leituraId: string
  posicao: number
  pagina: number
  paginaAnterior: number
  paginasLidas: number
  minutos: number
  registradoEmDispositivo: string
  fusoHorarioDispositivo: string
  dataLocal: string
  criadoEm: string
}

export interface ResumoProgresso {
  paginaAtual: number
  totalPaginas: number
  percentualConcluido: number
  minutosTotais: number
}

export interface PaginaProgresso {
  itens: Progresso[]
  paginacao: Paginacao
  resumo: ResumoProgresso
  somenteLeitura: boolean
}

export interface ProgressoComResumo {
  progresso: Progresso
  resumo: ResumoProgresso
}

export interface ExclusaoProgresso {
  idsRemovidos: string[]
  resumo: ResumoProgresso
}

export interface RegistrarProgressoEntrada {
  pagina: number
  minutos?: number
  registradoEmDispositivo: string
  fusoHorarioDispositivo: string
}

export interface ExcluirProgressoEntrada {
  ultimoProgressoIdConfirmado: string
}

export interface FiltroProgresso {
  page?: number
  limite?: number
}

const NAO_ENCONTRADO = 404

export function consultaDaEstante(filtro: FiltroEstante = {}): string {
  const parametros = new URLSearchParams()
  if (filtro.status) parametros.set('status', filtro.status)
  if (filtro.ordenacao) parametros.set('ordenacao', filtro.ordenacao)
  return comPaginacao(parametros, filtro)
}

function comPaginacao(parametros: URLSearchParams, filtro: FiltroProgresso): string {
  if (filtro.page !== undefined) parametros.set('page', String(filtro.page))
  if (filtro.limite !== undefined) parametros.set('limite', String(filtro.limite))
  const consulta = parametros.toString()
  return consulta ? `?${consulta}` : ''
}

/** Fábrica no molde de `createAcervoService`, para os testes injetarem um `fetch` falso. */
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

  const doProgresso = (progressoId: string) => `/progresso/${encodeURIComponent(progressoId)}`

  function registrarProgresso(
    leituraId: string,
    entrada: RegistrarProgressoEntrada,
    chave: string,
  ): Promise<ProgressoComResumo> {
    return request<ProgressoComResumo>(daLeitura(leituraId, '/progresso'), {
      method: 'POST',
      json: entrada,
      idempotencyKey: chave,
    })
  }

  function listarProgresso(leituraId: string, filtro: FiltroProgresso = {}): Promise<PaginaProgresso> {
    return request<PaginaProgresso>(daLeitura(leituraId, `/progresso${comPaginacao(new URLSearchParams(), filtro)}`))
  }

  function excluirTrechoProgresso(
    progressoId: string,
    entrada: ExcluirProgressoEntrada,
    chave: string,
  ): Promise<ExclusaoProgresso> {
    return request<ExclusaoProgresso>(doProgresso(progressoId), {
      method: 'DELETE',
      json: entrada,
      idempotencyKey: chave,
    })
  }

  const caminhoDoLivro = (livroId: string) => `/livros/${encodeURIComponent(livroId)}`

  function obterMinhaAvaliacao(livroId: string): Promise<MinhaAvaliacao> {
    return request<MinhaAvaliacao>(`${caminhoDoLivro(livroId)}/minha-avaliacao`)
  }

  function salvarNota(livroId: string, valor: number, chave: string): Promise<Nota> {
    return request<Nota>(`${caminhoDoLivro(livroId)}/nota`, {
      method: 'PUT',
      json: { valor },
      idempotencyKey: chave,
    })
  }

  async function excluirNota(livroId: string, chave: string): Promise<void> {
    await request<void>(`${caminhoDoLivro(livroId)}/nota`, {
      method: 'DELETE',
      idempotencyKey: chave,
    })
  }

  function salvarResenha(livroId: string, texto: string, spoiler: boolean, chave: string): Promise<Resenha> {
    return request<Resenha>(`${caminhoDoLivro(livroId)}/resenha`, {
      method: 'PUT',
      json: { texto, spoiler },
      idempotencyKey: chave,
    })
  }

  async function excluirResenha(livroId: string, chave: string): Promise<void> {
    await request<void>(`${caminhoDoLivro(livroId)}/resenha`, {
      method: 'DELETE',
      idempotencyKey: chave,
    })
  }

  const daReacao = (resenhaId: string) => `/resenhas/${encodeURIComponent(resenhaId)}/reacao`

  /** Curte ou descurte a resenha de outro leitor (RF-AVA-05); devolve o estado depois da escrita. */
  function reagir(
    resenhaId: string,
    tipo: TipoDeReacao,
    via: ViaDeAcesso | undefined,
    chave: string,
  ): Promise<EstadoDasReacoes> {
    return request<EstadoDasReacoes>(daReacao(resenhaId), {
      method: 'PUT',
      json: { tipo, ...via },
      idempotencyKey: chave,
    })
  }

  /** Retira a reação. A via vai na consulta, porque o `DELETE` não tem corpo. */
  function removerReacao(resenhaId: string, via: ViaDeAcesso | undefined, chave: string): Promise<EstadoDasReacoes> {
    const consulta = via ? `?${new URLSearchParams({ via: via.via, referenciaId: via.referenciaId })}` : ''
    return request<EstadoDasReacoes>(`${daReacao(resenhaId)}${consulta}`, {
      method: 'DELETE',
      idempotencyKey: chave,
    })
  }

  /** Resenhas autorizadas de um perfil (RN-08): página iniciada em 1, até 50 por página. */
  function listarResenhasPerfil(usuarioId: string, page = 1, limite = 20): Promise<PaginaResenhasPerfil> {
    const query = new URLSearchParams({ page: String(page), limite: String(limite) })
    return request<PaginaResenhasPerfil>(`/perfis/${encodeURIComponent(usuarioId)}/resenhas?${query}`)
  }

  return {
    obterMinhaAvaliacao,
    salvarNota,
    excluirNota,
    salvarResenha,
    excluirResenha,
    reagir,
    removerReacao,
    listarResenhasPerfil,
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
    registrarProgresso,
    listarProgresso,
    excluirTrechoProgresso,
  }
}

export type LeituraService = ReturnType<typeof createLeituraService>

export const leituraService = createLeituraService()
