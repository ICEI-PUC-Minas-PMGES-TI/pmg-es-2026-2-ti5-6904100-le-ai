import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import { livroOficial, paginaDeResenhas, resenha } from '../testes/massaDoLivro'
import { ESPERAS_DA_SINOPSE_MS, useLivroOficial } from './useLivroOficial'

function servicoFalso() {
  return {
    obterLivroOficial: vi.fn().mockResolvedValue(livroOficial()),
    listarResenhasDoLivro: vi.fn().mockResolvedValue(paginaDeResenhas([])),
  }
}

const pendente = { status: 'pendente' as const, texto: null }
const totalDasEsperas = ESPERAS_DA_SINOPSE_MS.reduce((soma, espera) => soma + espera, 0)

describe('useLivroOficial', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('carrega a página e as resenhas embutidas', async () => {
    const servico = servicoFalso()
    servico.obterLivroOficial.mockResolvedValue(
      livroOficial({ resenhas: paginaDeResenhas([resenha('r1', 'Marina', 'A terra.')], 'c1') }),
    )
    const pagina = useLivroOficial({ servico })

    await pagina.carregar('livro-1')

    expect(pagina.estado.value).toBe('pronta')
    expect(pagina.resenhas.value.map((r) => r.texto)).toEqual(['A terra.'])
    expect(pagina.temMaisResenhas.value).toBe(true)
  })

  it('o polling atualiza só a sinopse e para quando ela chega', async () => {
    const servico = servicoFalso()
    servico.obterLivroOficial
      .mockResolvedValueOnce(
        livroOficial({ sinopse: pendente, resenhas: paginaDeResenhas([resenha('r1', 'Marina', 'A terra.')]) }),
      )
      .mockResolvedValue(livroOficial({ resenhas: paginaDeResenhas([]) }))
    const pagina = useLivroOficial({ servico })

    await pagina.carregar('livro-1')
    await vi.advanceTimersByTimeAsync(2_000)

    expect(pagina.sinopse.value.status).toBe('disponivel')
    expect(pagina.resenhas.value.map((r) => r.texto)).toEqual(['A terra.'])
    await vi.advanceTimersByTimeAsync(totalDasEsperas)
    expect(servico.obterLivroOficial).toHaveBeenCalledTimes(2)
  })

  it('para no fim das esperas, sem polling infinito, e avisa que demorou', async () => {
    const servico = servicoFalso()
    servico.obterLivroOficial.mockResolvedValue(livroOficial({ sinopse: pendente }))
    const pagina = useLivroOficial({ servico })

    await pagina.carregar('livro-1')
    await vi.advanceTimersByTimeAsync(totalDasEsperas * 2)

    expect(servico.obterLivroOficial).toHaveBeenCalledTimes(1 + ESPERAS_DA_SINOPSE_MS.length)
    expect(pagina.sinopseDemorou.value).toBe(true)
  })

  it('descartar para o polling', async () => {
    const servico = servicoFalso()
    servico.obterLivroOficial.mockResolvedValue(livroOficial({ sinopse: pendente }))
    const pagina = useLivroOficial({ servico })

    await pagina.carregar('livro-1')
    pagina.descartar()
    await vi.advanceTimersByTimeAsync(totalDasEsperas)

    expect(servico.obterLivroOficial).toHaveBeenCalledTimes(1)
  })

  it('resenhas seguintes pelo cursor, acumuladas sem repetir', async () => {
    const servico = servicoFalso()
    servico.obterLivroOficial.mockResolvedValue(
      livroOficial({ resenhas: paginaDeResenhas([resenha('r1', 'Marina', 'Um.')], 'c1') }),
    )
    servico.listarResenhasDoLivro.mockResolvedValue(
      paginaDeResenhas([resenha('r1', 'Marina', 'Um.'), resenha('r2', 'Letícia', 'Dois.')]),
    )
    const pagina = useLivroOficial({ servico })

    await pagina.carregar('livro-1')
    await pagina.carregarResenhas()

    expect(servico.listarResenhasDoLivro).toHaveBeenCalledWith('livro-1', 'c1')
    expect(pagina.resenhas.value.map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(pagina.temMaisResenhas.value).toBe(false)
  })

  it('resenhas indisponíveis voltam pelo "Tentar de novo", da primeira página', async () => {
    const servico = servicoFalso()
    servico.obterLivroOficial.mockResolvedValue(livroOficial({ resenhas: null }))
    servico.listarResenhasDoLivro.mockResolvedValue(paginaDeResenhas([resenha('r1', 'Marina', 'Voltou.')]))
    const pagina = useLivroOficial({ servico })

    await pagina.carregar('livro-1')
    expect(pagina.resenhasIndisponiveis.value).toBe(true)

    await pagina.carregarResenhas()
    expect(servico.listarResenhasDoLivro).toHaveBeenCalledWith('livro-1', null)
    expect(pagina.resenhasIndisponiveis.value).toBe(false)
    expect(pagina.resenhas.value.map((r) => r.texto)).toEqual(['Voltou.'])
  })

  it('404 é livro não encontrado; outra falha é erro', async () => {
    const servico = servicoFalso()
    servico.obterLivroOficial
      .mockRejectedValueOnce(new ApiError('Não encontramos este livro.', 404, 'RECURSO_NAO_ENCONTRADO'))
      .mockRejectedValueOnce(new ApiError('Falhou', 500, 'ERRO_INTERNO'))
    const pagina = useLivroOficial({ servico })

    await pagina.carregar('livro-1')
    expect(pagina.estado.value).toBe('nao-encontrada')
    await pagina.carregar()
    expect(pagina.estado.value).toBe('erro')
  })

  it('trocar de livro descarta a resposta do anterior', async () => {
    const servico = servicoFalso()
    let responderAnterior: (valor: ReturnType<typeof livroOficial>) => void = () => undefined
    servico.obterLivroOficial
      .mockImplementationOnce(() => new Promise((resolver) => (responderAnterior = resolver)))
      .mockResolvedValueOnce(livroOficial({ id: 'livro-2', titulo: 'Vidas secas' }))
    const pagina = useLivroOficial({ servico })

    const anterior = pagina.carregar('livro-1')
    await pagina.carregar('livro-2')
    responderAnterior(livroOficial({ titulo: 'Torto Arado' }))
    await anterior

    expect(pagina.livro.value?.titulo).toBe('Vidas secas')
  })

  it('cold start vira aviso depois de 3 s, sem erro', async () => {
    const servico = servicoFalso()
    let responder: (valor: ReturnType<typeof livroOficial>) => void = () => undefined
    servico.obterLivroOficial.mockImplementationOnce(() => new Promise((resolver) => (responder = resolver)))
    const pagina = useLivroOficial({ servico })

    const carga = pagina.carregar('livro-1')
    await vi.advanceTimersByTimeAsync(3_000)
    expect(pagina.coldStart.value).toBe(true)

    responder(livroOficial())
    await carga
    expect(pagina.coldStart.value).toBe(false)
    expect(pagina.estado.value).toBe('pronta')
  })
})
