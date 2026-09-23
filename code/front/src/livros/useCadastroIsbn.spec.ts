import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Importacao } from '../services/acervo'
import { ApiError } from '../services/api'
import { useCadastroIsbn } from './useCadastroIsbn'

const ISBN = '978-85-359-1484-9'

function importacao(status: Importacao['status'], livroId: string | null = null): Importacao {
  return { importacaoId: 'imp-1', isbn: '9788535914849', status, livroId, permiteCadastroPessoal: status === 'nao_encontrado' }
}

function servicoFalso() {
  return {
    solicitarImportacao: vi.fn().mockResolvedValue({ tipo: 'aceita', importacaoId: 'imp-1' }),
    obterImportacao: vi.fn().mockResolvedValue(importacao('pendente')),
    reprocessarImportacao: vi.fn().mockResolvedValue(undefined),
  }
}

describe('useCadastroIsbn', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ISBN inválido não chama o servidor', async () => {
    const servico = servicoFalso()
    const cadastro = useCadastroIsbn({ servico })

    await cadastro.buscar('9788535914848')

    expect(cadastro.fase.value).toBe('invalido')
    expect(servico.solicitarImportacao).not.toHaveBeenCalled()
  })

  it('202 e consultas até concluida, com o livroId', async () => {
    const servico = servicoFalso()
    servico.obterImportacao
      .mockResolvedValueOnce(importacao('pendente'))
      .mockResolvedValueOnce(importacao('concluida', 'livro-1'))
    const cadastro = useCadastroIsbn({ servico })

    await cadastro.buscar(ISBN)
    expect(servico.solicitarImportacao).toHaveBeenCalledWith('9788535914849', expect.any(String))
    expect(cadastro.fase.value).toBe('buscando')

    await vi.advanceTimersByTimeAsync(2_000)
    expect(cadastro.fase.value).toBe('buscando')
    await vi.advanceTimersByTimeAsync(2_000)

    expect(cadastro.fase.value).toBe('encontrado')
    expect(cadastro.livroId.value).toBe('livro-1')
    expect(servico.obterImportacao).toHaveBeenCalledTimes(2)
  })

  it('reenviar o mesmo ISBN reaproveita a chave; outro ISBN gera chave nova (RNF-ERR-04)', async () => {
    const servico = servicoFalso()
    servico.solicitarImportacao.mockRejectedValue(new ApiError('Sem rede.', 0, 'SERVICO_INDISPONIVEL'))
    const cadastro = useCadastroIsbn({ servico })

    await cadastro.buscar(ISBN)
    await cadastro.buscar('9788535914849')
    await cadastro.buscar('978-0-306-40615-7')

    const chaves = servico.solicitarImportacao.mock.calls.map((chamada) => chamada[1])
    expect(chaves[0]).toBe(chaves[1])
    expect(chaves[2]).not.toBe(chaves[0])
    expect(cadastro.fase.value).toBe('semConexao')
  })

  it('409 com livroId é duplicata, não erro', async () => {
    const servico = servicoFalso()
    servico.solicitarImportacao.mockResolvedValue({ tipo: 'existente', livroId: 'livro-9' })
    const cadastro = useCadastroIsbn({ servico })

    await cadastro.buscar(ISBN)

    expect(cadastro.fase.value).toBe('duplicata')
    expect(cadastro.livroId.value).toBe('livro-9')
  })

  it('nao_encontrado encerra no estado da tela seguinte', async () => {
    const servico = servicoFalso()
    servico.obterImportacao.mockResolvedValue(importacao('nao_encontrado'))
    const cadastro = useCadastroIsbn({ servico })

    await cadastro.buscar(ISBN)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(cadastro.fase.value).toBe('naoEncontrado')
    expect(cadastro.isbn.value).toBe('9788535914849')
  })

  it('falha_transitoria fica indisponível e Tentar de novo reprocessa com chave própria', async () => {
    const servico = servicoFalso()
    servico.obterImportacao
      .mockResolvedValueOnce(importacao('falha_transitoria'))
      .mockResolvedValueOnce(importacao('concluida', 'livro-1'))
    const cadastro = useCadastroIsbn({ servico })

    await cadastro.buscar(ISBN)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(cadastro.fase.value).toBe('indisponivel')

    await cadastro.tentarDeNovo()
    expect(servico.reprocessarImportacao).toHaveBeenCalledWith('imp-1', expect.any(String))
    expect(servico.reprocessarImportacao.mock.calls[0]![1]).not.toBe(servico.solicitarImportacao.mock.calls[0]![1])
    await vi.advanceTimersByTimeAsync(2_000)
    expect(cadastro.fase.value).toBe('encontrado')
  })

  it('429 fica limitado com a mensagem do servidor (RNF-SEC-18)', async () => {
    const servico = servicoFalso()
    servico.solicitarImportacao.mockRejectedValue(
      new ApiError('Muitas requisições em pouco tempo. Tente novamente em instantes.', 429, 'MUITAS_REQUISICOES'),
    )
    const cadastro = useCadastroIsbn({ servico })

    await cadastro.buscar(ISBN)

    expect(cadastro.fase.value).toBe('limitado')
    expect(cadastro.mensagemDoServidor.value).toContain('Muitas requisições')
  })

  it('aos 8 segundos a espera fica lenta; aos 3 sem resposta do POST, cold start', async () => {
    const servico = servicoFalso()
    let responder: (valor: unknown) => void = () => {}
    servico.solicitarImportacao.mockReturnValue(new Promise((resolve) => (responder = resolve)))
    const cadastro = useCadastroIsbn({ servico })

    void cadastro.buscar(ISBN)
    await vi.advanceTimersByTimeAsync(3_000)
    expect(cadastro.coldStart.value).toBe(true)

    responder({ tipo: 'aceita', importacaoId: 'imp-1' })
    await vi.advanceTimersByTimeAsync(0)
    expect(cadastro.coldStart.value).toBe(false)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(cadastro.lento.value).toBe(true)
    expect(cadastro.fase.value).toBe('buscando')
  })

  it('consulta que falha continua tentando; depois de 45 consultas, indisponível', async () => {
    const servico = servicoFalso()
    servico.obterImportacao.mockRejectedValue(new ApiError('Sem rede.', 0, 'SERVICO_INDISPONIVEL'))
    const cadastro = useCadastroIsbn({ servico })

    await cadastro.buscar(ISBN)
    await vi.advanceTimersByTimeAsync(88_000)
    expect(cadastro.fase.value).toBe('buscando')
    await vi.advanceTimersByTimeAsync(2_000)

    expect(servico.obterImportacao).toHaveBeenCalledTimes(45)
    expect(cadastro.fase.value).toBe('indisponivel')
  })

  it('Cadastrar outro ISBN descarta a consulta em voo', async () => {
    const servico = servicoFalso()
    servico.obterImportacao.mockResolvedValue(importacao('concluida', 'livro-1'))
    const cadastro = useCadastroIsbn({ servico })

    await cadastro.buscar(ISBN)
    cadastro.recomecar()
    await vi.advanceTimersByTimeAsync(4_000)

    expect(cadastro.fase.value).toBe('ocioso')
    expect(servico.obterImportacao).not.toHaveBeenCalled()
  })
})
