import { beforeEach, describe, expect, it } from 'vitest'

import { encerrarSessao, getToken, initializeSession, iniciarSessao, useSession } from './session'

const USUARIO = { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }

describe('session', () => {
  beforeEach(() => {
    localStorage.clear()
    encerrarSessao()
  })

  it('começa sem sessão e sem token', () => {
    const { usuario, autenticado } = useSession()

    expect(usuario.value).toBeNull()
    expect(autenticado.value).toBe(false)
    expect(getToken()).toBeNull()
  })

  it('iniciarSessao grava o token e o usuário, e persiste no localStorage', () => {
    iniciarSessao('jwt-novo', USUARIO)

    const { usuario, autenticado } = useSession()
    expect(autenticado.value).toBe(true)
    expect(usuario.value).toEqual(USUARIO)
    expect(getToken()).toBe('jwt-novo')
    expect(localStorage.getItem('le-ai-sessao')).toBe(
      JSON.stringify({ token: 'jwt-novo', usuario: USUARIO }),
    )
  })

  it('encerrarSessao limpa o estado e o localStorage', () => {
    iniciarSessao('jwt-novo', USUARIO)

    encerrarSessao()

    const { usuario, autenticado } = useSession()
    expect(autenticado.value).toBe(false)
    expect(usuario.value).toBeNull()
    expect(getToken()).toBeNull()
    expect(localStorage.getItem('le-ai-sessao')).toBeNull()
  })

  it('initializeSession restaura uma sessão salva ao recarregar a página', () => {
    localStorage.setItem('le-ai-sessao', JSON.stringify({ token: 'jwt-salvo', usuario: USUARIO }))

    initializeSession()

    expect(getToken()).toBe('jwt-salvo')
    expect(useSession().usuario.value).toEqual(USUARIO)
  })

  it('initializeSession ignora e limpa um valor corrompido, sem lançar', () => {
    localStorage.setItem('le-ai-sessao', '{ nao é json')

    expect(() => initializeSession()).not.toThrow()

    expect(getToken()).toBeNull()
    expect(localStorage.getItem('le-ai-sessao')).toBeNull()
  })

  it('initializeSession ignora e limpa um formato inesperado (chaves faltando)', () => {
    localStorage.setItem('le-ai-sessao', JSON.stringify({ token: 'jwt-solto' }))

    initializeSession()

    expect(getToken()).toBeNull()
    expect(localStorage.getItem('le-ai-sessao')).toBeNull()
  })

  it('initializeSession não faz nada quando não há sessão salva', () => {
    initializeSession()

    expect(getToken()).toBeNull()
    expect(useSession().autenticado.value).toBe(false)
  })
})
