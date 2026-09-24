import { beforeEach, describe, expect, it } from 'vitest'

import {
  atualizarTokens,
  encerrarSessao,
  getRefreshToken,
  getToken,
  initializeSession,
  iniciarSessao,
  useSession,
} from './session'

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
    iniciarSessao({ accessToken: 'jwt-novo', refreshToken: 'renovacao' }, USUARIO)

    const { usuario, autenticado } = useSession()
    expect(autenticado.value).toBe(true)
    expect(usuario.value).toEqual(USUARIO)
    expect(getToken()).toBe('jwt-novo')
    expect(getRefreshToken()).toBe('renovacao')
    expect(localStorage.getItem('le-ai-sessao')).toBe(
      JSON.stringify({ token: 'jwt-novo', refreshToken: 'renovacao', usuario: USUARIO }),
    )
  })

  it('atualizarTokens troca o par e mantém o usuário', () => {
    iniciarSessao({ accessToken: 'jwt-velho', refreshToken: 'renovacao-velha' }, USUARIO)

    atualizarTokens({ accessToken: 'jwt-novo', refreshToken: 'renovacao-nova' })

    expect(getToken()).toBe('jwt-novo')
    expect(getRefreshToken()).toBe('renovacao-nova')
    expect(useSession().usuario.value).toEqual(USUARIO)
  })

  it('restaura sessão gravada antes de F-AUT, sem refresh', () => {
    localStorage.setItem('le-ai-sessao', JSON.stringify({ token: 'jwt-antigo', usuario: USUARIO }))

    initializeSession()

    expect(getToken()).toBe('jwt-antigo')
    expect(getRefreshToken()).toBeNull()
  })

  it('acompanha as outras abas: renovação e saída feitas lá chegam aqui', () => {
    initializeSession()
    const gravada = JSON.stringify({ token: 'jwt-da-outra-aba', refreshToken: 'r2', usuario: USUARIO })
    localStorage.setItem('le-ai-sessao', gravada)
    window.dispatchEvent(new StorageEvent('storage', { key: 'le-ai-sessao', newValue: gravada }))

    expect(getToken()).toBe('jwt-da-outra-aba')

    localStorage.removeItem('le-ai-sessao')
    window.dispatchEvent(new StorageEvent('storage', { key: 'le-ai-sessao', newValue: null }))

    expect(useSession().autenticado.value).toBe(false)
  })

  it('encerrarSessao limpa o estado e o localStorage', () => {
    iniciarSessao({ accessToken: 'jwt-novo', refreshToken: 'renovacao' }, USUARIO)

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
