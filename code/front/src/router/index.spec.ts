import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, START_LOCATION, type RouteLocationNormalized } from 'vue-router'

import { encerrarSessao, iniciarSessao } from '../session'
import { guardaDeSessao, reagirAoFimDaSessao, routes } from './index'

const USUARIO = { id: 'u1', username: 'marinableu', displayName: 'Marina Beltrão' }

/**
 * `guardaDeSessao` isolada, sem montar componente nenhum: usa um router de teste só para
 * resolver `to` de verdade (com o `meta` mesclado da árvore de rotas), no molde do que a
 * guarda recebe em produção.
 */
const router = createRouter({ history: createMemoryHistory(), routes })

/**
 * `router.resolve()` devolve `RouteLocationResolved` (`name` pode ser `null`); a guarda espera
 * `RouteLocationNormalized` (`name` nunca nulo). Toda rota nomeada aqui sempre resolve com nome,
 * então o cast é seguro — é diferença de tipo, não de valor em tempo de execução.
 */
function resolverPara(caminho: string): RouteLocationNormalized {
  return router.resolve(caminho) as RouteLocationNormalized
}

describe('guardaDeSessao', () => {
  beforeEach(() => {
    localStorage.clear()
    encerrarSessao()
  })

  it('rota com requerSessao e sem token redireciona para /login preservando o destino', () => {
    const to = resolverPara('/feed')

    const resultado = guardaDeSessao(to, START_LOCATION, () => {})

    expect(resultado).toEqual({ path: '/login', query: { destino: '/feed' } })
  })

  it('rota com requerSessao e com token deixa passar', () => {
    iniciarSessao({ accessToken: 'jwt', refreshToken: 'renovacao' }, USUARIO)
    const to = resolverPara('/estante')

    expect(guardaDeSessao(to, START_LOCATION, () => {})).toBe(true)
  })

  it('/login com sessão ativa redireciona para /estante', () => {
    iniciarSessao({ accessToken: 'jwt', refreshToken: 'renovacao' }, USUARIO)
    const to = resolverPara('/login')

    expect(guardaDeSessao(to, START_LOCATION, () => {})).toEqual({ path: '/estante' })
  })

  it('/login sem sessão deixa passar', () => {
    const to = resolverPara('/login')

    expect(guardaDeSessao(to, START_LOCATION, () => {})).toBe(true)
  })

  it('sessão que acaba com a tela aberta leva ao login preservando o destino', async () => {
    iniciarSessao({ accessToken: 'jwt', refreshToken: 'renovacao' }, USUARIO)
    const alvo = createRouter({ history: createMemoryHistory(), routes })
    alvo.beforeEach(guardaDeSessao)
    reagirAoFimDaSessao(alvo)
    await alvo.push('/feed')

    encerrarSessao()
    await flushPromises()

    expect(alvo.currentRoute.value.path).toBe('/login')
    expect(alvo.currentRoute.value.query).toEqual({ destino: '/feed' })
  })

  it('/cadastro com sessão ativa redireciona para /estante', () => {
    iniciarSessao({ accessToken: 'jwt', refreshToken: 'renovacao' }, USUARIO)
    const to = resolverPara('/cadastro')

    expect(guardaDeSessao(to, START_LOCATION, () => {})).toEqual({ path: '/estante' })
  })
})
