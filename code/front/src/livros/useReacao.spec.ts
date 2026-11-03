import { flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import type { EstadoDasReacoes } from '../services/leitura'
import { aplicarToque, MENSAGEM_DE_FALHA, useReacao } from './useReacao'

const SEM_REACAO: EstadoDasReacoes = { minhaReacao: null, curtidas: 12, descurtidas: 1 }

function servicoFalso() {
  return {
    reagir: vi.fn(),
    removerReacao: vi.fn(),
  }
}

describe('aplicarToque', () => {
  it('curtir sem reação soma uma curtida', () => {
    expect(aplicarToque(SEM_REACAO, 'curtida')).toEqual({ minhaReacao: 'curtida', curtidas: 13, descurtidas: 1 })
  })

  it('tocar no ativo retira', () => {
    expect(aplicarToque({ minhaReacao: 'curtida', curtidas: 13, descurtidas: 1 }, 'curtida')).toEqual(SEM_REACAO)
  })

  it('tocar no outro troca, mexendo nas duas contagens', () => {
    expect(aplicarToque({ minhaReacao: 'curtida', curtidas: 13, descurtidas: 1 }, 'descurtida')).toEqual({
      minhaReacao: 'descurtida',
      curtidas: 12,
      descurtidas: 2,
    })
  })

  it('nunca deixa contagem negativa', () => {
    expect(aplicarToque({ minhaReacao: 'descurtida', curtidas: 0, descurtidas: 0 }, 'descurtida')).toEqual({
      minhaReacao: null,
      curtidas: 0,
      descurtidas: 0,
    })
  })
})

describe('useReacao', () => {
  it('muda na hora e depois fica com as contagens do servidor', async () => {
    const servico = servicoFalso()
    servico.reagir.mockResolvedValue({ minhaReacao: 'curtida', curtidas: 20, descurtidas: 1 })
    const reacao = useReacao('r1', SEM_REACAO, { servico })

    reacao.tocar('curtida')

    expect(reacao.estado.value).toEqual({ minhaReacao: 'curtida', curtidas: 13, descurtidas: 1 })
    await flushPromises()
    expect(servico.reagir).toHaveBeenCalledWith('r1', 'curtida', undefined, expect.any(String))
    expect(reacao.estado.value).toEqual({ minhaReacao: 'curtida', curtidas: 20, descurtidas: 1 })
  })

  it('leva a via de RN-15 e retira pelo DELETE', async () => {
    const servico = servicoFalso()
    servico.removerReacao.mockResolvedValue({ minhaReacao: null, curtidas: 11, descurtidas: 1 })
    const via = { via: 'lista' as const, referenciaId: 'lista-1' }
    const reacao = useReacao('r1', { minhaReacao: 'curtida', curtidas: 12, descurtidas: 1 }, { servico, via })

    reacao.tocar('curtida')
    await flushPromises()

    expect(servico.removerReacao).toHaveBeenCalledWith('r1', via, expect.any(String))
    expect(reacao.estado.value.minhaReacao).toBeNull()
  })

  it.each([
    ['429', new ApiError('Muitas requisições.', 429, 'MUITAS_REQUISICOES')],
    ['503', new ApiError('Indisponível.', 503, 'SERVICO_INDISPONIVEL')],
    ['timeout', new DOMException('Tempo esgotado.', 'TimeoutError')],
  ])('falha %s volta ao estado anterior com a mensagem', async (_, falha) => {
    const servico = servicoFalso()
    servico.reagir.mockRejectedValue(falha)
    const reacao = useReacao('r1', SEM_REACAO, { servico })

    reacao.tocar('curtida')
    await flushPromises()

    expect(reacao.estado.value).toEqual(SEM_REACAO)
    expect(reacao.erro.value).toBe(MENSAGEM_DE_FALHA)
  })

  it('repetir a mesma intenção depois da falha reusa a chave', async () => {
    const servico = servicoFalso()
    servico.reagir.mockRejectedValueOnce(new ApiError('Indisponível.', 503, 'SERVICO_INDISPONIVEL'))
    servico.reagir.mockResolvedValueOnce({ minhaReacao: 'curtida', curtidas: 13, descurtidas: 1 })
    const reacao = useReacao('r1', SEM_REACAO, { servico })

    reacao.tocar('curtida')
    await flushPromises()
    reacao.tocar('curtida')
    await flushPromises()

    const [primeira, segunda] = servico.reagir.mock.calls.map((chamada) => chamada[3])
    expect(segunda).toBe(primeira)
    expect(reacao.erro.value).toBeNull()
  })

  it('toques rápidos geram uma requisição em voo e convergem para o último', async () => {
    const servico = servicoFalso()
    let liberar: (valor: EstadoDasReacoes) => void = () => {}
    servico.reagir.mockImplementationOnce(() => new Promise((resolve) => (liberar = resolve)))
    servico.reagir.mockResolvedValueOnce({ minhaReacao: 'descurtida', curtidas: 12, descurtidas: 2 })
    const reacao = useReacao('r1', SEM_REACAO, { servico })

    reacao.tocar('curtida')
    reacao.tocar('descurtida')
    expect(servico.reagir).toHaveBeenCalledTimes(1)

    liberar({ minhaReacao: 'curtida', curtidas: 13, descurtidas: 1 })
    await flushPromises()

    expect(servico.reagir).toHaveBeenCalledTimes(2)
    expect(servico.reagir.mock.calls[1][1]).toBe('descurtida')
    expect(reacao.estado.value).toEqual({ minhaReacao: 'descurtida', curtidas: 12, descurtidas: 2 })
  })
})
