import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import type { Leitura } from '../services/leitura'
import { ERROS_DE_ACAO, TEXTOS_DE_ACAO } from './textos'
import { useAcaoLeitura } from './useAcaoLeitura'

function leitura(parcial: Partial<Leitura> = {}): Leitura {
  return {
    id: 'lei-1',
    livroId: 'livro-1',
    status: 'LENDO',
    dataInicio: '2026-09-08',
    releitura: false,
    incompleta: false,
    retomavel: false,
    paginaAtual: 0,
    totalPaginas: 264,
    percentualConcluido: 0,
    vezesLido: 0,
    ultimaAtividadeEm: '2026-09-08T10:00:00Z',
    ...parcial,
  }
}

function servicoFalso() {
  return {
    adicionarEstante: vi.fn().mockResolvedValue({ livroId: 'livro-1', status: 'QUERO_LER' }),
    removerEstante: vi.fn().mockResolvedValue(undefined),
    iniciarLeitura: vi.fn().mockResolvedValue(leitura()),
    iniciarReleitura: vi.fn().mockResolvedValue(leitura({ status: 'RELENDO', releitura: true })),
    finalizarLeitura: vi.fn().mockResolvedValue(leitura({ status: 'LIDO', vezesLido: 1 })),
    abandonarLeitura: vi.fn().mockResolvedValue(leitura({ status: 'ABANDONADO', retomavel: true })),
    retomarLeitura: vi.fn().mockResolvedValue(leitura()),
  }
}

const semRede = () => new ApiError('Não foi possível acessar o servidor. Tente novamente.', 0, 'SERVICO_INDISPONIVEL')
const tempoEsgotado = () => new ApiError('O servidor demorou para responder. Tente novamente.', 0, 'TEMPO_LIMITE_EXCEDIDO')
const conflito = () => new ApiError('Transition not allowed', 409, 'TRANSICAO_DE_LEITURA_INVALIDA')

describe('useAcaoLeitura', () => {
  it('iniciar leitura manda a data e devolve o novo estado', async () => {
    const servico = servicoFalso()
    const acao = useAcaoLeitura(servico)

    const estado = await acao.executar({ acao: 'iniciarLeitura', livroId: 'livro-1', dataInicio: '2026-09-01' })

    expect(servico.iniciarLeitura).toHaveBeenCalledWith({ livroId: 'livro-1', dataInicio: '2026-09-01' }, expect.any(String))
    expect(estado).toEqual({ status: 'LENDO', leitura: leitura() })
    expect(acao.ultimoResultado.value).toEqual(estado)
    expect(acao.salvando.value).toBe(false)
    expect(acao.erro.value).toBeNull()
  })

  it('adicionar vira Quero ler sem leitura; remover tira da estante', async () => {
    const acao = useAcaoLeitura(servicoFalso())
    expect(await acao.executar({ acao: 'adicionarQueroLer', livroId: 'livro-1' })).toEqual({ status: 'QUERO_LER', leitura: null })
    expect(await acao.executar({ acao: 'removerDaEstante', livroId: 'livro-1' })).toEqual({ status: null, leitura: null })
  })

  it('abandonar releitura volta para Lido mesmo se a ocorrência vier marcada como incompleta', async () => {
    const servico = servicoFalso()
    servico.abandonarLeitura.mockResolvedValue(leitura({ status: 'LIDO', releitura: true, incompleta: true, vezesLido: 2 }))
    const estado = await useAcaoLeitura(servico).executar({ acao: 'abandonarReleitura', leituraId: 'lei-1' })
    expect(estado?.status).toBe('LIDO')
  })

  it('finalizar manda data de fim e fuso do dispositivo', async () => {
    const servico = servicoFalso()
    await useAcaoLeitura(servico).executar({
      acao: 'finalizarLeitura',
      leituraId: 'lei-1',
      dataFim: '2026-09-08',
      fusoHorarioDispositivo: 'America/Sao_Paulo',
    })
    expect(servico.finalizarLeitura).toHaveBeenCalledWith(
      'lei-1',
      { dataFim: '2026-09-08', fusoHorarioDispositivo: 'America/Sao_Paulo' },
      expect.any(String),
    )
  })

  it('reenvio da mesma intenção depois de falha de rede reaproveita a chave', async () => {
    const servico = servicoFalso()
    servico.iniciarLeitura.mockRejectedValueOnce(semRede())
    const acao = useAcaoLeitura(servico)
    const pedido = { acao: 'iniciarLeitura', livroId: 'livro-1', dataInicio: '2026-09-01' } as const

    expect(await acao.executar(pedido)).toBeNull()
    expect(acao.erro.value).toBe(TEXTOS_DE_ACAO.erroAoSalvar)
    await acao.executar(pedido)

    const [primeira, segunda] = servico.iniciarLeitura.mock.calls.map((chamada) => chamada[1])
    expect(primeira).toBe(segunda)
    expect(acao.erro.value).toBeNull()
  })

  it('timeout mostra a mensagem de salvar e também guarda a chave para o reenvio', async () => {
    const servico = servicoFalso()
    servico.abandonarLeitura.mockRejectedValueOnce(tempoEsgotado())
    const acao = useAcaoLeitura(servico)

    await acao.executar({ acao: 'abandonarLeitura', leituraId: 'lei-1' })
    expect(acao.erro.value).toBe(TEXTOS_DE_ACAO.erroAoSalvar)
    await acao.executar({ acao: 'abandonarLeitura', leituraId: 'lei-1' })

    const chaves = servico.abandonarLeitura.mock.calls.map((chamada) => chamada[1])
    expect(chaves[0]).toBe(chaves[1])
  })

  it('intenção diferente (outra data) gera chave nova', async () => {
    const servico = servicoFalso()
    servico.iniciarLeitura.mockRejectedValueOnce(semRede())
    const acao = useAcaoLeitura(servico)

    await acao.executar({ acao: 'iniciarLeitura', livroId: 'livro-1', dataInicio: '2026-09-01' })
    await acao.executar({ acao: 'iniciarLeitura', livroId: 'livro-1', dataInicio: '2026-09-02' })

    const chaves = servico.iniciarLeitura.mock.calls.map((chamada) => chamada[1])
    expect(chaves[0]).not.toBe(chaves[1])
  })

  it('depois de sucesso, repetir a mesma ação é intenção nova, com chave nova', async () => {
    const servico = servicoFalso()
    const acao = useAcaoLeitura(servico)

    await acao.executar({ acao: 'adicionarQueroLer', livroId: 'livro-1' })
    await acao.executar({ acao: 'adicionarQueroLer', livroId: 'livro-1' })

    const chaves = servico.adicionarEstante.mock.calls.map((chamada) => chamada[1])
    expect(chaves[0]).not.toBe(chaves[1])
  })

  it('409 mostra a mensagem de conflito em pt-BR e encerra a intenção', async () => {
    const servico = servicoFalso()
    servico.retomarLeitura.mockRejectedValueOnce(conflito())
    const acao = useAcaoLeitura(servico)

    await acao.executar({ acao: 'retomarLeitura', leituraId: 'lei-1' })
    expect(acao.erro.value).toBe(ERROS_DE_ACAO.conflito)
    await acao.executar({ acao: 'retomarLeitura', leituraId: 'lei-1' })

    const chaves = servico.retomarLeitura.mock.calls.map((chamada) => chamada[1])
    expect(chaves[0]).not.toBe(chaves[1])
  })

  it('400 de validação mostra a mensagem do servidor', async () => {
    const servico = servicoFalso()
    servico.iniciarLeitura.mockRejectedValueOnce(new ApiError('A data de início não pode ser futura.', 400, 'VALIDACAO'))
    const acao = useAcaoLeitura(servico)
    await acao.executar({ acao: 'iniciarLeitura', livroId: 'livro-1', dataInicio: '2026-09-01' })
    expect(acao.erro.value).toBe('A data de início não pode ser futura.')
  })

  it('ignora um segundo envio enquanto o primeiro salva', async () => {
    const servico = servicoFalso()
    let concluir: (valor: Leitura) => void = () => {}
    servico.iniciarLeitura.mockReturnValueOnce(new Promise<Leitura>((resolve) => (concluir = resolve)))
    const acao = useAcaoLeitura(servico)
    const pedido = { acao: 'iniciarLeitura', livroId: 'livro-1', dataInicio: '2026-09-01' } as const

    const primeira = acao.executar(pedido)
    expect(acao.salvando.value).toBe(true)
    expect(await acao.executar(pedido)).toBeNull()
    concluir(leitura())
    await primeira

    expect(servico.iniciarLeitura).toHaveBeenCalledTimes(1)
    expect(acao.salvando.value).toBe(false)
  })

  it('erro que não é da API sobe, sem virar mensagem genérica', async () => {
    const servico = servicoFalso()
    servico.removerEstante.mockRejectedValueOnce(new TypeError('quebrou'))
    const acao = useAcaoLeitura(servico)
    await expect(acao.executar({ acao: 'removerDaEstante', livroId: 'livro-1' })).rejects.toThrow('quebrou')
    expect(acao.salvando.value).toBe(false)
  })
})
