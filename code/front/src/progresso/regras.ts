import type { Progresso } from '../services/leitura'
import { TEXTOS_DO_REGISTRO } from './textos'

const PERCENTUAL_MAXIMO = 100
const MINUTOS_MAXIMOS = 720
const MINUTOS_POR_HORA = 60
export const LIMIAR_RITMO_PAGINAS = 40

export interface TempoValidado {
  minutos: number | null
  erro: string | null
}

export interface AlcanceDaExclusao {
  quantidade: number
  paginaResultante: number
  percentualResultante: number
}

type ItemDeProgresso = Pick<Progresso, 'id' | 'posicao' | 'paginaAnterior'>

type ItemDeRitmo = Pick<Progresso, 'id' | 'paginasLidas'>

function inteiroNaoNegativo(valor: number): boolean {
  return Number.isInteger(valor) && valor >= 0
}

export function validarPagina(paginaAtual: number, totalPaginas: number, pagina: number): string | null {
  if (!Number.isInteger(pagina)) return TEXTOS_DO_REGISTRO.erroPaginaAusente
  if (pagina <= paginaAtual) return TEXTOS_DO_REGISTRO.erroPaginaBaixa(paginaAtual)
  if (pagina > totalPaginas) return TEXTOS_DO_REGISTRO.erroPaginaAlta(totalPaginas)
  return null
}

export function validarTempo(horas: number, minutos: number): TempoValidado {
  if (!inteiroNaoNegativo(horas) || !inteiroNaoNegativo(minutos)) {
    return { minutos: null, erro: TEXTOS_DO_REGISTRO.erroTempoInvalido }
  }
  const total = horas * MINUTOS_POR_HORA + minutos
  if (total > MINUTOS_MAXIMOS) return { minutos: null, erro: TEXTOS_DO_REGISTRO.erroTempoMaximo }
  return { minutos: total, erro: null }
}

export function paginasLidasDerivadas(paginaAtual: number, pagina: number): number | null {
  return Number.isInteger(pagina) && pagina > paginaAtual ? pagina - paginaAtual : null
}

export function percentual(paginaAtual: number, totalPaginas: number): number {
  return Math.min(PERCENTUAL_MAXIMO, (paginaAtual / totalPaginas) * PERCENTUAL_MAXIMO)
}

export function alcanceDaExclusao(
  itens: readonly ItemDeProgresso[],
  progressoId: string,
  totalPaginas: number,
): AlcanceDaExclusao | null {
  const alvo = itens.find((item) => item.id === progressoId)
  if (!alvo) return null
  return {
    quantidade: itens.filter((item) => item.posicao >= alvo.posicao).length,
    paginaResultante: alvo.paginaAnterior,
    percentualResultante: percentual(alvo.paginaAnterior, totalPaginas),
  }
}

export function ehUltimo(itens: readonly ItemDeProgresso[], progressoId: string): boolean {
  const alvo = itens.find((item) => item.id === progressoId)
  return alvo !== undefined && itens.every((item) => item.posicao <= alvo.posicao)
}

export function precisaDeAvisoDeRitmo(itens: readonly ItemDeRitmo[], progressoId: string): boolean {
  const alvo = itens.find((item) => item.id === progressoId)
  if (!alvo) return false
  const outros = itens.filter((item) => item.id !== progressoId)
  const media = outros.length === 0 ? 0 : outros.reduce((soma, item) => soma + item.paginasLidas, 0) / outros.length
  return alvo.paginasLidas - media >= LIMIAR_RITMO_PAGINAS
}
