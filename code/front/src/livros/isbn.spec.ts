import { describe, expect, it } from 'vitest'

import { digitosDoIsbn, normalizarIsbn13 } from './isbn'

// Mesmos casos de code/back/acervo/src/common/isbn.spec.ts e do app.
describe('normalizarIsbn13', () => {
  it.each([
    ['978-85-359-1484-9', '9788535914849'],
    [' 978 85 359 1484 9 ', '9788535914849'],
    ['9788535914849', '9788535914849'],
  ])('aceita %s', (bruto, esperado) => {
    expect(normalizarIsbn13(bruto)).toBe(esperado)
  })

  it.each([
    ['dígito verificador errado', '9788535914848'],
    ['prefixo que não é de livro', '9771234567003'],
    ['doze dígitos', '978853591484'],
    ['URL', 'https://openlibrary.org/isbn/9788535914849'],
    ['letras', '97885359148X9'],
  ])('recusa %s', (_caso, bruto) => {
    expect(normalizarIsbn13(bruto)).toBeNull()
  })

  it('conta só os dígitos para habilitar o botão', () => {
    expect(digitosDoIsbn('978-85-359-1484-9')).toHaveLength(13)
  })
})
