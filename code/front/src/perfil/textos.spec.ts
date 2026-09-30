import { describe, expect, it } from 'vitest'

import { contagem, primeiroNome, tempoDeEspera } from './textos'

describe('primeiroNome', () => {
  it('pega a primeira palavra do nome de exibição', () => {
    expect(primeiroNome('Nadia Sampaio')).toBe('Nadia')
    expect(primeiroNome('  Caio  ')).toBe('Caio')
  })
})

describe('contagem', () => {
  it('singular só para um', () => {
    expect(contagem(1, 'solicitação', 'solicitações')).toBe('1 solicitação')
    expect(contagem(0, 'solicitação', 'solicitações')).toBe('0 solicitações')
  })
})

describe('tempoDeEspera', () => {
  const agora = new Date('2026-09-24T12:00:00Z')

  it.each([
    ['2026-09-24T11:59:40Z', 'agora'],
    ['2026-09-24T11:55:00Z', 'há 5 minutos'],
    ['2026-09-24T10:00:00Z', 'há 2 horas'],
    ['2026-09-21T12:00:00Z', 'há 3 dias'],
    ['2026-09-17T12:00:00Z', 'há 1 semana'],
    ['2026-07-24T12:00:00Z', 'há 2 meses'],
    ['2025-09-24T12:00:00Z', 'há 1 ano'],
  ])('%s vira "%s"', (criadaEm, esperado) => {
    expect(tempoDeEspera(criadaEm, agora)).toBe(esperado)
  })
})
