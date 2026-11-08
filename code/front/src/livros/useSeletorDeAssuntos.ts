import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import { acervoService, type AcervoService, type AssuntoResumo } from '../services/acervo'
import { emOrdemAlfabetica, semAcento } from './assuntos'

/**
 * Estado do seletor de assuntos do livro pessoal (F-ACV-OPC; cadastro-pessoal.md §5.1 a §5.5).
 *
 * - A lista do conjunto curado vem de `GET /assuntos` na primeira abertura e fica guardada; falha
 *   não guarda nada, e a próxima abertura (ou `Tentar de novo`) tenta outra vez.
 * - A busca só filtra o que se vê, sem diferenciar acento; nunca cria assunto.
 * - A seleção é **provisória**: marcar e desmarcar não toca o formulário. Só `concluir` devolve a
 *   seleção; fechar de qualquer outro jeito a descarta.
 */
export type EstadoDoSeletor = 'carregando' | 'pronto' | 'erro'

export const LIMITE_DO_COLD_START_MS = 3_000

export interface OpcoesDoSeletor {
  servico?: Pick<AcervoService, 'listarAssuntos'>
}

export function useSeletorDeAssuntos(opcoes: OpcoesDoSeletor = {}) {
  const servico = opcoes.servico ?? acervoService

  const estado = ref<EstadoDoSeletor>('carregando')
  const coldStart = ref(false)
  const assuntos = shallowRef<AssuntoResumo[]>([])
  const busca = ref('')
  const marcados = ref<string[]>([])

  /** Os escolhidos na abertura: um que saiu da lista curada continua com nome até ser desmarcado. */
  let deAntes = new Map<string, AssuntoResumo>()
  let limiteDoColdStart: ReturnType<typeof setTimeout> | undefined
  let carga = 0

  const filtrados = computed(() => {
    const termo = semAcento(busca.value)
    return termo ? assuntos.value.filter((assunto) => semAcento(assunto.nome).includes(termo)) : assuntos.value
  })

  function pararColdStart(): void {
    clearTimeout(limiteDoColdStart)
    coldStart.value = false
  }

  async function carregar(): Promise<void> {
    const minha = ++carga
    estado.value = 'carregando'
    pararColdStart()
    limiteDoColdStart = setTimeout(() => {
      coldStart.value = true
    }, LIMITE_DO_COLD_START_MS)
    try {
      const lista = await servico.listarAssuntos()
      if (minha !== carga) {
        return
      }
      assuntos.value = emOrdemAlfabetica(lista)
      estado.value = 'pronto'
    } catch {
      if (minha === carga) {
        estado.value = 'erro'
      }
    } finally {
      if (minha === carga) {
        pararColdStart()
      }
    }
  }

  /** Abre com a seleção atual do formulário marcada e a busca vazia. */
  function abrir(atuais: readonly AssuntoResumo[]): void {
    deAntes = new Map(atuais.map((assunto) => [assunto.id, assunto]))
    marcados.value = atuais.map((assunto) => assunto.id)
    busca.value = ''
    if (estado.value !== 'pronto') {
      void carregar()
    }
  }

  function marcado(id: string): boolean {
    return marcados.value.includes(id)
  }

  function alternar(id: string): void {
    marcados.value = marcado(id) ? marcados.value.filter((outro) => outro !== id) : [...marcados.value, id]
  }

  function limpar(): void {
    marcados.value = []
  }

  /** A seleção que vai ao formulário, em ordem alfabética. */
  function concluir(): AssuntoResumo[] {
    const porId = new Map(assuntos.value.map((assunto) => [assunto.id, assunto]))
    const escolhidos = marcados.value
      .map((id) => porId.get(id) ?? deAntes.get(id))
      .filter((assunto): assunto is AssuntoResumo => assunto !== undefined)
    return emOrdemAlfabetica(escolhidos)
  }

  /** Fechar sem `Concluir`: nada vai ao formulário. Uma carga em andamento segue e serve à próxima abertura. */
  function descartar(): void {
    marcados.value = []
    busca.value = ''
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      carga++
      pararColdStart()
    })
  }

  return {
    estado,
    coldStart,
    assuntos,
    filtrados,
    busca,
    marcados,
    abrir,
    carregar,
    marcado,
    alternar,
    limpar,
    concluir,
    descartar,
  }
}
