import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import { ASSUNTOS, livro, pagina } from '../testes/massaDaBusca'
import { useBuscaDeLivros } from './useBuscaDeLivros'

function servicoFalso() {
  return {
    buscarLivros: vi.fn().mockResolvedValue(pagina([livro('l1', 'Ponciá Vicêncio')])),
    listarAssuntos: vi.fn().mockResolvedValue(ASSUNTOS),
  }
}

const falha = () => new ApiError('Falhou', 500, 'ERRO_INTERNO')

describe('useBuscaDeLivros', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('espera 350 ms sem digitar antes de buscar', async () => {
    const servico = servicoFalso()
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('co')
    busca.alterarConsulta('con')
    await vi.advanceTimersByTimeAsync(300)
    expect(servico.buscarLivros).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(60)
    expect(servico.buscarLivros).toHaveBeenCalledExactlyOnceWith({ q: 'con', assunto: null })
    expect(busca.estado.value).toBe('resultados')
  })

  it('com menos de 2 caracteres volta à aterrissagem sem buscar', async () => {
    const servico = servicoFalso()
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('c')
    await vi.advanceTimersByTimeAsync(400)

    expect(servico.buscarLivros).not.toHaveBeenCalled()
    expect(busca.estado.value).toBe('aterrissagem')
  })

  it('apara o texto e não repete a busca por um espaço no fim', async () => {
    const servico = servicoFalso()
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('  conceicao ')
    await vi.advanceTimersByTimeAsync(400)
    busca.alterarConsulta('  conceicao  ')
    await vi.advanceTimersByTimeAsync(400)

    expect(servico.buscarLivros).toHaveBeenCalledExactlyOnceWith({ q: 'conceicao', assunto: null })
  })

  it('assunto busca na hora, combina com o texto e sai ao escolher de novo', async () => {
    const servico = servicoFalso()
    const aoBuscar = vi.fn()
    const busca = useBuscaDeLivros({ servico, aoBuscar })

    busca.alternarAssunto('romance')
    await vi.advanceTimersByTimeAsync(0)
    expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: null, assunto: 'romance' })

    busca.alterarConsulta('vidas')
    await vi.advanceTimersByTimeAsync(400)
    expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: 'vidas', assunto: 'romance' })
    expect(aoBuscar).toHaveBeenLastCalledWith({ q: 'vidas', assunto: 'romance' })

    busca.alternarAssunto('romance')
    await vi.advanceTimersByTimeAsync(0)
    expect(busca.assunto.value).toBeNull()
    expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: 'vidas', assunto: null })
  })

  it('resposta de busca antiga não sobrescreve a atual', async () => {
    const servico = servicoFalso()
    let resolverAntiga: (valor: ReturnType<typeof pagina>) => void = () => undefined
    servico.buscarLivros
      .mockImplementationOnce(() => new Promise((resolver) => (resolverAntiga = resolver)))
      .mockResolvedValueOnce(pagina([livro('nova', 'Resultado novo')]))
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('antiga')
    await vi.advanceTimersByTimeAsync(400)
    busca.alterarConsulta('atual')
    await vi.advanceTimersByTimeAsync(400)
    expect(busca.livros.value.map((l) => l.id)).toEqual(['nova'])

    resolverAntiga(pagina([livro('velha', 'Resultado velho')]))
    await vi.advanceTimersByTimeAsync(0)
    expect(busca.livros.value.map((l) => l.id)).toEqual(['nova'])
  })

  it('sem resultado é vazio, falha é erro, e tentar de novo repete a busca', async () => {
    const servico = servicoFalso()
    servico.buscarLivros.mockRejectedValueOnce(falha()).mockResolvedValueOnce(pagina([]))
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('guimaraes rossa')
    await vi.advanceTimersByTimeAsync(400)
    expect(busca.estado.value).toBe('erro')

    busca.tentarDeNovo()
    await vi.advanceTimersByTimeAsync(0)
    expect(busca.estado.value).toBe('vazio')
  })

  it('acumula as páginas sem repetir id e para no fim', async () => {
    const servico = servicoFalso()
    servico.buscarLivros
      .mockResolvedValueOnce(pagina([livro('a', 'Um'), livro('b', 'Dois')], { totalItens: 3, totalPaginas: 2 }))
      .mockResolvedValueOnce(pagina([livro('b', 'Dois'), livro('c', 'Três')], { page: 2, totalItens: 3, totalPaginas: 2 }))
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('livro')
    await vi.advanceTimersByTimeAsync(400)
    expect(busca.temMais.value).toBe(true)

    await busca.carregarMais()
    expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: 'livro', assunto: null, page: 2 })
    expect(busca.livros.value.map((l) => l.id)).toEqual(['a', 'b', 'c'])
    expect(busca.temMais.value).toBe(false)

    await busca.carregarMais()
    expect(servico.buscarLivros).toHaveBeenCalledTimes(2)
  })

  it('a falha da página seguinte não apaga as anteriores', async () => {
    const servico = servicoFalso()
    servico.buscarLivros
      .mockResolvedValueOnce(pagina([livro('a', 'Um')], { totalItens: 2, totalPaginas: 2 }))
      .mockRejectedValueOnce(falha())
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('livro')
    await vi.advanceTimersByTimeAsync(400)
    await busca.carregarMais()

    expect(busca.falhouMais.value).toBe(true)
    expect(busca.estado.value).toBe('resultados')
    expect(busca.livros.value.map((l) => l.id)).toEqual(['a'])
  })

  it('depois de 3 s buscando avisa o cold start, e ele some com a resposta', async () => {
    const servico = servicoFalso()
    let responder: (valor: ReturnType<typeof pagina>) => void = () => undefined
    servico.buscarLivros.mockImplementationOnce(() => new Promise((resolver) => (responder = resolver)))
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('livro')
    await vi.advanceTimersByTimeAsync(400)
    expect(busca.coldStart.value).toBe(false)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(busca.coldStart.value).toBe(true)

    responder(pagina([livro('a', 'Um')]))
    await vi.advanceTimersByTimeAsync(0)
    expect(busca.coldStart.value).toBe(false)
    expect(busca.estado.value).toBe('resultados')
  })

  it('começa pela consulta da URL, sem esperar o debounce', async () => {
    const servico = servicoFalso()
    const busca = useBuscaDeLivros({ servico, inicial: { q: 'evaristo', assunto: 'conto' } })

    busca.iniciar()
    await vi.advanceTimersByTimeAsync(0)

    expect(servico.buscarLivros).toHaveBeenCalledExactlyOnceWith({ q: 'evaristo', assunto: 'conto' })
    expect(busca.assuntos.value).toEqual(ASSUNTOS)
  })

  it('limpar com assunto ativo mantém a busca pelo assunto; sem assunto, volta à aterrissagem', async () => {
    const servico = servicoFalso()
    const aoBuscar = vi.fn()
    const busca = useBuscaDeLivros({ servico, aoBuscar })

    busca.alternarAssunto('romance')
    busca.alterarConsulta('vidas')
    await vi.advanceTimersByTimeAsync(400)
    busca.limparConsulta()
    await vi.advanceTimersByTimeAsync(0)
    expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: null, assunto: 'romance' })

    busca.alternarAssunto('romance')
    await vi.advanceTimersByTimeAsync(0)
    expect(busca.estado.value).toBe('aterrissagem')
    expect(aoBuscar).toHaveBeenLastCalledWith({ q: null, assunto: null })
  })

  it('descartar cancela a busca que ainda esperava o debounce', async () => {
    const servico = servicoFalso()
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('livro')
    busca.descartar()
    await vi.advanceTimersByTimeAsync(400)

    expect(servico.buscarLivros).not.toHaveBeenCalled()
  })

  it('a página seguinte continua a busca feita, não o texto que ainda espera o debounce', async () => {
    const servico = servicoFalso()
    servico.buscarLivros.mockResolvedValueOnce(pagina([livro('a', 'Um')], { totalItens: 2, totalPaginas: 2 }))
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('ab')
    await vi.advanceTimersByTimeAsync(400)
    busca.alterarConsulta('abc')
    await busca.carregarMais()

    expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: 'ab', assunto: null, page: 2 })
  })

  it('os assuntos têm estado próprio, e a falha deles pode ser repetida', async () => {
    const servico = servicoFalso()
    servico.listarAssuntos.mockRejectedValueOnce(falha())
    const busca = useBuscaDeLivros({ servico })

    expect(busca.estadoDosAssuntos.value).toBe('carregando')
    busca.iniciar()
    await vi.advanceTimersByTimeAsync(0)
    expect(busca.estadoDosAssuntos.value).toBe('erro')

    await busca.carregarAssuntos()
    expect(busca.estadoDosAssuntos.value).toBe('pronto')
    expect(busca.assuntos.value).toEqual(ASSUNTOS)
  })

  it('erro que não é da API na página seguinte também aparece na tela', async () => {
    const servico = servicoFalso()
    servico.buscarLivros
      .mockResolvedValueOnce(pagina([livro('a', 'Um')], { totalItens: 2, totalPaginas: 2 }))
      .mockRejectedValueOnce(new SyntaxError('Unexpected token <'))
    const busca = useBuscaDeLivros({ servico })

    busca.alterarConsulta('livro')
    await vi.advanceTimersByTimeAsync(400)
    await expect(busca.carregarMais()).rejects.toThrow(SyntaxError)

    expect(busca.falhouMais.value).toBe(true)
    expect(busca.carregandoMais.value).toBe(false)
  })

  it('critérios vindos da URL com a tela aberta buscam na hora, e sem nada voltam à aterrissagem', async () => {
    const servico = servicoFalso()
    const busca = useBuscaDeLivros({ servico, inicial: { q: 'livro' } })
    busca.iniciar()
    await vi.advanceTimersByTimeAsync(0)
    expect(busca.estado.value).toBe('resultados')

    busca.aplicarCriterios({ q: null, assunto: null })
    expect(busca.estado.value).toBe('aterrissagem')
    expect(busca.consulta.value).toBe('')

    busca.aplicarCriterios({ q: null, assunto: 'terror' })
    await vi.advanceTimersByTimeAsync(0)
    expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: null, assunto: 'terror' })
  })

  it('a retentativa automática dos assuntos, a cada busca, não troca o aviso de falha pelo skeleton', async () => {
    const servico = servicoFalso()
    let responder: (valor: typeof ASSUNTOS) => void = () => undefined
    servico.listarAssuntos
      .mockRejectedValueOnce(falha())
      .mockImplementationOnce(() => new Promise((resolver) => (responder = resolver)))
    const busca = useBuscaDeLivros({ servico })

    busca.iniciar()
    await vi.advanceTimersByTimeAsync(0)
    expect(busca.estadoDosAssuntos.value).toBe('erro')

    busca.alterarConsulta('livro')
    await vi.advanceTimersByTimeAsync(400)
    expect(servico.listarAssuntos).toHaveBeenCalledTimes(2)
    expect(busca.estadoDosAssuntos.value).toBe('erro')

    responder(ASSUNTOS)
    await vi.advanceTimersByTimeAsync(0)
    expect(busca.estadoDosAssuntos.value).toBe('pronto')
  })
})
