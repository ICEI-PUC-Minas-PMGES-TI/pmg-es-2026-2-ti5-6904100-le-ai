import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService, type LivroDaSerieResumo } from '../../services/acervo'
import { ApiError } from '../../services/api'
import { livro, pagina } from '../../testes/massaDaBusca'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/acervo', () => ({
  acervoService: {
    obterAutor: vi.fn(),
    obterEditora: vi.fn(),
    obterSerie: vi.fn(),
    // O "Buscar no Descobrir" monta a aba Descobrir, que pede os assuntos.
    listarAssuntos: vi.fn().mockResolvedValue([]),
    buscarLivros: vi.fn(),
  },
}))

const servico = vi.mocked(acervoService)

const LIVROS = pagina([livro('olhos', "Olhos d'Água"), livro('becos', 'Becos da Memória')], { totalItens: 2 })

function autor(extras: Partial<Awaited<ReturnType<typeof acervoService.obterAutor>>> = {}) {
  return { id: 'evaristo', nome: 'Conceição Evaristo', biografia: 'Escritora mineira.', livros: LIVROS, ...extras }
}

function volume(id: string, titulo: string, numeroNaSerie: number | null): LivroDaSerieResumo {
  return { ...livro(id, titulo, { autores: [{ id: 'verissimo', nome: 'Erico Verissimo' }] }), numeroNaSerie }
}

async function abrir(caminho: string) {
  const montagem = await montarNaRota(caminho)
  await flushPromises()
  return montagem
}

describe('PaginaDeCatalogoView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    servico.obterAutor.mockReset().mockResolvedValue(autor())
    servico.obterEditora.mockReset().mockResolvedValue({ id: 'pallas', nome: 'Pallas', livros: LIVROS })
    servico.obterSerie.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('autor: nome, contagem, biografia com a fonte e os livros com link para a página do livro', async () => {
    const { wrapper } = await abrir('/descobrir/autores/evaristo')

    expect(servico.obterAutor).toHaveBeenCalledWith('evaristo', 1)
    expect(wrapper.get('article h1').text()).toBe('Conceição Evaristo')
    expect(wrapper.text()).toContain('2 livros no acervo')
    expect(wrapper.text()).toContain('Biografia')
    expect(wrapper.text()).toContain('Escritora mineira.')
    expect(wrapper.text()).toContain('Fonte: OpenLibrary')
    expect(wrapper.findAll('article h3 a').map((link) => link.attributes('href'))).toEqual([
      '/livros/olhos?origem=descobrir',
      '/livros/becos?origem=descobrir',
    ])
    const ativo = wrapper.findAll('nav a').find((link) => link.classes().some((classe) => classe.includes('musgo')))
    expect(ativo?.text()).toContain('Descobrir')
  })

  it('autor sem biografia: a seção não existe, nem o título', async () => {
    servico.obterAutor.mockResolvedValue(autor({ biografia: null }))
    const { wrapper } = await abrir('/descobrir/autores/evaristo')

    expect(wrapper.text()).not.toContain('Biografia')
    expect(wrapper.text()).not.toContain('OpenLibrary')
    expect(wrapper.text()).toContain('Livros')
  })

  it('editora: contagem no singular e sem bloco próprio', async () => {
    servico.obterEditora.mockResolvedValue({ id: 'pallas', nome: 'Pallas', livros: pagina([livro('olhos', 'Olhos')]) })
    const { wrapper } = await abrir('/descobrir/editoras/pallas')

    expect(servico.obterEditora).toHaveBeenCalledWith('pallas', 1)
    expect(wrapper.get('article h1').text()).toBe('Pallas')
    expect(wrapper.text()).toContain('1 livro no acervo')
    expect(wrapper.text()).not.toContain('Biografia')
  })

  it('série: autoria com link, "Livro N" pela ordem e os sem número no fim', async () => {
    servico.obterSerie.mockResolvedValue({
      id: 'tempo',
      nome: 'O Tempo e o Vento',
      autores: [{ id: 'verissimo', nome: 'Erico Verissimo' }],
      livros: {
        ...pagina([]),
        itens: [volume('v1', 'O Continente', 1), volume('v3', 'O Arquipélago', 3), volume('extra', 'Ana Terra', null)],
        totalItens: 3,
      },
    })
    const { wrapper } = await abrir('/descobrir/series/tempo')

    expect(wrapper.get('article header a').attributes('href')).toBe('/descobrir/autores/verissimo')
    expect(wrapper.get('article header').text()).toContain('de Erico Verissimo')
    // A linha `Livro N` vem logo antes do título, no mesmo bloco de texto do card.
    const linhas = wrapper.findAll('article li article h3').map((titulo) => [
      titulo.element.previousElementSibling?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      titulo.text(),
    ])
    expect(linhas).toEqual([
      ['Livro 1', 'O Continente'],
      ['Livro 3', 'O Arquipélago'],
      [null, 'Ana Terra'],
    ])
    expect(wrapper.text()).toContain('Sem número na série')
    expect(wrapper.text().indexOf('Sem número na série')).toBeLessThan(wrapper.text().indexOf('Ana Terra'))
  })

  it('sem livros: sem contagem nem autoria, com o convite ao Descobrir', async () => {
    servico.obterSerie.mockResolvedValue({
      id: 'tempo',
      nome: 'O Tempo e o Vento',
      autores: [{ id: 'verissimo', nome: 'Erico Verissimo' }],
      livros: { ...pagina([]), itens: [] },
    })
    const { wrapper, router } = await abrir('/descobrir/series/tempo')

    expect(wrapper.text()).toContain('Nenhum livro no acervo')
    expect(wrapper.text()).toContain('Os livros de O Tempo e o Vento não estão no acervo no momento.')
    expect(wrapper.text()).not.toContain('livros no acervo')
    expect(wrapper.text()).not.toContain('de Erico Verissimo')
    await wrapper.findAll('button').find((botao) => botao.text() === 'Buscar no Descobrir')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/descobrir')
  })

  it('a página seguinte entra no fim; a falha mantém os carregados e "Tentar de novo" pede de novo', async () => {
    servico.obterAutor
      .mockResolvedValueOnce(autor({ livros: pagina([livro('l1', 'Um')], { totalItens: 3, totalPaginas: 3 }) }))
      .mockRejectedValueOnce(new ApiError('Falhou', 503, 'SERVICO_INDISPONIVEL'))
      .mockResolvedValueOnce(autor({ livros: pagina([livro('l2', 'Dois')], { page: 2, totalItens: 3, totalPaginas: 3 }) }))
    const { wrapper } = await abrir('/descobrir/autores/evaristo')

    // Sem IntersectionObserver no jsdom, o fim da lista vira o botão "Carregar mais".
    await wrapper.findAll('button').find((botao) => botao.text() === 'Carregar mais')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Não foi possível carregar mais livros. Verifique sua conexão e tente de novo.')
    expect(wrapper.text()).toContain('Um')

    await wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(servico.obterAutor).toHaveBeenLastCalledWith('evaristo', 2)
    expect(wrapper.findAll('article h3').map((titulo) => titulo.text())).toEqual(['Um', 'Dois'])
    expect(wrapper.text()).not.toContain('Não foi possível carregar mais livros')
  })

  it('falha da página inteira mostra o erro, e "Tentar de novo" carrega', async () => {
    servico.obterAutor.mockRejectedValueOnce(new ApiError('Falhou', 500, 'ERRO_INTERNO'))
    const { wrapper } = await abrir('/descobrir/autores/evaristo')

    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível abrir esta página')
    await wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(wrapper.get('article h1').text()).toBe('Conceição Evaristo')
  })

  it('404 diz que a página não foi encontrada', async () => {
    servico.obterEditora.mockRejectedValue(new ApiError('Não encontramos esta editora.', 404, 'RECURSO_NAO_ENCONTRADO'))
    const { wrapper } = await abrir('/descobrir/editoras/nao-existe')

    expect(wrapper.text()).toContain('Não encontramos esta página')
    expect(wrapper.text()).not.toContain('Tentar de novo')
  })

  it('carregando com cold start avisa, sem erro', async () => {
    servico.obterAutor.mockReturnValue(new Promise(() => undefined))
    const { wrapper } = await abrir('/descobrir/autores/evaristo')

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('O servidor está iniciando')
    await vi.advanceTimersByTimeAsync(3_000)
    expect(wrapper.get('p[role="status"]').text()).toBe('O servidor está iniciando. Isso pode levar alguns segundos.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('trocar de autor na mesma rota descarta a resposta do anterior', async () => {
    let responderPrimeiro: (valor: ReturnType<typeof autor>) => void = () => undefined
    servico.obterAutor
      .mockReturnValueOnce(new Promise((resolver) => (responderPrimeiro = resolver)))
      .mockResolvedValueOnce(autor({ id: 'outro', nome: 'Outra Autora' }))
    const { wrapper, router } = await abrir('/descobrir/autores/evaristo')

    await router.push('/descobrir/autores/outro')
    await flushPromises()
    responderPrimeiro(autor())
    await flushPromises()

    expect(wrapper.get('article h1').text()).toBe('Outra Autora')
  })
})
