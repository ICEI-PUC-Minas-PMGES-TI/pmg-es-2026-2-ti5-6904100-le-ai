import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import {
  acervoService,
  type AcervoService,
  type AssuntoResumo,
  type LivroOficialResumo,
} from '../services/acervo'
import { ApiError } from '../services/api'
import { agruparEdicoes } from './agruparEdicoes'

export type EstadoDaBusca = 'aterrissagem' | 'buscando' | 'resultados' | 'vazio' | 'erro'
export type EstadoDosAssuntos = 'carregando' | 'pronto' | 'erro'

/** Debounce e mínimo iguais aos do app. Decisão de F-ACV-BUSCA: o contrato aceita 1 caractere. */
export const ESPERA_DA_BUSCA_MS = 350
export const MINIMO_DE_CARACTERES = 2
const LIMITE_DO_COLD_START_MS = 3_000

export interface OpcoesDaBusca {
  servico?: Pick<AcervoService, 'buscarLivros' | 'listarAssuntos'>
  /** Consulta e assunto vindos da URL, para a busca sobreviver ao recarregar e ao voltar. */
  inicial?: { q?: string | null; assunto?: string | null }
  /** Chamado a cada busca que sai, para a tela refletir `q` e `assunto` na URL. */
  aoBuscar?: (criterios: { q: string | null; assunto: string | null }) => void
}

/**
 * Estado da aba Descobrir (descobrir.md), no mesmo molde do `BuscaDeLivrosController` do app.
 *
 * - **Guarda de corrida por geração.** O `api.ts` não repassa o `AbortSignal` do chamador, e um
 *   GET antigo ainda pode estar retentando um `503`: toda resposta confere se ainda é da busca
 *   atual antes de mexer no estado.
 * - **Página a partir de 1**, acumulada por rolagem, sem repetir id; a falha da página seguinte não
 *   apaga as anteriores. Não reaproveita `src/perfil/usePaginacao.ts`, que é base 0.
 * - **Cold start é carregamento** (RNF-ERR-09): depois de 3 s a tela ganha a frase de servidor
 *   iniciando, sem virar erro.
 */
export function useBuscaDeLivros(opcoes: OpcoesDaBusca = {}) {
  const servico = opcoes.servico ?? acervoService

  const consulta = ref(opcoes.inicial?.q ?? '')
  const assunto = ref<string | null>(opcoes.inicial?.assunto ?? null)
  const assuntos = shallowRef<AssuntoResumo[]>([])
  const estadoDosAssuntos = ref<EstadoDosAssuntos>('carregando')
  const estado = ref<EstadoDaBusca>('aterrissagem')
  const livros = shallowRef<LivroOficialResumo[]>([])
  const grupos = computed(() => agruparEdicoes(livros.value))
  const totalItens = ref(0)
  const coldStart = ref(false)
  const carregandoMais = ref(false)
  const falhouMais = ref(false)
  /** Muda a cada busca nova, nunca na página seguinte. */
  const geracao = ref(0)

  const proximaPagina = ref(1)
  const totalPaginas = ref(0)
  let termoBuscado: string | null = null
  /** O que a busca atual pediu: a página seguinte continua ela, não o que está digitado agora. */
  let criteriosBuscados: { q: string | null; assunto: string | null } = { q: null, assunto: null }
  let espera: ReturnType<typeof setTimeout> | undefined
  let limiteDoColdStart: ReturnType<typeof setTimeout> | undefined
  let carregandoAssuntos = false

  const termo = computed(() => {
    const aparado = consulta.value.trim()
    return aparado.length >= MINIMO_DE_CARACTERES ? aparado : null
  })
  const temMais = computed(() => proximaPagina.value <= totalPaginas.value)

  function definirPaginacao(proxima: number, total: number): void {
    proximaPagina.value = proxima
    totalPaginas.value = total
  }

  async function carregarAssuntos(): Promise<void> {
    if (carregandoAssuntos || assuntos.value.length > 0) {
      return
    }
    carregandoAssuntos = true
    estadoDosAssuntos.value = 'carregando'
    try {
      assuntos.value = await servico.listarAssuntos()
      estadoDosAssuntos.value = 'pronto'
    } catch (erro) {
      // Sem a faixa de assuntos a busca por texto continua; a tela oferece "Tentar de novo", e a
      // próxima busca também tenta.
      estadoDosAssuntos.value = 'erro'
      if (!(erro instanceof ApiError)) {
        throw erro
      }
    } finally {
      carregandoAssuntos = false
    }
  }

  /** A cada tecla. A busca só sai depois de 350 ms sem digitar. */
  function alterarConsulta(texto: string): void {
    if (texto === consulta.value) {
      return
    }
    consulta.value = texto
    clearTimeout(espera)
    if (termo.value === null && assunto.value === null) {
      voltarParaAterrissagem()
      return
    }
    // Espaço no fim ou volta ao mesmo texto: o que iria ao servidor não mudou.
    if (termo.value === termoBuscado && estado.value !== 'erro' && estado.value !== 'aterrissagem') {
      return
    }
    espera = setTimeout(() => void buscar(), ESPERA_DA_BUSCA_MS)
  }

  /** Seleção única: escolher o assunto ativo o remove (descobrir.md §4.2). */
  function alternarAssunto(id: string): void {
    assunto.value = assunto.value === id ? null : id
    buscarAgora()
  }

  function limparConsulta(): void {
    consulta.value = ''
    buscarAgora()
  }

  function tentarDeNovo(): void {
    buscarAgora()
  }

  /** Busca de imediato o que já está no estado: a consulta e o assunto vindos da URL. */
  function iniciar(): void {
    void carregarAssuntos()
    if (termo.value !== null || assunto.value !== null) {
      void buscar()
    }
  }

  /** Consulta e assunto que chegaram pela URL com a tela aberta (a aba tocada de novo, por exemplo). */
  function aplicarCriterios(criterios: { q: string | null; assunto: string | null }): void {
    consulta.value = criterios.q ?? ''
    assunto.value = criterios.assunto
    buscarAgora()
  }

  function buscarAgora(): void {
    clearTimeout(espera)
    if (termo.value === null && assunto.value === null) {
      voltarParaAterrissagem()
      return
    }
    void buscar()
  }

  async function buscar(): Promise<void> {
    const minha = ++geracao.value
    termoBuscado = termo.value
    criteriosBuscados = { q: termo.value, assunto: assunto.value }
    clearTimeout(limiteDoColdStart)
    estado.value = 'buscando'
    coldStart.value = false
    carregandoMais.value = false
    falhouMais.value = false
    opcoes.aoBuscar?.({ q: termo.value, assunto: assunto.value })
    void carregarAssuntos()
    limiteDoColdStart = setTimeout(() => {
      if (minha === geracao.value && estado.value === 'buscando') {
        coldStart.value = true
      }
    }, LIMITE_DO_COLD_START_MS)
    try {
      const pagina = await servico.buscarLivros({ q: termo.value, assunto: assunto.value })
      if (minha !== geracao.value) {
        return
      }
      livros.value = pagina.itens
      totalItens.value = pagina.totalItens
      definirPaginacao(pagina.page + 1, pagina.totalPaginas)
      estado.value = pagina.itens.length === 0 ? 'vazio' : 'resultados'
    } catch (erro) {
      if (minha !== geracao.value) {
        return
      }
      // Erro que não é da API (corpo que não é JSON, por exemplo) também é erro de tela: sem isso
      // a busca ficaria em `buscando` para sempre.
      estado.value = 'erro'
      if (!(erro instanceof ApiError)) {
        throw erro
      }
    } finally {
      if (minha === geracao.value) {
        clearTimeout(limiteDoColdStart)
        coldStart.value = false
      }
    }
  }

  async function carregarMais(): Promise<void> {
    if (!temMais.value || carregandoMais.value || estado.value !== 'resultados') {
      return
    }
    const minha = geracao.value
    carregandoMais.value = true
    falhouMais.value = false
    try {
      const pagina = await servico.buscarLivros({ ...criteriosBuscados, page: proximaPagina.value })
      if (minha !== geracao.value) {
        return
      }
      const vistos = new Set(livros.value.map((livro) => livro.id))
      livros.value = [...livros.value, ...pagina.itens.filter((livro) => !vistos.has(livro.id))]
      totalItens.value = pagina.totalItens
      definirPaginacao(pagina.page + 1, pagina.totalPaginas)
    } catch (erro) {
      if (minha === geracao.value) {
        falhouMais.value = true
      }
      if (!(erro instanceof ApiError)) {
        throw erro
      }
    } finally {
      if (minha === geracao.value) {
        carregandoMais.value = false
      }
    }
  }

  function voltarParaAterrissagem(): void {
    geracao.value++
    termoBuscado = null
    clearTimeout(limiteDoColdStart)
    estado.value = 'aterrissagem'
    coldStart.value = false
    carregandoMais.value = false
    falhouMais.value = false
    totalItens.value = 0
    livros.value = []
    definirPaginacao(1, 0)
    opcoes.aoBuscar?.({ q: null, assunto: null })
  }

  function descartar(): void {
    clearTimeout(espera)
    clearTimeout(limiteDoColdStart)
    geracao.value++
  }

  if (getCurrentScope()) {
    onScopeDispose(descartar)
  }

  return {
    consulta,
    assunto,
    assuntos,
    estadoDosAssuntos,
    estado,
    livros,
    grupos,
    totalItens,
    coldStart,
    carregandoMais,
    falhouMais,
    geracao,
    temMais,
    iniciar,
    aplicarCriterios,
    carregarAssuntos,
    alterarConsulta,
    alternarAssunto,
    limparConsulta,
    tentarDeNovo,
    carregarMais,
    descartar,
  }
}
