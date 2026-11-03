import { computed, ref, shallowRef, watch } from 'vue'

import {
  type Estatisticas,
  type GraficosEstatisticas,
  leituraService,
  type LeituraService,
  type PeriodoEstatisticas,
} from '../services/leitura'

export interface ItemDoSeletor {
  periodo: PeriodoEstatisticas
  livrosConcluidos: number
}

const ANO = /^[1-9]\d{3}$/

/** `?periodo=` da rota: um ano ou `acumulado`; fora disso, o ano corrente. */
export function lerPeriodoDaRota(valor: unknown, anoCorrente: number): PeriodoEstatisticas {
  if (valor === 'acumulado') return 'acumulado'
  if (typeof valor === 'string' && ANO.test(valor)) return Number(valor)
  return anoCorrente
}

/**
 * Lista do seletor de período: os anos com registro, o ano corrente (que abre
 * ativo mesmo sem registro) e o período escolhido pela rota, do mais recente ao
 * mais antigo, e o acumulado por último com a soma dos livros.
 */
export function itensDoSeletor(
  anos: Estatisticas['anos'],
  anoCorrente: number,
  escolhido: PeriodoEstatisticas,
): ItemDoSeletor[] {
  const porAno = new Map(anos.map((a) => [a.ano, a.livrosConcluidos]))
  if (!porAno.has(anoCorrente)) porAno.set(anoCorrente, 0)
  if (typeof escolhido === 'number' && !porAno.has(escolhido)) porAno.set(escolhido, 0)
  const doAno = [...porAno.entries()]
    .sort(([a], [b]) => b - a)
    .map(([ano, livrosConcluidos]) => ({ periodo: ano, livrosConcluidos }))
  const acumulado = anos.reduce((soma, a) => soma + a.livrosConcluidos, 0)
  return [...doAno, { periodo: 'acumulado', livrosConcluidos: acumulado }]
}

/**
 * Painel de estatísticas (F-STA): totais, médias e séries do período, pedidos
 * juntos. Uma resposta atrasada de um período anterior é descartada, e os anos
 * do seletor sobrevivem à troca de período para a lista continuar usável
 * enquanto o novo recorte carrega.
 */
export function useEstatisticas(
  periodo: () => PeriodoEstatisticas,
  anoCorrente: number,
  servico: Pick<LeituraService, 'consultarMinhasEstatisticas' | 'consultarGraficosEstatisticas'> = leituraService,
) {
  const carregando = ref(true)
  const falhou = ref(false)
  const dados = shallowRef<Estatisticas | null>(null)
  const graficos = shallowRef<GraficosEstatisticas | null>(null)
  const anos = shallowRef<Estatisticas['anos'] | null>(null)
  const primeiroRegistro = ref<string | null>(null)
  let pedido = 0

  async function carregar(): Promise<void> {
    const atual = ++pedido
    const doPeriodo = periodo()
    carregando.value = true
    falhou.value = false
    try {
      const [estatisticas, series] = await Promise.all([
        servico.consultarMinhasEstatisticas(doPeriodo),
        servico.consultarGraficosEstatisticas(doPeriodo),
      ])
      if (atual !== pedido) return
      dados.value = estatisticas
      graficos.value = series
      anos.value = estatisticas.anos
      primeiroRegistro.value = estatisticas.primeiroRegistro
    } catch {
      if (atual !== pedido) return
      dados.value = null
      graficos.value = null
      falhou.value = true
    } finally {
      if (atual === pedido) carregando.value = false
    }
  }

  watch(periodo, () => void carregar(), { immediate: true })

  /** Leitor sem nenhum registro de leitura: o painel vira o estado vazio (4.7). */
  const vazio = computed(() => anos.value !== null && anos.value.length === 0 && primeiroRegistro.value === null)

  const seletor = computed(() => itensDoSeletor(anos.value ?? [], anoCorrente, periodo()))

  return { carregando, falhou, dados, graficos, primeiroRegistro, vazio, seletor, recarregar: carregar }
}
