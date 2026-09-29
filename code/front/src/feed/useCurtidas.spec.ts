import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'

import { ApiError } from '../services/api'
import type { Atividade, EstadoCurtida } from '../services/social'
import { useCurtidas } from './useCurtidas'

function atividade(parcial: Partial<Atividade> = {}): Atividade {
  return {
    id: 'a1',
    tipo: 'LEITURA_INICIADA',
    autor: { id: 'u1', username: 'dandaralp', nomeExibicao: 'Dandara Lopes', avatarUrl: null },
    livro: { id: 'l1', tipo: 'OFICIAL', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null },
    resenha: null,
    criadoEm: '2026-09-29T10:00:00Z',
    totalCurtidas: 4,
    totalComentarios: 2,
    curtidaPeloSolicitante: false,
    ...parcial,
  }
}

function promessa<T>() {
  let resolver!: (valor: T) => void
  let rejeitar!: (motivo: unknown) => void
  const pendente = new Promise<T>((resolve, reject) => {
    resolver = resolve
    rejeitar = reject
  })
  return { pendente, resolver, rejeitar }
}

const muitasRequisicoes = () => new ApiError('Muitas tentativas. Aguarde um instante.', 429, 'MUITAS_REQUISICOES')

function montar(inicial: Atividade = atividade()) {
  const curtidas: ReturnType<typeof promessa<EstadoCurtida>>[] = []
  const descurtidas: ReturnType<typeof promessa<void>>[] = []
  const pedidos: string[] = []
  const chaves: string[] = []
  const servico = {
    curtir: vi.fn((id: string, chave: string) => {
      pedidos.push(`curtir ${id}`)
      chaves.push(chave)
      const resposta = promessa<EstadoCurtida>()
      curtidas.push(resposta)
      return resposta.pendente
    }),
    descurtir: vi.fn((id: string, chave: string) => {
      pedidos.push(`descurtir ${id}`)
      chaves.push(chave)
      const resposta = promessa<void>()
      descurtidas.push(resposta)
      return resposta.pendente
    }),
  }
  const itens = shallowRef<Atividade[]>([inicial])
  const erro = shallowRef<string | null>(null)
  const { alternar, descartarPendentes } = useCurtidas(itens, erro, servico)
  return {
    itens,
    erro,
    alternar,
    descartarPendentes,
    pedidos,
    chaves,
    servico,
    curtidas,
    descurtidas,
    item: () => itens.value[0],
  }
}

describe('useCurtidas', () => {
  it('o item muda antes de o servidor responder', () => {
    const c = montar()

    c.alternar('a1')

    expect(c.item().curtidaPeloSolicitante).toBe(true)
    expect(c.item().totalCurtidas).toBe(5)
    expect(c.pedidos).toEqual(['curtir a1'])
  })

  it('descurtir muda na hora e o total não passa de zero', () => {
    const c = montar(atividade({ totalCurtidas: 0, curtidaPeloSolicitante: true }))

    c.alternar('a1')

    expect(c.item().curtidaPeloSolicitante).toBe(false)
    expect(c.item().totalCurtidas).toBe(0)
    expect(c.pedidos).toEqual(['descurtir a1'])
  })

  it('o total do servidor corrige o contador ao confirmar', async () => {
    const c = montar()

    c.alternar('a1')
    c.curtidas[0].resolver({ atividadeId: 'a1', curtida: true, totalCurtidas: 9 })
    await flushPromises()

    expect(c.item().curtidaPeloSolicitante).toBe(true)
    expect(c.item().totalCurtidas).toBe(9)
    expect(c.erro.value).toBeNull()
  })

  it('a falha volta ao último estado confirmado e mostra o erro', async () => {
    const c = montar()

    c.alternar('a1')
    c.curtidas[0].rejeitar(muitasRequisicoes())
    await flushPromises()

    expect(c.item().curtidaPeloSolicitante).toBe(false)
    expect(c.item().totalCurtidas).toBe(4)
    expect(c.erro.value).toBe('Muitas tentativas. Aguarde um instante.')
  })

  it('falha que não é da API mostra a mensagem padrão', async () => {
    const c = montar(atividade({ totalCurtidas: 5, curtidaPeloSolicitante: true }))

    c.alternar('a1')
    c.descurtidas[0].rejeitar(new Error('rede caiu'))
    await flushPromises()

    expect(c.item().curtidaPeloSolicitante).toBe(true)
    expect(c.item().totalCurtidas).toBe(5)
    expect(c.erro.value).toBe('Não foi possível acessar o servidor. Tente novamente.')
  })

  it('um novo toque limpa o erro anterior', async () => {
    const c = montar()

    c.alternar('a1')
    c.curtidas[0].rejeitar(muitasRequisicoes())
    await flushPromises()
    c.alternar('a1')

    expect(c.erro.value).toBeNull()
  })

  it('dois toques rápidos terminam descurtidos, com duas requisições em sequência', async () => {
    const c = montar()

    c.alternar('a1')
    c.alternar('a1')
    expect(c.item().curtidaPeloSolicitante).toBe(false)
    expect(c.item().totalCurtidas).toBe(4)
    expect(c.pedidos).toEqual(['curtir a1'])

    c.curtidas[0].resolver({ atividadeId: 'a1', curtida: true, totalCurtidas: 5 })
    await flushPromises()
    expect(c.pedidos).toEqual(['curtir a1', 'descurtir a1'])

    c.descurtidas[0].resolver()
    await flushPromises()

    expect(c.item().curtidaPeloSolicitante).toBe(false)
    expect(c.item().totalCurtidas).toBe(4)
    expect(c.pedidos).toHaveLength(2)
    expect(new Set(c.chaves).size).toBe(2)
    expect(c.erro.value).toBeNull()
  })

  it('três toques rápidos terminam curtidos, com uma requisição só', async () => {
    const c = montar()

    c.alternar('a1')
    c.alternar('a1')
    c.alternar('a1')
    expect(c.item().curtidaPeloSolicitante).toBe(true)

    c.curtidas[0].resolver({ atividadeId: 'a1', curtida: true, totalCurtidas: 5 })
    await flushPromises()

    expect(c.item().curtidaPeloSolicitante).toBe(true)
    expect(c.item().totalCurtidas).toBe(5)
    expect(c.pedidos).toEqual(['curtir a1'])
  })

  it('falha da requisição extra volta ao que o servidor já confirmou', async () => {
    const c = montar()

    c.alternar('a1')
    c.alternar('a1')
    c.curtidas[0].resolver({ atividadeId: 'a1', curtida: true, totalCurtidas: 5 })
    await flushPromises()
    c.descurtidas[0].rejeitar(muitasRequisicoes())
    await flushPromises()

    expect(c.item().curtidaPeloSolicitante).toBe(true)
    expect(c.item().totalCurtidas).toBe(5)
    expect(c.erro.value).toBe('Muitas tentativas. Aguarde um instante.')
  })

  it('um toque depois de convergir abre uma requisição nova', async () => {
    const c = montar()

    c.alternar('a1')
    c.curtidas[0].resolver({ atividadeId: 'a1', curtida: true, totalCurtidas: 5 })
    await flushPromises()
    c.alternar('a1')
    c.descurtidas[0].resolver()
    await flushPromises()

    expect(c.pedidos).toEqual(['curtir a1', 'descurtir a1'])
    expect(c.item().curtidaPeloSolicitante).toBe(false)
    expect(c.item().totalCurtidas).toBe(4)
  })

  it('descartar as pendências ignora a resposta antiga e não dispara nova requisição', async () => {
    const c = montar()

    c.alternar('a1')
    c.alternar('a1')
    c.descartarPendentes()
    c.itens.value = [atividade({ totalCurtidas: 7, curtidaPeloSolicitante: true })]
    c.curtidas[0].resolver({ atividadeId: 'a1', curtida: true, totalCurtidas: 5 })
    await flushPromises()

    expect(c.item().curtidaPeloSolicitante).toBe(true)
    expect(c.item().totalCurtidas).toBe(7)
    expect(c.pedidos).toEqual(['curtir a1'])
    expect(c.erro.value).toBeNull()
  })

  it('falha depois de descartar não reverte nem mostra erro', async () => {
    const c = montar()

    c.alternar('a1')
    c.descartarPendentes()
    c.itens.value = [atividade({ totalCurtidas: 7, curtidaPeloSolicitante: true })]
    c.curtidas[0].rejeitar(muitasRequisicoes())
    await flushPromises()

    expect(c.item().totalCurtidas).toBe(7)
    expect(c.erro.value).toBeNull()
  })

  it('depois de descartar, um toque novo volta a funcionar', () => {
    const c = montar()

    c.alternar('a1')
    c.descartarPendentes()
    c.alternar('a1')

    expect(c.pedidos).toEqual(['curtir a1', 'descurtir a1'])
  })

  it('atividade que saiu da lista é ignorada em silêncio', () => {
    const c = montar()
    c.itens.value = []

    c.alternar('a1')

    expect(c.pedidos).toEqual([])
    expect(c.erro.value).toBeNull()
  })
})
