import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import {
  acervoService,
  type AcervoService,
  type LivroOficialDetalhe,
  type ResenhaDoLivro,
  type SinopseDoLivro,
} from '../services/acervo'
import { ApiError } from '../services/api'

export type EstadoDaPagina = 'carregando' | 'pronta' | 'nao-encontrada' | 'erro'

/** Esperas entre as consultas da sinopse, cerca de 2 minutos no total, como no app. */
export const ESPERAS_DA_SINOPSE_MS = [2_000, 3_000, 5_000, 8_000, 13_000, 20_000, 30_000, 40_000]
const LIMITE_DO_COLD_START_MS = 3_000

export interface OpcoesDaPagina {
  servico?: Pick<AcervoService, 'obterLivroOficial' | 'listarResenhasDoLivro'>
}

/**
 * Estado da página do livro oficial (pagina-do-livro.md), no molde do `LivroOficialController` do
 * app.
 *
 * - **Polling da sinopse** com esperas crescentes, parando em `disponivel`, `ausente` ou
 *   `falha_transitoria`, no fim das esperas e quando a tela sai. Cada consulta aproveita **só a
 *   sinopse**: a `GET /livros/{id}` devolve de novo a primeira página de resenhas, e sobrescrever
 *   apagaria as já carregadas e os spoilers revelados.
 * - **Resenhas por cursor**, acumuladas. `resenhas: null` vira `resenhasIndisponiveis`, com
 *   "Tentar de novo".
 * - **Troca de livro** na mesma rota recomeça tudo, e a resposta do livro anterior é descartada.
 */
export function useLivroOficial(opcoes: OpcoesDaPagina = {}) {
  const servico = opcoes.servico ?? acervoService

  const estado = ref<EstadoDaPagina>('carregando')
  const coldStart = ref(false)
  const livro = shallowRef<LivroOficialDetalhe | null>(null)
  const sinopse = ref<SinopseDoLivro>({ status: 'pendente', texto: null })
  const sinopseDemorou = ref(false)
  const resenhas = shallowRef<ResenhaDoLivro[]>([])
  const proximoCursor = ref<string | null>(null)
  const resenhasIndisponiveis = ref(false)
  const carregandoResenhas = ref(false)

  let livroId = ''
  let geracao = 0
  let consultas = 0
  let proximaConsulta: ReturnType<typeof setTimeout> | undefined
  let limiteDoColdStart: ReturnType<typeof setTimeout> | undefined

  const temMaisResenhas = computed(() => proximoCursor.value !== null)

  async function carregar(id: string = livroId): Promise<void> {
    livroId = id
    const minha = ++geracao
    clearTimeout(proximaConsulta)
    clearTimeout(limiteDoColdStart)
    estado.value = 'carregando'
    coldStart.value = false
    limiteDoColdStart = setTimeout(() => {
      if (minha === geracao && estado.value === 'carregando') {
        coldStart.value = true
      }
    }, LIMITE_DO_COLD_START_MS)
    try {
      const detalhe = await servico.obterLivroOficial(id)
      if (minha !== geracao) {
        return
      }
      livro.value = detalhe
      sinopse.value = detalhe.sinopse
      sinopseDemorou.value = false
      resenhasIndisponiveis.value = detalhe.resenhas === null
      resenhas.value = detalhe.resenhas?.itens ?? []
      proximoCursor.value = detalhe.resenhas?.proximoCursor ?? null
      estado.value = 'pronta'
      consultas = 0
      agendarSinopse(minha)
    } catch (erro) {
      if (minha !== geracao) {
        return
      }
      if (!(erro instanceof ApiError)) {
        throw erro
      }
      estado.value = erro.status === 404 ? 'nao-encontrada' : 'erro'
    } finally {
      if (minha === geracao) {
        clearTimeout(limiteDoColdStart)
        coldStart.value = false
      }
    }
  }

  /** "Ver todas as resenhas" e o "Tentar de novo" das resenhas indisponíveis. */
  async function carregarResenhas(): Promise<void> {
    if (carregandoResenhas.value) {
      return
    }
    const continuacao = !resenhasIndisponiveis.value
    if (continuacao && proximoCursor.value === null) {
      return
    }
    const minha = geracao
    carregandoResenhas.value = true
    try {
      const pagina = await servico.listarResenhasDoLivro(livroId, continuacao ? proximoCursor.value : null)
      if (minha !== geracao) {
        return
      }
      const vistas = new Set(resenhas.value.map((resenha) => resenha.id))
      resenhas.value = continuacao
        ? [...resenhas.value, ...pagina.itens.filter((resenha) => !vistas.has(resenha.id))]
        : pagina.itens
      proximoCursor.value = pagina.proximoCursor
      resenhasIndisponiveis.value = false
    } catch (erro) {
      if (!(erro instanceof ApiError)) {
        throw erro
      }
      if (minha === geracao && !continuacao) {
        resenhasIndisponiveis.value = true
      }
    } finally {
      if (minha === geracao) {
        carregandoResenhas.value = false
      }
    }
  }

  function agendarSinopse(minha: number): void {
    clearTimeout(proximaConsulta)
    if (sinopse.value.status !== 'pendente' && sinopse.value.status !== 'nao_consultada') {
      return
    }
    const espera = ESPERAS_DA_SINOPSE_MS[consultas]
    if (espera === undefined) {
      sinopseDemorou.value = true
      return
    }
    consultas += 1
    proximaConsulta = setTimeout(() => void consultarSinopse(minha), espera)
  }

  async function consultarSinopse(minha: number): Promise<void> {
    try {
      const detalhe = await servico.obterLivroOficial(livroId)
      if (minha !== geracao) {
        return
      }
      sinopse.value = detalhe.sinopse
    } catch (erro) {
      // Uma consulta perdida não é erro de tela: a próxima espera tenta de novo.
      if (!(erro instanceof ApiError)) {
        throw erro
      }
    }
    if (minha === geracao) {
      agendarSinopse(minha)
    }
  }

  function descartar(): void {
    geracao += 1
    clearTimeout(proximaConsulta)
    clearTimeout(limiteDoColdStart)
  }

  if (getCurrentScope()) {
    onScopeDispose(descartar)
  }

  return {
    estado,
    coldStart,
    livro,
    sinopse,
    sinopseDemorou,
    resenhas,
    resenhasIndisponiveis,
    carregandoResenhas,
    temMaisResenhas,
    carregar,
    carregarResenhas,
    descartar,
  }
}
