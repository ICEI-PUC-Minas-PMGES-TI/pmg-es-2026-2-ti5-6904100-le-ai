import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService } from '../../services/acervo'
import { ApiError } from '../../services/api'
import { leituraService } from '../../services/leitura'
import { itemEstante, leitura as leituraDaEstante } from '../../testes/estante'
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

vi.mock('../../services/leitura', () => ({
  leituraService: {
    obterMinhaAvaliacao: vi.fn(),
    salvarNota: vi.fn(),
    excluirNota: vi.fn(),
    consultarItemEstante: vi.fn(),
    consultarConclusoes: vi.fn(),
    detalharLeitura: vi.fn(),
  },
}))

const servico = vi.mocked(acervoService)
const leitura = vi.mocked(leituraService)

describe('LivroOficialView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    servico.obterLivroOficial.mockReset().mockResolvedValue(livroOficial())
    servico.listarResenhasDoLivro.mockReset().mockResolvedValue(paginaDeResenhas([]))
    leitura.obterMinhaAvaliacao.mockReset().mockResolvedValue({ livroId: 'livro-1', nota: null, resenha: null })
    leitura.consultarItemEstante.mockReset().mockResolvedValue(null)
    leitura.consultarConclusoes.mockReset().mockResolvedValue({ livroId: 'livro-1', vezesLido: 0 })
    leitura.detalharLeitura.mockReset()
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

  it('pronta: título, metadados, sinopse, ficha e "Sua avaliação" sem nota', async () => {
    const { wrapper } = await abrir()

    expect(servico.obterLivroOficial).toHaveBeenCalledWith('livro-1')
    expect(wrapper.get('article h1').text()).toBe('Torto Arado')
    expect(wrapper.text()).toContain('Todavia · 2019 · 264 páginas')
    expect(wrapper.text()).toContain('Bibiana e Belonísia crescem no interior da Bahia.')
    expect(wrapper.text()).toContain('9788588808911')
    // F-AVA: o bloco existe e, sem nota, diz "Sem nota".
    expect(leitura.obterMinhaAvaliacao).toHaveBeenCalledWith('livro-1')
    expect(wrapper.text()).toContain('Sua avaliação')
    expect(wrapper.find('button[aria-label="Sem nota. Dar nota"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Registrar progresso')
  })

  it('Sua avaliação mostra a nota salva, inclusive zero', async () => {
    leitura.obterMinhaAvaliacao.mockResolvedValue({
      livroId: 'livro-1',
      nota: { livroId: 'livro-1', valor: 0, criadoEm: '2026-09-12T12:00:00Z', atualizadoEm: '2026-09-12T12:00:00Z' },
      resenha: null,
    })
    const { wrapper } = await abrir()

    expect(wrapper.find('button[aria-label="Sua nota: 0. Alterar"]').exists()).toBe(true)
  })

  it('sem resenha própria: "Escrever resenha" no bloco e "Escrever a primeira" na lista vazia', async () => {
    const { wrapper } = await abrir()

    const links = wrapper.findAll('a').map((a) => [a.text(), a.attributes('href')])
    expect(links).toContainEqual(['Escrever resenha', '/livros/livro-1/resenha?origem=descobrir'])
    expect(links).toContainEqual(['Escrever a primeira', '/livros/livro-1/resenha?origem=descobrir'])
  })

  it('com resenha própria: texto, marca de spoiler e "Editar resenha"', async () => {
    leitura.obterMinhaAvaliacao.mockResolvedValue({
      livroId: 'livro-1',
      nota: null,
      resenha: {
        id: 'r1',
        usuarioId: 'u1',
        livroId: 'livro-1',
        texto: 'Minha leitura do livro.',
        spoiler: true,
        criadoEm: '2026-08-22T12:00:00Z',
        atualizadoEm: '2026-08-22T12:00:00Z',
      },
    })
    const { wrapper } = await abrir()

    // O dono vê o próprio texto mesmo com spoiler.
    expect(wrapper.text()).toContain('Minha leitura do livro.')
    expect(wrapper.text()).toContain('Publicada em 22 de agosto de 2026')
    expect(wrapper.text()).toContain('Contém spoiler')
    expect(wrapper.text()).toContain('Editar resenha')
    expect(wrapper.text()).not.toContain('Escrever a primeira')
  })

  it('leitura fora do ar: a página abre e só o bloco mostra o erro', async () => {
    leitura.obterMinhaAvaliacao.mockRejectedValue(new ApiError('x', 503, 'SERVICO_INDISPONIVEL'))
    const { wrapper } = await abrir()

    expect(wrapper.get('article h1').text()).toBe('Torto Arado')
    expect(wrapper.text()).toContain('Não foi possível carregar sua avaliação.')
    leitura.obterMinhaAvaliacao.mockResolvedValue({ livroId: 'livro-1', nota: null, resenha: null })
    const tentar = wrapper.findAll('button').find((b) => b.text() === 'Tentar de novo')
    await tentar!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Não foi possível carregar sua avaliação.')
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

  it('ficha: autor, editora e série levam às páginas de catálogo, com o volume fora do link', async () => {
    servico.obterLivroOficial.mockResolvedValue(
      livroOficial({ editoraId: 'ed-1', serie: { id: 'se-1', nome: 'Trilogia da Bahia', numero: 1 } }),
    )
    const { wrapper } = await abrir()

    expect(wrapper.findAll('dt').map((dt) => dt.text())).toEqual(['Autor', 'Editora', 'Série', 'ISBN'])
    const links = wrapper.findAll('dd a').map((link) => [link.text(), link.attributes('href')])
    expect(links).toEqual([
      ['Itamar Vieira Junior', '/descobrir/autores/a1'],
      ['Todavia', '/descobrir/editoras/ed-1'],
      ['Trilogia da Bahia', '/descobrir/series/se-1'],
    ])
    const serie = wrapper.findAll('dd').find((dd) => dd.text().includes('Trilogia'))!
    expect(serie.text()).toContain('volume 1')
    expect(serie.get('a').text()).not.toContain('volume')
    // O autor do título não vira link.
    expect(wrapper.get('article header').find('a').exists()).toBe(false)
  })

  it('ficha: editora sem página fica texto, série sem número só com o nome e coautoria com um link por autor', async () => {
    servico.obterLivroOficial.mockResolvedValue(
      livroOficial({
        autores: [
          { id: 'a1', nome: 'Itamar Vieira Junior' },
          { id: 'a2', nome: 'Outra Pessoa' },
        ],
        editoraId: null,
        serie: { id: 'se-1', nome: 'Trilogia da Bahia', numero: null },
      }),
    )
    const { wrapper } = await abrir()

    expect(wrapper.findAll('dt').map((dt) => dt.text())).toEqual(['Autores', 'Editora', 'Série', 'ISBN'])
    expect(wrapper.findAll('dd a').map((link) => link.attributes('href'))).toEqual([
      '/descobrir/autores/a1',
      '/descobrir/autores/a2',
      '/descobrir/series/se-1',
    ])
    expect(wrapper.text()).not.toContain('volume')
  })

  it('assuntos levam ao Descobrir filtrado; sem assuntos, a seção some', async () => {
    servico.obterLivroOficial.mockResolvedValue(livroOficial({ assuntos: [{ id: 'romance', nome: 'Romance' }] }))
    servico.buscarLivros.mockResolvedValue({ itens: [], page: 1, limit: 20, totalItens: 0, totalPaginas: 0 })
    const { wrapper, router } = await abrir()

    const assunto = wrapper.get('a[aria-label="Buscar livros de Romance"]')
    expect(assunto.attributes('href')).toBe('/descobrir?assunto=romance')
    await assunto.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/descobrir?assunto=romance')

    servico.obterLivroOficial.mockResolvedValue(livroOficial())
    await router.push('/livros/livro-2')
    await flushPromises()
    expect(wrapper.text()).not.toContain('Assuntos')
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
    const status = wrapper.get('p[role="status"]')
    expect(status.text()).toBe('')
    await vi.advanceTimersByTimeAsync(3_000)
    expect(wrapper.get('p[role="status"]').element).toBe(status.element)
    expect(status.text()).toBe('O servidor está iniciando. Isso pode levar alguns segundos.')

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

  it('a falha de "Ver todas as resenhas" avisa, e o botão vira "Tentar de novo"', async () => {
    servico.obterLivroOficial.mockResolvedValue(
      livroOficial({ resenhas: paginaDeResenhas([resenha('r1', 'Marina', 'Primeira.')], 'c1') }),
    )
    servico.listarResenhasDoLivro
      .mockRejectedValueOnce(new ApiError('Indisponível', 503, 'SERVICO_INDISPONIVEL'))
      .mockResolvedValueOnce(paginaDeResenhas([resenha('r2', 'Letícia', 'Segunda.')]))
    const { wrapper } = await abrir()

    await wrapper.findAll('button').find((botao) => botao.text() === 'Ver todas as resenhas')!.trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe('Não foi possível carregar mais resenhas. Verifique sua conexão.')
    expect(wrapper.text()).toContain('Primeira.')

    await wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Segunda.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('o título vem antes da ficha no DOM, para o leitor de tela começar pelo h1', async () => {
    const { wrapper } = await abrir()

    const html = wrapper.get('article').html()
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('Ficha'))
  })

  it('o 429 mostra a mensagem do servidor, não a de conexão', async () => {
    servico.obterLivroOficial.mockRejectedValue(
      new ApiError('Muitas requisições em pouco tempo. Tente novamente em instantes.', 429, 'MUITAS_REQUISICOES'),
    )
    const { wrapper } = await abrir()

    expect(wrapper.text()).toContain('Muitas requisições em pouco tempo.')
    expect(wrapper.text()).not.toContain('A conexão falhou')
  })

  describe('situação na estante', () => {
    function botao(texto: string) {
      return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)
    }

    it('fora da estante: só Adicionar à estante, que abre as ações de entrada', async () => {
      await abrir()

      expect(leitura.consultarItemEstante).toHaveBeenCalledWith('livro-1')
      expect(botao('Registrar progresso')).toBeUndefined()
      expect(botao('Alterar status')).toBeUndefined()
      botao('Adicionar à estante')!.click()
      await flushPromises()

      const acoes = [...document.body.querySelectorAll('[role="dialog"] ul button')].map((b) => b.textContent!.trim())
      expect(acoes).toEqual(['Adicionar como Quero ler', 'Iniciar leitura'])
    })

    it('lendo: status, página atual, Lido N vezes e Registrar progresso abre o registro', async () => {
      leitura.consultarItemEstante.mockResolvedValue(
        itemEstante('livro-1', 'Torto Arado', {
          status: 'LENDO',
          leituraEmAndamentoId: 'lei-1',
          paginaAtual: 148,
          totalPaginas: 264,
          percentualConcluido: 56,
        }),
      )
      leitura.consultarConclusoes.mockResolvedValue({ livroId: 'livro-1', vezesLido: 1 })
      leitura.detalharLeitura.mockResolvedValue(
        leituraDaEstante({ id: 'lei-1', livroId: 'livro-1', status: 'LENDO', paginaAtual: 148, totalPaginas: 264 }),
      )
      const { wrapper } = await abrir()

      expect(wrapper.text()).toContain('Lendo')
      expect(wrapper.text()).toContain('Página 148 de 264')
      expect(wrapper.text()).toContain('Lido 1 vez')
      expect(botao('Adicionar à estante')).toBeUndefined()
      expect(botao('Alterar status')).toBeDefined()
      botao('Registrar progresso')!.click()
      await flushPromises()

      expect(leitura.detalharLeitura).toHaveBeenCalledWith('lei-1')
      expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Registrar progresso')
    })

    it('lido: sem botão principal, só Alterar status', async () => {
      leitura.consultarItemEstante.mockResolvedValue(
        itemEstante('livro-1', 'Torto Arado', { status: 'LIDO', ultimaLeituraId: 'lei-1' }),
      )
      const { wrapper } = await abrir()

      expect(wrapper.text()).toContain('Lido')
      expect(botao('Registrar progresso')).toBeUndefined()
      expect(botao('Adicionar à estante')).toBeUndefined()
      expect(botao('Alterar status')).toBeDefined()
    })

    it('falha ao consultar a estante: aviso e Tentar de novo recarrega', async () => {
      leitura.consultarItemEstante.mockRejectedValueOnce(new ApiError('Fora do ar.', 503, 'INDISPONIVEL'))
      const { wrapper } = await abrir()

      expect(wrapper.text()).toContain('Não foi possível carregar as ações deste livro.')
      const tentar = [...document.body.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Tentar de novo')
      tentar[tentar.length - 1]!.click()
      await flushPromises()

      expect(botao('Adicionar à estante')).toBeDefined()
    })
  })
})
