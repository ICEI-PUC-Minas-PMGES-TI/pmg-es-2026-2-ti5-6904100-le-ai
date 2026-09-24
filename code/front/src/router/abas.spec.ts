import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, type RouteLocationNormalizedLoaded } from 'vue-router'

import { abaAtiva } from './abas'
import { routes } from './index'

const router = createRouter({ history: createMemoryHistory(), routes })

function abaDe(caminho: string) {
  // Mesma diferença de tipo de `index.spec.ts`: rota resolvida sempre tem nome aqui.
  return abaAtiva(router.resolve(caminho) as RouteLocationNormalizedLoaded)
}

describe('abaAtiva', () => {
  it.each([
    ['/estante', '/estante'],
    ['/descobrir', '/descobrir'],
    ['/descobrir/adicionar', '/descobrir'],
    ['/estante/adicionar/pessoal', '/estante'],
    ['/estante/adicionar/nao-encontrado?isbn=9788535914849', '/estante'],
    ['/livros/pessoal/l1', '/estante'],
    ['/livros/pessoal/l1?via=feed&referenciaId=a1', '/feed'],
    ['/livros/pessoal/l1/editar', '/estante'],
    ['/livros/l9', '/descobrir'],
    ['/livros/l9?origem=estante', '/estante'],
  ])('%s → %s', (caminho, esperada) => {
    expect(abaDe(caminho)).toBe(esperada)
  })

  it('a origem do cadastro só aceita estante ou descobrir', () => {
    expect(router.resolve('/feed/adicionar').name).toBeUndefined()
  })
})
