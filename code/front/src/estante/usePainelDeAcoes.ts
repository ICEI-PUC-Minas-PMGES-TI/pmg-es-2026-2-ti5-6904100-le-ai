import { ref, shallowRef } from 'vue'

import type { ItemEstante, LivroDaEstante, LeituraService } from '../services/leitura'
import type { EstadoDeLeitura } from './acoesDisponiveis'

export type LivroDoPainel = LivroDaEstante & { livroId: string }

export type SituacaoNaEstante = Pick<ItemEstante, 'status' | 'leituraEmAndamentoId' | 'ultimaLeituraId'> | null

export async function estadoNaEstante(
  situacao: SituacaoNaEstante,
  detalhar: LeituraService['detalharLeitura'],
): Promise<EstadoDeLeitura> {
  if (!situacao) return { status: null, leitura: null }
  const leituraId = situacao.ultimaLeituraId ?? situacao.leituraEmAndamentoId
  const leitura = leituraId ? await detalhar(leituraId) : null
  return { status: situacao.status, leitura }
}

export function usePainelDeAcoes(detalhar: LeituraService['detalharLeitura']) {
  const livro = shallowRef<LivroDoPainel | null>(null)
  const estado = shallowRef<EstadoDeLeitura>({ status: null, leitura: null })
  const aberto = ref(false)
  const preparando = ref(false)
  const falhou = ref(false)
  let pedidoAtual = 0

  async function abrir(alvo: LivroDoPainel, situacao: SituacaoNaEstante): Promise<void> {
    const pedido = ++pedidoAtual
    preparando.value = true
    falhou.value = false
    try {
      const novo = await estadoNaEstante(situacao, detalhar)
      if (pedido !== pedidoAtual) return
      livro.value = alvo
      estado.value = novo
      aberto.value = true
    } catch {
      if (pedido === pedidoAtual) falhou.value = true
    } finally {
      if (pedido === pedidoAtual) preparando.value = false
    }
  }

  function fechar(): void {
    aberto.value = false
  }

  return { livro, estado, aberto, preparando, falhou, abrir, fechar }
}
