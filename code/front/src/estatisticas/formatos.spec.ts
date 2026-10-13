import { describe, expect, it } from 'vitest'

import {
  diaEMes,
  formatarDecimal,
  formatarInteiro,
  formatarNotaMedia,
  hojeEmSaoPaulo,
  lerData,
  partesDoTempo,
  rotuloDoTempo,
} from './formatos'

describe('formatos das estatísticas', () => {
  it('milhar com ponto e decimal com vírgula', () => {
    expect(formatarInteiro(3818)).toBe('3.818')
    expect(formatarInteiro(13538)).toBe('13.538')
    expect(formatarDecimal(20.4)).toBe('20,4')
    expect(formatarDecimal(20)).toBe('20')
    expect(formatarNotaMedia(4)).toBe('4,0')
    expect(formatarNotaMedia(4.2)).toBe('4,2')
  })

  it('tempo em partes, com minutos de dois dígitos quando há horas', () => {
    expect(partesDoTempo(4280)).toEqual([
      { numero: '71', unidade: 'h' },
      { numero: '20', unidade: 'min' },
    ])
    expect(rotuloDoTempo(5285)).toBe('88 h 05 min')
    expect(rotuloDoTempo(180)).toBe('3 h 00 min')
    expect(rotuloDoTempo(45)).toBe('45 min')
    expect(rotuloDoTempo(0)).toBe('0 min')
  })

  it('datas sem passar pelo fuso do navegador', () => {
    expect(lerData('2023-11-12')).toEqual({ ano: 2023, mes: 11, dia: 12 })
    expect(diaEMes({ mes: 1, dia: 1 })).toBe('1º de janeiro')
    expect(diaEMes({ mes: 9, dia: 29 })).toBe('29 de setembro')
  })

  it('hoje é o dia de São Paulo, mesmo perto da virada em UTC', () => {
    // 02h UTC de 1º de janeiro ainda é 31 de dezembro em São Paulo.
    expect(hojeEmSaoPaulo(new Date('2027-01-01T02:00:00Z'))).toEqual({ ano: 2026, mes: 12, dia: 31 })
  })
})
