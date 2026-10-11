import { describe, expect, it } from 'vitest'

import { erroDaPagina, erroDoTrecho, linhaDaCota, referenciaDaFrase, rotuloDeFrases } from './frases'

const autor = { id: 'u2', username: 'marina.antunes', nome: 'Marina', avatarUrl: null }

describe('textos das frases', () => {
  it('contagem no singular e no plural', () => {
    expect(rotuloDeFrases(0)).toBe('0 frases')
    expect(rotuloDeFrases(1)).toBe('1 frase')
    expect(rotuloDeFrases(14)).toBe('14 frases')
  })

  it('referência com o username, ou você na própria', () => {
    expect(referenciaDaFrase({ pagina: 57, minha: false, autor })).toBe('Página 57 · @marina.antunes')
    expect(referenciaDaFrase({ pagina: 112, minha: true, autor })).toBe('Página 112 · você')
  })

  it('linha da cota, sem frases e na última que cabe', () => {
    expect(linhaDaCota(0, 10)).toBe('Você ainda não guardou frases deste livro. Cabem até 10.')
    expect(linhaDaCota(2, 10)).toBe('Você guardou 2 de 10 frases deste livro.')
    expect(linhaDaCota(9, 10, true)).toBe('Você guardou 9 de 10 frases deste livro. Esta é a última que cabe.')
  })
})

describe('validação do formulário', () => {
  it('trecho vazio e acima de 500 code points', () => {
    expect(erroDoTrecho('   ')).toBe('Escreva o trecho que você quer guardar.')
    expect(erroDoTrecho('a'.repeat(534))).toBe('Use até 500 caracteres. Tire 34 para salvar.')
    expect(erroDoTrecho('📚'.repeat(500))).toBeNull()
  })

  it('página vazia, zero e acima do total', () => {
    expect(erroDaPagina('', 264)).toBe('Informe a página em que o trecho está.')
    expect(erroDaPagina('0', 264)).toBe('Informe uma página a partir de 1.')
    expect(erroDaPagina('2,5', 264)).toBe('Informe uma página a partir de 1.')
    expect(erroDaPagina('300', 264)).toBe('O livro tem 264 páginas. Informe uma página até 264.')
    expect(erroDaPagina('74', 264)).toBeNull()
  })
})
