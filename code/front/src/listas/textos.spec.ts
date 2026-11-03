import { describe, expect, it } from 'vitest'

import { caracteres, textoDaExclusao } from './textos'

describe('textoDaExclusao', () => {
  it('com vários livros, cita a ordem e a contagem', () => {
    expect(textoDaExclusao(7)).toBe(
      'A lista e a ordem dos 7 livros saem do seu perfil. Os livros continuam na sua estante e no acervo. Não dá para desfazer.',
    )
  })

  it('com um livro, não escreve "a ordem dos 1 livro"', () => {
    expect(textoDaExclusao(1)).toBe(
      'A lista sai do seu perfil. O livro continua na sua estante e no acervo. Não dá para desfazer.',
    )
  })

  it('sem livros, não fala de livro nenhum', () => {
    expect(textoDaExclusao(0)).toBe('A lista sai do seu perfil. Não dá para desfazer.')
  })
})

describe('caracteres', () => {
  it('conta code points, como o char_length do servidor', () => {
    expect(caracteres('📚 ok')).toBe(4)
  })
})
