import { describe, expect, it } from 'vitest'

import { formatarData, formatarMegabytes, formatarNota, formatarPaginas } from './formatos'

describe('formatos pt-BR', () => {
  it('nota com vírgula e sem casa decimal quando inteira', () => {
    expect(formatarNota(4.5)).toBe('4,5')
    expect(formatarNota(4)).toBe('4')
  })

  it('tamanho em MB com vírgula decimal', () => {
    expect(formatarMegabytes(8.2 * 1024 * 1024)).toBe('8,2 MB')
  })

  it('páginas sempre com unidade', () => {
    expect(formatarPaginas(184)).toBe('184 páginas')
    expect(formatarPaginas(1)).toBe('1 página')
  })

  it('data por extenso, sem zero à esquerda no dia', () => {
    expect(formatarData('2026-09-05T15:00:00')).toBe('5 de setembro de 2026')
  })
})
