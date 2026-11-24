import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import { listaComE, semAcento } from './assuntos'
import { useSeletorDeAssuntos } from './useSeletorDeAssuntos'

const LISTA = [
  { id: 'memorias', nome: 'Memórias' },
  { id: 'historia', nome: 'História' },
  { id: 'romance-historico', nome: 'Romance histórico' },
  { id: 'autoajuda', nome: 'Autoajuda' },
]

function servicoFalso() {
  return { listarAssuntos: vi.fn().mockResolvedValue(LISTA) }
}

describe('assuntos (helpers)', () => {
  it('semAcento compara sem acento e sem caixa', () => {
    expect(semAcento('  Histórico ')).toBe('historico')
  })

  it('listaComE junta com vírgulas e "e" antes do último', () => {
    expect(listaComE([])).toBe('')
    expect(listaComE(['História'])).toBe('História')
    expect(listaComE(['História', 'Memórias'])).toBe('História e Memórias')
    expect(listaComE(['Biografia', 'Crônica', 'História'])).toBe('Biografia, Crônica e História')
  })
})

describe('useSeletorDeAssuntos', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('carrega na primeira abertura, em ordem alfabética, e guarda a lista para as próximas', async () => {
    const servico = servicoFalso()
    const seletor = useSeletorDeAssuntos({ servico })

    seletor.abrir([])
    expect(seletor.estado.value).toBe('carregando')
    await vi.advanceTimersByTimeAsync(0)

    expect(seletor.estado.value).toBe('pronto')
    expect(seletor.assuntos.value.map((a) => a.nome)).toEqual(['Autoajuda', 'História', 'Memórias', 'Romance histórico'])
    seletor.abrir([])
    expect(servico.listarAssuntos).toHaveBeenCalledTimes(1)
  })

  it('a busca filtra sem diferenciar acento e não mexe na seleção', async () => {
    const seletor = useSeletorDeAssuntos({ servico: servicoFalso() })
    seletor.abrir([{ id: 'memorias', nome: 'Memórias' }])
    await vi.advanceTimersByTimeAsync(0)

    seletor.busca.value = 'hist'
    expect(seletor.filtrados.value.map((a) => a.nome)).toEqual(['História', 'Romance histórico'])
    expect(seletor.marcados.value).toEqual(['memorias'])
  })

  it('concluir devolve a seleção em ordem alfabética; limpar desmarca tudo', async () => {
    const seletor = useSeletorDeAssuntos({ servico: servicoFalso() })
    seletor.abrir([])
    await vi.advanceTimersByTimeAsync(0)

    seletor.alternar('memorias')
    seletor.alternar('historia')
    expect(seletor.concluir()).toEqual([
      { id: 'historia', nome: 'História' },
      { id: 'memorias', nome: 'Memórias' },
    ])
    seletor.limpar()
    expect(seletor.concluir()).toEqual([])
  })

  it('reabrir parte da seleção do formulário: o que foi marcado e descartado não volta', async () => {
    const seletor = useSeletorDeAssuntos({ servico: servicoFalso() })
    seletor.abrir([{ id: 'historia', nome: 'História' }])
    await vi.advanceTimersByTimeAsync(0)
    seletor.alternar('autoajuda')
    seletor.descartar()

    seletor.abrir([{ id: 'historia', nome: 'História' }])

    expect(seletor.marcados.value).toEqual(['historia'])
  })

  it('escolhido que saiu da lista curada continua com o nome até ser desmarcado', async () => {
    const seletor = useSeletorDeAssuntos({ servico: servicoFalso() })
    seletor.abrir([{ id: 'antigo', nome: 'Antigo' }])
    await vi.advanceTimersByTimeAsync(0)

    expect(seletor.concluir()).toEqual([{ id: 'antigo', nome: 'Antigo' }])
  })

  it('cold start aos 3 s, falha com timeout e Tentar de novo', async () => {
    const servico = servicoFalso()
    servico.listarAssuntos
      .mockImplementationOnce(
        () =>
          new Promise((_, rejeitar) =>
            setTimeout(() => rejeitar(new ApiError('O servidor demorou para responder.', 0, 'TIMEOUT')), 90_000),
          ),
      )
      .mockResolvedValueOnce(LISTA)
    const seletor = useSeletorDeAssuntos({ servico })

    seletor.abrir([])
    await vi.advanceTimersByTimeAsync(2_999)
    expect(seletor.coldStart.value).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(seletor.coldStart.value).toBe(true)
    await vi.advanceTimersByTimeAsync(90_000)

    expect(seletor.estado.value).toBe('erro')
    expect(seletor.coldStart.value).toBe(false)
    await seletor.carregar()
    expect(seletor.estado.value).toBe('pronto')
  })
})
