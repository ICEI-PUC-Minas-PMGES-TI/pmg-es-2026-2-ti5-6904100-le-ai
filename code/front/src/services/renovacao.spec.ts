import { beforeEach, describe, expect, it, vi } from 'vitest'

import { encerrarSessao, getRefreshToken, getToken, iniciarSessao, useSession } from '../session'
import { ApiError } from './api'
import { createRenovador } from './renovacao'

const USUARIO = { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }

/** Mutex em memória com a mesma semântica do `navigator.locks.request`: um por vez, em ordem. */
function criarLock() {
  let fila: Promise<unknown> = Promise.resolve()
  return <T>(tarefa: () => Promise<T>): Promise<T> => {
    const resultado = fila.then(tarefa)
    fila = resultado.catch(() => undefined)
    return resultado
  }
}

describe('createRenovador', () => {
  beforeEach(() => {
    localStorage.clear()
    encerrarSessao()
    iniciarSessao({ accessToken: 'jwt-a', refreshToken: 'renovacao-a' }, USUARIO)
  })

  it('troca o refresh da sessão por um par novo', async () => {
    const renovar = vi.fn().mockResolvedValue({ accessToken: 'jwt-b', refreshToken: 'renovacao-b' })
    const { renovar: renovarSessao } = createRenovador({ renovar, comLock: criarLock() })

    await expect(renovarSessao('jwt-a')).resolves.toBe(true)

    expect(renovar).toHaveBeenCalledWith('renovacao-a')
    expect(getToken()).toBe('jwt-b')
    expect(getRefreshToken()).toBe('renovacao-b')
  })

  it('401 na renovação encerra a sessão', async () => {
    const renovar = vi.fn().mockRejectedValue(new ApiError('expirou', 401, 'NAO_AUTENTICADO'))
    const { renovar: renovarSessao } = createRenovador({ renovar, comLock: criarLock() })

    await expect(renovarSessao('jwt-a')).resolves.toBe(false)

    expect(useSession().autenticado.value).toBe(false)
    expect(localStorage.getItem('le-ai-sessao')).toBeNull()
  })

  it('servidor fora não desloga: devolve false e mantém a sessão', async () => {
    const renovar = vi.fn().mockRejectedValue(new ApiError('fora', 0, 'SERVICO_INDISPONIVEL'))
    const { renovar: renovarSessao } = createRenovador({ renovar, comLock: criarLock() })

    await expect(renovarSessao('jwt-a')).resolves.toBe(false)

    expect(getToken()).toBe('jwt-a')
  })

  it('chamadas simultâneas na mesma aba compartilham uma renovação', async () => {
    const renovar = vi.fn().mockResolvedValue({ accessToken: 'jwt-b', refreshToken: 'renovacao-b' })
    const { renovar: renovarSessao } = createRenovador({ renovar, comLock: criarLock() })

    const resultados = await Promise.all([renovarSessao('jwt-a'), renovarSessao('jwt-a'), renovarSessao('jwt-a')])

    expect(resultados).toEqual([true, true, true])
    expect(renovar).toHaveBeenCalledTimes(1)
  })

  it('duas abas com o mesmo token: a segunda adota o que a primeira renovou, sem ir ao servidor', async () => {
    const lockCompartilhado = criarLock()
    const renovarNaAbaUm = vi.fn().mockResolvedValue({ accessToken: 'jwt-b', refreshToken: 'renovacao-b' })
    const renovarNaAbaDois = vi.fn()
    const abaUm = createRenovador({ renovar: renovarNaAbaUm, comLock: lockCompartilhado })
    const abaDois = createRenovador({ renovar: renovarNaAbaDois, comLock: lockCompartilhado })

    const [um, dois] = await Promise.all([abaUm.renovar('jwt-a'), abaDois.renovar('jwt-a')])

    expect([um, dois]).toEqual([true, true])
    expect(renovarNaAbaUm).toHaveBeenCalledTimes(1)
    // Sem isto a aba dois apresentaria `renovacao-a` já rotacionado, e o servidor derrubaria
    // todas as sessões por reuso.
    expect(renovarNaAbaDois).not.toHaveBeenCalled()
    expect(getToken()).toBe('jwt-b')
  })

  it('outra aba saiu enquanto esta esperava: não renova e encerra aqui também', async () => {
    localStorage.removeItem('le-ai-sessao')
    const renovar = vi.fn()
    const { renovar: renovarSessao } = createRenovador({ renovar, comLock: criarLock() })

    await expect(renovarSessao('jwt-a')).resolves.toBe(false)

    expect(renovar).not.toHaveBeenCalled()
    expect(useSession().autenticado.value).toBe(false)
  })

  it('sessão de antes de F-AUT, sem refresh, encerra em vez de renovar', async () => {
    localStorage.setItem('le-ai-sessao', JSON.stringify({ token: 'jwt-a', usuario: USUARIO }))
    const renovar = vi.fn()
    const { renovar: renovarSessao } = createRenovador({ renovar, comLock: criarLock() })

    await expect(renovarSessao('jwt-a')).resolves.toBe(false)

    expect(renovar).not.toHaveBeenCalled()
    expect(useSession().autenticado.value).toBe(false)
  })
})
