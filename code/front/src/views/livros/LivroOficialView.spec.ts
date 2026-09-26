import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService } from '../../services/acervo'
import { ApiError } from '../../services/api'
import { livroOficial, paginaDeResenhas, resenha } from '../../testes/massaDoLivro'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/acervo', () => ({
  acervoService: {
    obterLivroOficial: vi.fn(),
    listarResenhasDoLivro: vi.fn(),
    listarAssuntos: vi.fn().mockResolvedValue([]),
    buscarLivros: vi.fn(),
  },
}))

const servico = vi.mocked(acervoService)

describe('LivroOficialView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    servico.obterLivroOficial.mockReset().mockResolvedValue(livroOficial())
    servico.listarResenhasDoLivro.mockReset().mockResolvedValue(paginaDeResenhas([]))
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  async function abrir(caminho = '/livros/livro-1?origem=descobrir') {
    const montagem = await montarNaRota(caminho)
    await flushPromises()
    return montagem
  }

  it('pronta: título, metadados, sinopse, ficha e sem espaço reservado de outras features', async () => {
    const { wrapper } = await abrir()

    expect(servico.obterLivroOficial).toHaveBeenCalledWith('livro-1')
    expect(wrapper.get('article h1').text()).toBe('Torto Arado')
    expect(wrapper.text()).toContain('Todavia · 2019 · 264 páginas')
    expect(wrapper.text()).toContain('Bibiana e Belonísia crescem no interior da Bahia.')
    expect(wrapper.text()).toContain('9788588808911')
    expect(wrapper.text()).not.toContain('Sua avaliação')
    expect(wrapper.text()).not.toContain('Registrar progresso')
  })

  it('a aba ativa é a de origem', async () => {
    const { wrapper } = await abrir('/livros/livro-1?origem=estante')
    const ativo = wrapper.findAll('nav a').find((link) => link.classes().some((classe) => classe.includes('musgo')))
    expect(ativo?.text()).toContain('Estante')
  })

  it('omite autor e editora que faltam', async () => {
    servico.obterLivroOficial.mockResolvedValue(livroOficial({ autores: [], editora: null }))
    const { wrapper } = await abrir()

    const rotulos = wrapper.findAll('dt').map((dt) => dt.text())
    expect(rotulos).toEqual(['ISBN'])
    expect(wrapper.text()).toContain('2019 · 264 páginas')
  })

  it('sinopse pendente é skeleton; o polling troca pelo texto sem mexer nas resenhas', async () => {
    servico.obterLivroOficial
      .mockResolvedValueOnce(
        livroOficial({
          sinopse: { status: 'pendente', texto: null },
          resenhas: paginaDeResenhas([resenha('r1', 'Marina', 'A terra.')]),
        }),
      )
      .mockResolvedValue(livroOficial({ resenhas: paginaDeResenhas([]) }))
    const { wrapper } = await abrir()

    expect(wrapper.text()).not.toContain('Bibiana')
    expect(wrapper.find('.entrada[aria-hidden="true"]').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(2_000)
    await flushPromises()

    expect(wrapper.text()).toContain('Bibiana e Belonísia crescem no interior da Bahia.')
    expect(wrapper.text()).toContain('A terra.')
  })

  it('sinopse ausente é texto neutro, sem erro', async () => {
    servico.obterLivroOficial.mockResolvedValue(livroOficial({ sinopse: { status: 'ausente', texto: null } }))
    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain('Este livro ainda não tem sinopse no acervo.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('sem resenhas diz que é para você, não que o livro não tem', async () => {
    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain('Nenhuma resenha ainda')
    expect(wrapper.text()).toContain('Ninguém que você segue escreveu sobre este livro.')
  })

  it('"Ver todas as resenhas" traz a página seguinte', async () => {
    servico.obterLivroOficial.mockResolvedValue(
      livroOficial({ resenhas: paginaDeResenhas([resenha('r1', 'Marina', 'Primeira.')], 'c1') }),
    )
    servico.listarResenhasDoLivro.mockResolvedValue(paginaDeResenhas([resenha('r2', 'Letícia', 'Segunda.')]))
    const { wrapper } = await abrir()

    await wrapper.findAll('button').find((botao) => botao.text() === 'Ver todas as resenhas')!.trigger('click')
    await flushPromises()

    expect(servico.listarResenhasDoLivro).toHaveBeenCalledWith('livro-1', 'c1')
    expect(wrapper.text()).toContain('Primeira.')
    expect(wrapper.text()).toContain('Segunda.')
  })

  it('resenhas indisponíveis: a página abre e "Tentar de novo" pede as resenhas', async () => {
    servico.obterLivroOficial.mockResolvedValue(livroOficial({ resenhas: null }))
    servico.listarResenhasDoLivro.mockResolvedValue(paginaDeResenhas([resenha('r1', 'Marina', 'Voltou.')]))
    const { wrapper } = await abrir()

    expect(wrapper.get('article h1').text()).toBe('Torto Arado')
    expect(wrapper.text()).toContain('Não foi possível carregar as resenhas.')
    await wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Voltou.')
  })

  it('falha da página inteira mostra o bloco de erro e tenta de novo', async () => {
    servico.obterLivroOficial
      .mockRejectedValueOnce(new ApiError('Falhou', 500, 'ERRO_INTERNO'))
      .mockResolvedValue(livroOficial())
    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain('Não foi possível abrir este livro')
    await wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(wrapper.get('article h1').text()).toBe('Torto Arado')
  })

  it('404 diz que o livro não foi encontrado', async () => {
    servico.obterLivroOficial.mockRejectedValue(
      new ApiError('Não encontramos este livro.', 404, 'RECURSO_NAO_ENCONTRADO'),
    )
    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain('Não encontramos este livro')
  })

  it('carregando com cold start avisa, sem erro', async () => {
    let responder: (valor: ReturnType<typeof livroOficial>) => void = () => undefined
    servico.obterLivroOficial.mockImplementationOnce(() => new Promise((resolver) => (responder = resolver)))
    const { wrapper } = await abrir()

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(3_000)
    expect(wrapper.get('[role="status"]').text()).toBe('O servidor está iniciando. Isso pode levar alguns segundos.')

    responder(livroOficial())
    await flushPromises()
    expect(wrapper.get('article h1').text()).toBe('Torto Arado')
  })

  it('trocar de livro na mesma rota recarrega a página', async () => {
    servico.obterLivroOficial.mockImplementation(async (id: string) =>
      livroOficial({ id, titulo: id === 'livro-2' ? 'Vidas secas' : 'Torto Arado' }),
    )
    const { wrapper, router } = await abrir()

    await router.push('/livros/livro-2?origem=descobrir')
    await flushPromises()

    expect(servico.obterLivroOficial).toHaveBeenLastCalledWith('livro-2')
    expect(wrapper.get('article h1').text()).toBe('Vidas secas')
  })
})
