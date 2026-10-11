import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import type { LivroOficialResumo } from '../services/acervo'
import { ApiError } from '../services/api'

export type EstadoDoCatalogo = 'carregando' | 'pronta' | 'nao-encontrada' | 'erro'

const LIMITE_DO_COLD_START_MS = 3_000

/** O que as três páginas têm em comum: `GET /autores|editoras|series/{id}`. */
export interface PaginaDeCatalogo<L extends LivroOficialResumo = LivroOficialResumo> {
  id: string
  nome: string
  livros: { itens: L[]; page: number; totalItens: number; totalPaginas: number }
}

/**
 * Estado das páginas de autor, editora e série (F-ACV-DESCOBERTA), no molde de `useLivroOficial`
 * para a página e de `useBuscaDeLivros` para os livros.
 *
 * - **Página a partir de 1**, acumulada por rolagem, sem repetir id; a falha da página seguinte não
 *   apaga as anteriores. Cada página reenvia o cabeçalho (nome, biografia), que fica o da primeira.
 * - **Guarda de corrida por geração:** trocar de id na mesma rota descarta a resposta anterior.
 * - **Cold start é carregamento** (RNF-ERR-09); 404 e 400 (id malformado) são "não encontrada".
 */
export function usePaginaDeCatalogo<P extends PaginaDeCatalogo>(obter: (id: string, page: number) => Promise<P>) {
  const estado = ref<EstadoDoCatalogo>('carregando')
  const coldStart = ref(false)
  const pagina = shallowRef<P | null>(null)
  /** Na série, cada item é um `LivroDaSerieResumo`: a tela faz o estreitamento. */
  const livros = shallowRef<LivroOficialResumo[]>([])
  const totalItens = ref(0)
  const carregandoMais = ref(false)
  const falhouMais = ref(false)
  const proximaPagina = ref(1)
  const totalPaginas = ref(0)

  let id = ''
  let geracao = 0
  let limiteDoColdStart: ReturnType<typeof setTimeout> | undefined

  const temMais = computed(() => proximaPagina.value <= totalPaginas.value)

  async function carregar(novoId: string = id): Promise<void> {
    id = novoId
    const minha = ++geracao
    clearTimeout(limiteDoColdStart)
    estado.value = 'carregando'
    coldStart.value = false
    carregandoMais.value = false
    falhouMais.value = false
    limiteDoColdStart = setTimeout(() => {
      if (minha === geracao && estado.value === 'carregando') {
        coldStart.value = true
      }
    }, LIMITE_DO_COLD_START_MS)
    try {
      const resposta = await obter(id, 1)
      if (minha !== geracao) {
        return
      }
      pagina.value = resposta
      livros.value = resposta.livros.itens
      totalItens.value = resposta.livros.totalItens
      proximaPagina.value = resposta.livros.page + 1
      totalPaginas.value = resposta.livros.totalPaginas
      estado.value = 'pronta'
    } catch (erro) {
      if (minha !== geracao) {
        return
      }
      estado.value = erro instanceof ApiError && (erro.status === 404 || erro.status === 400) ? 'nao-encontrada' : 'erro'
      if (!(erro instanceof ApiError)) {
        throw erro
      }
    } finally {
      if (minha === geracao) {
        clearTimeout(limiteDoColdStart)
        coldStart.value = false
      }
    }
  }

  async function carregarMais(): Promise<void> {
    if (!temMais.value || carregandoMais.value || estado.value !== 'pronta') {
      return
    }
    const minha = geracao
    carregandoMais.value = true
    falhouMais.value = false
    try {
      const resposta = await obter(id, proximaPagina.value)
      if (minha !== geracao) {
        return
      }
      const vistos = new Set(livros.value.map((livro) => livro.id))
      livros.value = [...livros.value, ...resposta.livros.itens.filter((livro) => !vistos.has(livro.id))]
      totalItens.value = resposta.livros.totalItens
      proximaPagina.value = resposta.livros.page + 1
      totalPaginas.value = resposta.livros.totalPaginas
    } catch (erro) {
      if (minha === geracao) {
        falhouMais.value = true
      }
      if (!(erro instanceof ApiError)) {
        throw erro
      }
    } finally {
      if (minha === geracao) {
        carregandoMais.value = false
      }
    }
  }

  function descartar(): void {
    geracao += 1
    clearTimeout(limiteDoColdStart)
  }

  if (getCurrentScope()) {
    onScopeDispose(descartar)
  }

  return {
    estado,
    coldStart,
    pagina,
    livros,
    totalItens,
    carregandoMais,
    falhouMais,
    temMais,
    carregar,
    carregarMais,
    descartar,
  }
}
