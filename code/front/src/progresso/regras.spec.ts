import { describe, expect, it } from 'vitest'

import type { Progresso } from '../services/leitura'
import {
  alcanceDaExclusao,
  ehUltimo,
  paginasLidasDerivadas,
  percentual,
  precisaDeAvisoDeRitmo,
  validarPagina,
  validarTempo,
} from './regras'
import { TEXTOS_DAS_ATUALIZACOES, TEXTOS_DO_REGISTRO } from './textos'

function progresso(id: string, posicao: number, pagina: number, paginaAnterior: number): Progresso {
  return {
    id,
    leituraId: 'lei-1',
    posicao,
    pagina,
    paginaAnterior,
    paginasLidas: pagina - paginaAnterior,
    minutos: 30,
    registradoEmDispositivo: '2026-09-08T10:00:00Z',
    fusoHorarioDispositivo: 'America/Sao_Paulo',
    dataLocal: '2026-09-08',
    criadoEm: '2026-09-08T10:00:00Z',
  }
}

const itens = [
  progresso('p4', 4, 172, 148),
  progresso('p3', 3, 148, 117),
  progresso('p2', 2, 117, 55),
  progresso('p1', 1, 55, 0),
]

describe('validarPagina', () => {
  it('aceita a página seguinte à atual e a última do livro', () => {
    expect(validarPagina(148, 264, 149)).toBeNull()
    expect(validarPagina(148, 264, 264)).toBeNull()
  })

  it('recusa a página igual ou menor que a atual citando a atual', () => {
    expect(validarPagina(148, 264, 148)).toBe(TEXTOS_DO_REGISTRO.erroPaginaBaixa(148))
    expect(validarPagina(148, 264, 140)).toBe(TEXTOS_DO_REGISTRO.erroPaginaBaixa(148))
  })

  it('recusa a página maior que o total citando o total', () => {
    expect(validarPagina(148, 264, 300)).toBe(TEXTOS_DO_REGISTRO.erroPaginaAlta(264))
  })

  it('recusa página vazia ou fracionada', () => {
    expect(validarPagina(0, 264, Number.NaN)).toBe(TEXTOS_DO_REGISTRO.erroPaginaAusente)
    expect(validarPagina(0, 264, 10.5)).toBe(TEXTOS_DO_REGISTRO.erroPaginaAusente)
  })
})

describe('validarTempo', () => {
  it('soma horas e minutos em minutos totais', () => {
    expect(validarTempo(0, 45)).toEqual({ minutos: 45, erro: null })
    expect(validarTempo(1, 10)).toEqual({ minutos: 70, erro: null })
  })

  it('aceita os limites de 0 e 720 minutos', () => {
    expect(validarTempo(0, 0)).toEqual({ minutos: 0, erro: null })
    expect(validarTempo(12, 0)).toEqual({ minutos: 720, erro: null })
  })

  it('recusa mais de 12 horas', () => {
    expect(validarTempo(12, 1)).toEqual({ minutos: null, erro: TEXTOS_DO_REGISTRO.erroTempoMaximo })
  })

  it('recusa valor negativo, fracionado ou vazio', () => {
    expect(validarTempo(-1, 30).erro).toBe(TEXTOS_DO_REGISTRO.erroTempoInvalido)
    expect(validarTempo(0, 1.5).erro).toBe(TEXTOS_DO_REGISTRO.erroTempoInvalido)
    expect(validarTempo(Number.NaN, 30).erro).toBe(TEXTOS_DO_REGISTRO.erroTempoInvalido)
  })
})

describe('paginasLidasDerivadas', () => {
  it('é a página informada menos a atual', () => {
    expect(paginasLidasDerivadas(148, 172)).toBe(24)
  })

  it('não existe para página que não avança', () => {
    expect(paginasLidasDerivadas(148, 148)).toBeNull()
    expect(paginasLidasDerivadas(148, Number.NaN)).toBeNull()
  })
})

describe('percentual', () => {
  it('não arredonda o dado', () => {
    expect(percentual(148, 264)).toBeCloseTo(56.0606, 3)
  })

  it('limita a 100', () => {
    expect(percentual(300, 264)).toBe(100)
  })

  it('é zero sem página', () => {
    expect(percentual(0, 264)).toBe(0)
  })
})

describe('alcanceDaExclusao', () => {
  it('excluir o último volta para a página anterior dele', () => {
    expect(alcanceDaExclusao(itens, 'p4', 264)).toEqual({
      quantidade: 1,
      paginaResultante: 148,
      percentualResultante: percentual(148, 264),
    })
  })

  it('excluir um intermediário leva ele e os posteriores', () => {
    expect(alcanceDaExclusao(itens, 'p2', 264)).toEqual({
      quantidade: 3,
      paginaResultante: 55,
      percentualResultante: percentual(55, 264),
    })
  })

  it('excluir o primeiro zera a página', () => {
    expect(alcanceDaExclusao(itens, 'p1', 264)).toEqual({ quantidade: 4, paginaResultante: 0, percentualResultante: 0 })
  })

  it('não depende da ordem recebida', () => {
    expect(alcanceDaExclusao([...itens].reverse(), 'p3', 264)?.quantidade).toBe(2)
  })

  it('não existe para id fora da lista', () => {
    expect(alcanceDaExclusao(itens, 'outro', 264)).toBeNull()
  })

  it('alimenta a confirmação com o número do recálculo', () => {
    const alcance = alcanceDaExclusao(itens, 'p4', 264)!
    expect(TEXTOS_DAS_ATUALIZACOES.confirmacaoTexto(alcance.paginaResultante, alcance.percentualResultante)).toBe(
      'Sua página atual volta para 148 e o percentual para 56%. Os outros registros não mudam.',
    )
  })
})

describe('ehUltimo', () => {
  it('só o de maior posição é o último', () => {
    expect(ehUltimo(itens, 'p4')).toBe(true)
    expect(ehUltimo([...itens].reverse(), 'p4')).toBe(true)
    expect(ehUltimo(itens, 'p3')).toBe(false)
    expect(ehUltimo([], 'p4')).toBe(false)
  })
})


describe('precisaDeAvisoDeRitmo', () => {
  const comPaginas = (id: string, paginasLidas: number) => ({ id, paginasLidas })

  it('avisa quando o registro passa a média dos outros em 40 páginas', () => {
    const itens = [comPaginas('p3', 70), comPaginas('p2', 20), comPaginas('p1', 40)]
    expect(precisaDeAvisoDeRitmo(itens, 'p3')).toBe(true)
  })

  it('não avisa quando a diferença é de 39 páginas', () => {
    const itens = [comPaginas('p3', 69), comPaginas('p2', 20), comPaginas('p1', 40)]
    expect(precisaDeAvisoDeRitmo(itens, 'p3')).toBe(false)
  })

})
