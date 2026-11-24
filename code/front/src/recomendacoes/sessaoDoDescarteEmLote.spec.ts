import { beforeEach, describe, expect, it } from 'vitest'

import { atualizarTokens, encerrarSessao, iniciarSessao } from '../session'
import { recusarPergunta, registrarDescarte, zerarSessaoDoDescarteEmLote } from './sessaoDoDescarteEmLote'

const ANA = { id: 'u-ana', username: 'ana', displayName: 'Ana' }
const BIA = { id: 'u-bia', username: 'bia', displayName: 'Bia' }
const TOKENS = { accessToken: 'acesso', refreshToken: 'renovacao' }

function descartarDuasVezes(): void {
  registrarDescarte('rio')
  registrarDescarte('rio')
}

describe('sessão do descarte em lote (RN-22.12/13)', () => {
  beforeEach(() => {
    localStorage.clear()
    encerrarSessao()
    iniciarSessao(TOKENS, ANA)
    zerarSessaoDoDescarteEmLote()
  })

  it('a pergunta cabe no terceiro descarte do mesmo livro, enquanto não for recusada', () => {
    descartarDuasVezes()
    expect(registrarDescarte('rio')).toBe(true)

    recusarPergunta('rio')
    expect(registrarDescarte('rio')).toBe(false)
  })

  it('outra conta na mesma aba não herda a contagem de quem saiu', () => {
    descartarDuasVezes()

    encerrarSessao()
    iniciarSessao(TOKENS, BIA)

    expect(registrarDescarte('rio')).toBe(false)
    expect(registrarDescarte('rio')).toBe(false)
    expect(registrarDescarte('rio')).toBe(true)
  })

  it('outra conta não herda a recusa, e sair e entrar com a mesma conta também zera', () => {
    descartarDuasVezes()
    registrarDescarte('rio')
    recusarPergunta('rio')

    encerrarSessao()
    iniciarSessao(TOKENS, ANA)

    descartarDuasVezes()
    expect(registrarDescarte('rio')).toBe(true)
  })

  it('renovar o token não zera nada', () => {
    descartarDuasVezes()

    atualizarTokens({ accessToken: 'acesso-novo', refreshToken: 'renovacao-nova' })

    expect(registrarDescarte('rio')).toBe(true)
  })
})
