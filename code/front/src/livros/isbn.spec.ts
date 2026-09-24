import { describe, expect, it } from 'vitest'

import { digitosDoIsbn, mascararIsbn, normalizarIsbn13 } from './isbn'

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

describe('mascararIsbn', () => {
  it.each([
    ['9788535914849', '978-85-359-1484-9'],
    ['978-85-359-1484-9', '978-85-359-1484-9'],
    ['978 85 359 1484 9', '978-85-359-1484-9'],
    ['978.85.3591484.9', '978-85-359-1484-9'],
    ['ISBN: 978-85-359-1484-9', '978-85-359-1484-9'],
    ['97885', '978-85'],
    ['978', '978'],
    ['97885359148490000', '978-85-359-1484-9'],
    ['abc', ''],
  ])('%s → %s', (bruto, esperado) => {
    expect(mascararIsbn(bruto, bruto.length).valor).toBe(esperado)
  })

  it('digitar no meio mantém o cursor depois do dígito digitado', () => {
    // "978-85-|359" com um 1 inserido depois do hífen.
    const { valor, cursor } = mascararIsbn('978-85-1359', 8, '978-85-359')
    expect(valor).toBe('978-85-135-9')
    expect(valor.slice(0, cursor)).toBe('978-85-1')
  })

  it('apagar um hífen com Backspace apaga o dígito antes dele', () => {
    // "978-85-|359": Backspace remove o hífen da posição 6.
    const { valor, cursor } = mascararIsbn('978-85359', 6, '978-85-359')
    expect(valor).toBe('978-83-59')
    expect(valor.slice(0, cursor)).toBe('978-8')
  })
})
