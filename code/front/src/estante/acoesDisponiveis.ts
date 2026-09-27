import type { Leitura, StatusEstante } from '../services/leitura'
import { ACOES_DE_LEITURA } from './textos'

export interface EstadoDeLeitura {
  status: StatusEstante | null
  leitura?: Leitura | null
}

export type IdAcao = keyof Omit<typeof ACOES_DE_LEITURA, 'cancelar' | 'salvando'>

export type TomDaAcao = 'principal' | 'neutra' | 'destrutiva'

export type PassoDaAcao = 'data' | 'confirmacao' | 'direto' | 'externo'

export interface AcaoDisponivel {
  id: IdAcao
  rotulo: string
  tom: TomDaAcao
  passo: PassoDaAcao
}

const PASSO: Record<IdAcao, PassoDaAcao> = {
  adicionarQueroLer: 'direto',
  iniciarLeitura: 'data',
  registrarProgresso: 'externo',
  finalizarLeitura: 'data',
  finalizarReleitura: 'data',
  iniciarReleitura: 'data',
  retomarLeitura: 'direto',
  abandonarLeitura: 'confirmacao',
  abandonarReleitura: 'confirmacao',
  removerDaEstante: 'confirmacao',
}

function acao(id: IdAcao, tom: TomDaAcao): AcaoDisponivel {
  return { id, rotulo: ACOES_DE_LEITURA[id], tom, passo: PASSO[id] }
}

function emAndamento(finalizar: IdAcao, abandonar: IdAcao, leitura: Leitura | null | undefined): AcaoDisponivel[] {
  const acoes = [acao('registrarProgresso', 'principal')]
  if (leitura) acoes.push(acao(finalizar, 'neutra'), acao(abandonar, 'destrutiva'))
  return acoes
}

export function acoesDisponiveis({ status, leitura }: EstadoDeLeitura): AcaoDisponivel[] {
  switch (status) {
    case null:
      return [acao('adicionarQueroLer', 'principal'), acao('iniciarLeitura', 'neutra')]
    case 'QUERO_LER':
      return [acao('iniciarLeitura', 'principal'), acao('removerDaEstante', 'destrutiva')]
    case 'LENDO':
      return emAndamento('finalizarLeitura', 'abandonarLeitura', leitura)
    case 'RELENDO':
      return emAndamento('finalizarReleitura', 'abandonarReleitura', leitura)
    case 'LIDO':
      return [acao('iniciarReleitura', 'principal')]
    case 'ABANDONADO':
      return leitura?.retomavel ? [acao('retomarLeitura', 'principal')] : []
  }
}
