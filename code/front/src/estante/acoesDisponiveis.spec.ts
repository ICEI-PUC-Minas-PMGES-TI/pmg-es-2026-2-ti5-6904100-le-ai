import { describe, expect, it } from 'vitest'

import type { Leitura, StatusEstante } from '../services/leitura'
import { acoesDisponiveis, type EstadoDeLeitura } from './acoesDisponiveis'

function leitura(parcial: Partial<Leitura> = {}): Leitura {
  return {
    id: 'lei-1',
    livroId: 'livro-1',
    status: 'LENDO',
    dataInicio: '2026-08-12',
    releitura: false,
    incompleta: false,
    retomavel: false,
    paginaAtual: 148,
    totalPaginas: 264,
    percentualConcluido: 56,
    vezesLido: 0,
    ultimaAtividadeEm: '2026-09-08T10:00:00Z',
    ...parcial,
  }
}

function resumo(estado: EstadoDeLeitura) {
  return acoesDisponiveis(estado).map((acao) => `${acao.id}:${acao.tom}`)
}

describe('acoesDisponiveis (RN-04, acoes-de-leitura.md §4.1 a §4.9)', () => {
  it('fora da estante: adicionar como Quero ler em destaque e iniciar leitura, sem destrutiva', () => {
    expect(resumo({ status: null })).toEqual(['adicionarQueroLer:principal', 'iniciarLeitura:neutra'])
  })

  it('Quero ler: iniciar em destaque e remover da estante por último', () => {
    expect(resumo({ status: 'QUERO_LER' })).toEqual(['iniciarLeitura:principal', 'removerDaEstante:destrutiva'])
  })

  it('Lendo: registrar progresso, finalizar e abandonar leitura por último', () => {
    expect(resumo({ status: 'LENDO', leitura: leitura() })).toEqual([
      'registrarProgresso:principal',
      'finalizarLeitura:neutra',
      'abandonarLeitura:destrutiva',
    ])
  })

  it('Relendo: finalizar e abandonar releitura, nunca a copy da primeira leitura', () => {
    expect(resumo({ status: 'RELENDO', leitura: leitura({ status: 'RELENDO', releitura: true }) })).toEqual([
      'registrarProgresso:principal',
      'finalizarReleitura:neutra',
      'abandonarReleitura:destrutiva',
    ])
  })

  it('Lido: só iniciar releitura, sem remover (existe histórico)', () => {
    expect(resumo({ status: 'LIDO' })).toEqual(['iniciarReleitura:principal'])
  })

  it('Abandonado retomável: só retomar leitura', () => {
    expect(resumo({ status: 'ABANDONADO', leitura: leitura({ status: 'ABANDONADO', retomavel: true }) })).toEqual([
      'retomarLeitura:principal',
    ])
  })

  it('Abandonado sem leitura retomável não oferece retomar', () => {
    expect(resumo({ status: 'ABANDONADO', leitura: leitura({ status: 'ABANDONADO', retomavel: false }) })).toEqual([])
  })

  it.each<StatusEstante>(['LENDO', 'RELENDO'])('%s sem leitura carregada não oferece ações que precisam dela', (status) => {
    expect(resumo({ status })).toEqual(['registrarProgresso:principal'])
  })

  it('destrutiva é sempre a última e nunca mais de uma', () => {
    const estados: EstadoDeLeitura[] = [
      { status: null },
      { status: 'QUERO_LER' },
      { status: 'LENDO', leitura: leitura() },
      { status: 'RELENDO', leitura: leitura({ releitura: true }) },
      { status: 'LIDO' },
      { status: 'ABANDONADO', leitura: leitura({ retomavel: true }) },
    ]
    for (const estado of estados) {
      const tons = acoesDisponiveis(estado).map((acao) => acao.tom)
      const destrutivas = tons.filter((tom) => tom === 'destrutiva').length
      expect(destrutivas).toBeLessThanOrEqual(1)
      if (destrutivas === 1) expect(tons.at(-1)).toBe('destrutiva')
    }
  })

  it('diz o passo seguinte de cada ação: data, confirmação, direto ou fora do painel', () => {
    const passos = Object.fromEntries(
      [
        ...acoesDisponiveis({ status: null }),
        ...acoesDisponiveis({ status: 'QUERO_LER' }),
        ...acoesDisponiveis({ status: 'LENDO', leitura: leitura() }),
        ...acoesDisponiveis({ status: 'LIDO' }),
        ...acoesDisponiveis({ status: 'ABANDONADO', leitura: leitura({ retomavel: true }) }),
      ].map((acao) => [acao.id, acao.passo]),
    )
    expect(passos).toEqual({
      adicionarQueroLer: 'direto',
      iniciarLeitura: 'data',
      removerDaEstante: 'confirmacao',
      registrarProgresso: 'externo',
      finalizarLeitura: 'data',
      abandonarLeitura: 'confirmacao',
      iniciarReleitura: 'data',
      retomarLeitura: 'direto',
    })
  })
})
