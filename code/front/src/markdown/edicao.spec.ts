import { describe, expect, it } from 'vitest'

import { alternarMarca, alternarPrefixo, continuarLista, marcaAtiva, prefixoAtivo, type Edicao } from './edicao'

/** `|` marca o cursor; `[` e `]`, a seleção. */
function edicao(modelo: string): Edicao {
  if (modelo.includes('|')) {
    const inicio = modelo.indexOf('|')
    return { texto: modelo.replace('|', ''), inicio, fim: inicio }
  }
  const inicio = modelo.indexOf('[')
  const fim = modelo.indexOf(']') - 1
  return { texto: modelo.replace('[', '').replace(']', ''), inicio, fim }
}

function modelo(e: Edicao): string {
  if (e.inicio === e.fim) return e.texto.slice(0, e.inicio) + '|' + e.texto.slice(e.inicio)
  return e.texto.slice(0, e.inicio) + '[' + e.texto.slice(e.inicio, e.fim) + ']' + e.texto.slice(e.fim)
}

describe('marcas de trecho', () => {
  it('envolve a seleção', () => {
    expect(modelo(alternarMarca(edicao('um [livro] bom'), '**'))).toBe('um **[livro]** bom')
    expect(modelo(alternarMarca(edicao('um [livro] bom'), '~~'))).toBe('um ~~[livro]~~ bom')
  })

  it('sem seleção, insere o par com o cursor no meio', () => {
    expect(modelo(alternarMarca(edicao('um |'), '*'))).toBe('um *|*')
  })

  it('com o cursor dentro da formatação, fica ativa e tocar de novo remove o par', () => {
    const dentro = edicao('um **li|vro** bom')
    expect(marcaAtiva(dentro, '**')).toBe(true)
    expect(marcaAtiva(dentro, '*')).toBe(false)
    expect(modelo(alternarMarca(dentro, '**'))).toBe('um li|vro bom')
  })

  it('itálico e negrito não se confundem', () => {
    expect(marcaAtiva(edicao('um *li|vro* bom'), '*')).toBe(true)
    expect(marcaAtiva(edicao('um *li|vro* bom'), '**')).toBe(false)
  })
})

describe('prefixos de bloco', () => {
  it('lista com marcadores na linha do cursor, e tocar de novo tira', () => {
    const com = alternarPrefixo(edicao('um|'), 'ul')
    expect(modelo(com)).toBe('- um|')
    expect(prefixoAtivo(com, 'ul')).toBe(true)
    expect(modelo(alternarPrefixo(com, 'ul'))).toBe('um|')
  })

  it('lista numerada em sequência em cada linha selecionada', () => {
    expect(alternarPrefixo(edicao('[um\ndois\ntrês]'), 'ol').texto).toBe('1. um\n2. dois\n3. três')
  })

  it('trocar o tipo de lista troca o marcador', () => {
    expect(alternarPrefixo(edicao('[- um\n- dois]'), 'ol').texto).toBe('1. um\n2. dois')
  })

  it('citação', () => {
    expect(alternarPrefixo(edicao('[frase]'), 'q').texto).toBe('> frase')
  })
})

describe('Enter na lista', () => {
  it('continua com o próximo marcador', () => {
    expect(modelo(continuarLista(edicao('- um|'))!)).toBe('- um\n- |')
    expect(modelo(continuarLista(edicao('1. um|'))!)).toBe('1. um\n2. |')
  })

  it('num item vazio, sai da lista', () => {
    expect(modelo(continuarLista(edicao('- um\n- |'))!)).toBe('- um\n|')
  })

  it('fora de lista, o Enter segue o normal', () => {
    expect(continuarLista(edicao('texto|'))).toBeNull()
  })
})
