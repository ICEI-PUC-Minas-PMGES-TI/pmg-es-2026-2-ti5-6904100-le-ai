import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import type { LeituraService, MinhaAvaliacao, Nota } from '../services/leitura'
import { useMinhaAvaliacao } from './useMinhaAvaliacao'

function nota(valor: number, livroId = 'l1'): Nota {
  return { livroId, valor, criadoEm: '2026-09-12T12:00:00Z', atualizadoEm: '2026-09-12T12:00:00Z' }
}

function servicoFalso(inicial: MinhaAvaliacao = { livroId: 'l1', nota: null, resenha: null }) {
  return {
    obterMinhaAvaliacao: vi.fn().mockResolvedValue(inicial),
    salvarNota: vi.fn<LeituraService['salvarNota']>(async (livroId, valor) => nota(valor, livroId)),
    excluirNota: vi.fn().mockResolvedValue(undefined),
    salvarResenha: vi.fn<LeituraService['salvarResenha']>(async (livroId, texto, spoiler) => ({
      id: 'r1',
      usuarioId: 'u1',
      livroId,
      texto,
      spoiler,
      criadoEm: '2026-09-12T12:00:00Z',
      atualizadoEm: '2026-09-12T12:00:00Z',
    })),
    excluirResenha: vi.fn().mockResolvedValue(undefined),
    listarResenhasPerfil: vi.fn(),
    listarEstante: vi.fn(),
    listarEstantePerfil: vi.fn(),
    consultarItemEstante: vi.fn(),
    adicionarEstante: vi.fn(),
    removerEstante: vi.fn(),
    iniciarLeitura: vi.fn(),
    iniciarReleitura: vi.fn(),
    finalizarLeitura: vi.fn(),
    abandonarLeitura: vi.fn(),
    retomarLeitura: vi.fn(),
    detalharLeitura: vi.fn(),
    consultarConclusoes: vi.fn(),
    registrarProgresso: vi.fn(),
    listarProgresso: vi.fn(),
    excluirTrechoProgresso: vi.fn(),
    reagir: vi.fn(),
    removerReacao: vi.fn(),
    listarFrases: vi.fn(),
    criarFrase: vi.fn(),
    excluirFrase: vi.fn(),
  } satisfies LeituraService
}

describe('useMinhaAvaliacao', () => {
  it('carrega a avaliação do livro', async () => {
    const servico = servicoFalso({ livroId: 'l1', nota: nota(3), resenha: null })
    const avaliacao = useMinhaAvaliacao({ servico })

    await avaliacao.carregar('l1')

    expect(servico.obterMinhaAvaliacao).toHaveBeenCalledWith('l1')
    expect(avaliacao.estado.value).toBe('pronta')
    expect(avaliacao.nota.value?.valor).toBe(3)
  })

  it('falha ao carregar vira estado de erro, sem derrubar quem usa', async () => {
    const servico = servicoFalso()
    servico.obterMinhaAvaliacao.mockRejectedValue(new ApiError('x', 503, 'SERVICO_INDISPONIVEL'))
    const avaliacao = useMinhaAvaliacao({ servico })

    await avaliacao.carregar('l1')

    expect(avaliacao.estado.value).toBe('erro')
  })

  it('reenviar a mesma nota repete a chave; outro valor é outra chave', async () => {
    const servico = servicoFalso()
    servico.salvarNota.mockRejectedValueOnce(new ApiError('x', 500, 'ERRO_INTERNO'))
    const avaliacao = useMinhaAvaliacao({ servico })
    await avaliacao.carregar('l1')

    await expect(avaliacao.salvarNota(4)).rejects.toBeInstanceOf(ApiError)
    await avaliacao.salvarNota(4)
    await avaliacao.salvarNota(2.5)

    const chaves = servico.salvarNota.mock.calls.map((chamada) => chamada[2])
    expect(chaves[0]).toBe(chaves[1])
    expect(chaves[2]).not.toBe(chaves[0])
    expect(avaliacao.nota.value?.valor).toBe(2.5)
  })

  // A chave antiga só repetiria no servidor a resposta guardada, sem gravar a nota de novo.
  it('depois de remover, dar a mesma nota de novo usa uma chave nova', async () => {
    const servico = servicoFalso()
    const avaliacao = useMinhaAvaliacao({ servico })
    await avaliacao.carregar('l1')

    await avaliacao.salvarNota(4)
    await avaliacao.removerNota()
    await avaliacao.salvarNota(4)
    await avaliacao.removerNota()

    const salvar = servico.salvarNota.mock.calls.map((chamada) => chamada[2])
    const remover = servico.excluirNota.mock.calls.map((chamada) => chamada[1])
    expect(salvar[1]).not.toBe(salvar[0])
    expect(remover[1]).not.toBe(remover[0])
  })

  it('excluir e publicar o mesmo texto de novo usa uma chave nova', async () => {
    const servico = servicoFalso()
    const avaliacao = useMinhaAvaliacao({ servico })
    await avaliacao.carregar('l1')

    await avaliacao.salvarResenha('Ótimo.', false)
    await avaliacao.excluirResenha()
    await avaliacao.salvarResenha('Ótimo.', false)

    const chaves = servico.salvarResenha.mock.calls.map((chamada) => chamada[3])
    expect(chaves[1]).not.toBe(chaves[0])
  })

  // Com a carga falha, a resenha é desconhecida: nula liberaria o editor para sobrescrevê-la.
  it('escrever sem a avaliação carregada recarrega do servidor em vez de declarar pronta', async () => {
    const resenha = {
      id: 'r1',
      usuarioId: 'u1',
      livroId: 'l1',
      texto: 'Já escrita.',
      spoiler: false,
      criadoEm: '2026-09-12T12:00:00Z',
      atualizadoEm: '2026-09-12T12:00:00Z',
    }
    const servico = servicoFalso({ livroId: 'l1', nota: nota(4), resenha })
    servico.obterMinhaAvaliacao.mockRejectedValueOnce(new ApiError('x', 503, 'SERVICO_INDISPONIVEL'))
    const avaliacao = useMinhaAvaliacao({ servico })
    await avaliacao.carregar('l1')
    expect(avaliacao.estado.value).toBe('erro')

    await avaliacao.salvarNota(4)
    await vi.waitFor(() => expect(avaliacao.estado.value).toBe('pronta'))

    expect(servico.obterMinhaAvaliacao).toHaveBeenCalledTimes(2)
    expect(avaliacao.resenha.value?.texto).toBe('Já escrita.')
  })

  it('remover deixa a nota nula e preserva a resenha', async () => {
    const resenha = {
      id: 'r1',
      usuarioId: 'u1',
      livroId: 'l1',
      texto: 'Bom.',
      spoiler: false,
      criadoEm: '2026-09-12T12:00:00Z',
      atualizadoEm: '2026-09-12T12:00:00Z',
    }
    const servico = servicoFalso({ livroId: 'l1', nota: nota(3), resenha })
    const avaliacao = useMinhaAvaliacao({ servico })
    await avaliacao.carregar('l1')

    await avaliacao.removerNota()

    expect(servico.excluirNota).toHaveBeenCalledWith('l1', expect.any(String))
    expect(avaliacao.nota.value).toBeNull()
    expect(avaliacao.resenha.value?.texto).toBe('Bom.')
  })

  // Trocar de livro na mesma rota: a resposta atrasada do livro anterior não pode vencer.
  it('descarta a resposta atrasada do livro anterior', async () => {
    let responderAntigo: (valor: MinhaAvaliacao) => void = () => undefined
    const servico = servicoFalso()
    servico.obterMinhaAvaliacao
      .mockImplementationOnce(() => new Promise((resolver) => (responderAntigo = resolver)))
      .mockResolvedValueOnce({ livroId: 'l2', nota: nota(5, 'l2'), resenha: null })
    const avaliacao = useMinhaAvaliacao({ servico })

    const antigo = avaliacao.carregar('l1')
    await avaliacao.carregar('l2')
    responderAntigo({ livroId: 'l1', nota: nota(1), resenha: null })
    await antigo

    expect(avaliacao.avaliacao.value?.livroId).toBe('l2')
    expect(avaliacao.nota.value?.valor).toBe(5)
  })
})
