import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService } from '../services/acervo'
import { ApiError } from '../services/api'
import { ASSUNTOS, livro, pagina } from '../testes/massaDaBusca'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/acervo', () => ({
  acervoService: {
    listarAssuntos: vi.fn(),
    buscarLivros: vi.fn(),
  },
}))

const servico = vi.mocked(acervoService)

const RESULTADOS = pagina(
  [
    livro('ponc-2018', 'Ponciá Vicêncio', { anoPublicacao: 2018 }),
    livro('ponc-2017', 'Ponciá Vicêncio', { anoPublicacao: 2017 }),
    livro('ponc-2003', 'Ponciá Vicêncio', { anoPublicacao: 2003 }),
    livro('becos', 'Becos da Memória', { anoPublicacao: 2006, paginas: 200 }),
  ],
  { totalItens: 12 },
)

type Montagem = Awaited<ReturnType<typeof montarNaRota>>

async function digitar({ wrapper }: Montagem, texto: string) {
  await wrapper.get('input[type="search"]').setValue(texto)
  await vi.advanceTimersByTimeAsync(400)
  await flushPromises()
}

describe('DescobrirView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    servico.listarAssuntos.mockReset().mockResolvedValue(ASSUNTOS)
    servico.buscarLivros.mockReset().mockResolvedValue(RESULTADOS)
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('aterrissagem: campo sem foco, assuntos e nada mais', async () => {
    const { wrapper } = await montarNaRota('/descobrir')
    await flushPromises()

    const campo = wrapper.get('input[type="search"]')
    expect(campo.attributes('placeholder')).toBe('Título, autor, editora ou ISBN')
    expect(document.activeElement).not.toBe(campo.element)
    expect(wrapper.text()).toContain('Romance')
    expect(wrapper.text()).not.toContain('encontrado')
    expect(servico.buscarLivros).not.toHaveBeenCalled()
  })

  it('resultados: contagem, card com as edições agrupadas e o link da edição principal', async () => {
    const montagem = await montarNaRota('/descobrir')
    await digitar(montagem, 'conceição evaristo')
    const { wrapper, router } = montagem

    expect(wrapper.text()).toContain('12 livros encontrados')
    expect(wrapper.text()).toContain('Pallas · 2018')
    expect(wrapper.text()).toContain('128 páginas')
    expect(wrapper.text()).toContain('3 edições')
    expect(wrapper.text()).not.toMatch(/nota|estrela/i)
    const links = wrapper.findAll('article a')
    expect(links[0]!.attributes('href')).toBe('/livros/ponc-2018?origem=descobrir')
    expect(router.currentRoute.value.query).toMatchObject({ q: 'conceição evaristo' })
  })

  it('"N edições" expande as outras, cada uma com o próprio link', async () => {
    const montagem = await montarNaRota('/descobrir')
    await digitar(montagem, 'poncia')
    const { wrapper } = montagem

    const botao = wrapper.get('article button[aria-expanded]')
    expect(botao.attributes('aria-expanded')).toBe('false')
    await botao.trigger('click')

    expect(botao.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Pallas · 2003 · 128 páginas')
    expect(wrapper.find('a[href="/livros/ponc-2003?origem=descobrir"]').exists()).toBe(true)
  })

  it('omite editora, ano e autor que faltam', async () => {
    servico.buscarLivros.mockResolvedValue(
      pagina([livro('l1', 'Poemas esparsos', { autores: [], editora: null, anoPublicacao: null, paginas: 1 })]),
    )
    const montagem = await montarNaRota('/descobrir')
    await digitar(montagem, 'poemas')

    const card = montagem.wrapper.get('article')
    expect(montagem.wrapper.text()).toContain('1 livro encontrado')
    expect(card.text()).toContain('1 página')
    expect(card.text()).not.toContain('·')
  })

  it('abre com a busca da URL, sem esperar o debounce', async () => {
    const { wrapper } = await montarNaRota('/descobrir?q=evaristo&assunto=conto')
    await flushPromises()

    expect(servico.buscarLivros).toHaveBeenCalledExactlyOnceWith({ q: 'evaristo', assunto: 'conto' })
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('evaristo')
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe('Conto')
  })

  it('filtro por assunto: um ativo por vez, e escolher de novo remove', async () => {
    const { wrapper, router } = await montarNaRota('/descobrir')
    await flushPromises()

    const botaoDe = (nome: string) => wrapper.findAll('nav button').find((botao) => botao.text() === nome)!
    await botaoDe('Terror').trigger('click')
    await flushPromises()
    expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: null, assunto: 'terror' })
    expect(router.currentRoute.value.query).toMatchObject({ assunto: 'terror' })

    await botaoDe('Romance').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('button[aria-pressed="true"]').map((botao) => botao.text())).toEqual(['Romance'])

    await botaoDe('Romance').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('button[aria-pressed="true"]')).toHaveLength(0)
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('nenhum resultado leva aos dois cadastros', async () => {
    servico.buscarLivros.mockResolvedValue(pagina([]))
    const montagem = await montarNaRota('/descobrir')
    await digitar(montagem, 'guimaraes rossa')
    const { wrapper, router } = montagem

    expect(wrapper.text()).toContain('Nenhum livro encontrado')
    await wrapper.findAll('button').find((botao) => botao.text() === 'Cadastrar por ISBN')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/descobrir/adicionar')

    await router.push('/descobrir?q=guimaraes%20rossa')
    await flushPromises()
    await wrapper.findAll('button').find((botao) => botao.text() === 'Cadastrar livro pessoal')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/descobrir/adicionar/pessoal')
  })

  it('falha mostra o banner, e "Tentar de novo" busca outra vez', async () => {
    servico.buscarLivros.mockRejectedValueOnce(new ApiError('Falhou', 500, 'ERRO_INTERNO'))
    const montagem = await montarNaRota('/descobrir')
    await digitar(montagem, 'conceição evaristo')
    const { wrapper } = montagem

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Não foi possível carregar os resultados. Verifique sua conexão e tente de novo.',
    )
    await wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('12 livros encontrados')
  })

  it('carregando mostra o skeleton, e o cold start vira aviso, não erro', async () => {
    let responder: (valor: typeof RESULTADOS) => void = () => undefined
    servico.buscarLivros.mockImplementationOnce(() => new Promise((resolver) => (responder = resolver)))
    const { wrapper } = await montarNaRota('/descobrir')
    await wrapper.get('input[type="search"]').setValue('conceição evaristo')
    await vi.advanceTimersByTimeAsync(400)

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('servidor está iniciando')
    await vi.advanceTimersByTimeAsync(3_000)
    expect(wrapper.findAll('[role="status"]').map((status) => status.text())).toContain(
      'O servidor está iniciando. Isso pode levar alguns segundos.',
    )

    responder(RESULTADOS)
    await flushPromises()
    expect(wrapper.text()).toContain('12 livros encontrados')
  })

  it('limpar o campo volta à aterrissagem e tira a busca da URL', async () => {
    const montagem = await montarNaRota('/descobrir')
    await digitar(montagem, 'conceição evaristo')
    const { wrapper, router } = montagem

    await wrapper.get('button[aria-label="Limpar busca"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('encontrado')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('a página seguinte entra no fim da lista, e o grupo cresce', async () => {
    servico.buscarLivros
      .mockResolvedValueOnce(
        pagina([livro('outro', 'Outro livro', { autores: [] }), livro('ponc-2018', 'Ponciá Vicêncio', { anoPublicacao: 2018 })], {
          totalItens: 3,
          totalPaginas: 2,
        }),
      )
      .mockResolvedValueOnce(
        pagina([livro('ponc-2003', 'Ponciá Vicêncio', { anoPublicacao: 2003 })], { page: 2, totalItens: 3, totalPaginas: 2 }),
      )
    const montagem = await montarNaRota('/descobrir')
    await digitar(montagem, 'livro')
    const { wrapper } = montagem
    expect(wrapper.text()).not.toContain('edições')

    // No jsdom não há IntersectionObserver: o fim da lista vira o botão.
    await wrapper.findAll('button').find((botao) => botao.text() === 'Carregar mais')!.trigger('click')
    await flushPromises()

    expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: 'livro', assunto: null, page: 2 })
    expect(wrapper.text()).toContain('2 edições')
  })

  it('tocar na aba Descobrir já estando nela volta à aterrissagem', async () => {
    const montagem = await montarNaRota('/descobrir')
    await digitar(montagem, 'conceição evaristo')
    const { wrapper, router } = montagem
    expect(wrapper.text()).toContain('12 livros encontrados')

    await router.push('/descobrir')
    await flushPromises()

    expect(wrapper.text()).not.toContain('livros encontrados')
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('a contagem e o vazio saem na mesma região de status, que já existia antes', async () => {
    servico.buscarLivros.mockResolvedValueOnce(pagina([]))
    const montagem = await montarNaRota('/descobrir')
    const regiao = montagem.wrapper.get('p[role="status"]')
    expect(regiao.text()).toBe('')

    await digitar(montagem, 'guimaraes rossa')
    expect(montagem.wrapper.get('p[role="status"]').element).toBe(regiao.element)
    expect(regiao.text()).toBe('Nenhum livro encontrado')
  })

  it('os assuntos que falham oferecem "Tentar de novo"', async () => {
    servico.listarAssuntos
      .mockReset()
      .mockRejectedValueOnce(new ApiError('Falhou', 503, 'SERVICO_INDISPONIVEL'))
      .mockResolvedValueOnce(ASSUNTOS)
    const { wrapper } = await montarNaRota('/descobrir')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar os assuntos.')
    await wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Romance')
  })

  it('o campo aceita no máximo 200 caracteres, como o contrato', async () => {
    const { wrapper } = await montarNaRota('/descobrir')
    expect(wrapper.get('input[type="search"]').attributes('maxlength')).toBe('200')
  })

  describe('filtros avançados (F-ACV-DESCOBERTA)', () => {
    /** A folha vai para o `body` por Teleport, fora do wrapper. */
    function naFolha<T extends Element = HTMLElement>(seletor: string): T {
      const elemento = document.body.querySelector<T>(`[role="dialog"] ${seletor}`)
      if (!elemento) {
        throw new Error(`não achei ${seletor} na folha`)
      }
      return elemento
    }

    async function preencher(campo: HTMLInputElement, valor: string) {
      campo.value = valor
      campo.dispatchEvent(new Event('input'))
      await flushPromises()
    }

    async function aplicarNaFolha() {
      naFolha('form').dispatchEvent(new Event('submit'))
      await flushPromises()
    }

    async function abrirFolha({ wrapper }: Montagem) {
      await wrapper.get('button[aria-haspopup="dialog"]').trigger('click')
      await flushPromises()
    }

    it('mobile: a folha aplica os filtros, que viram chips, badge e URL', async () => {
      const montagem = await montarNaRota('/descobrir')
      await flushPromises()
      const { wrapper, router } = montagem
      expect(wrapper.get('button[aria-haspopup="dialog"]').attributes('aria-label')).toBe('Filtros')

      await abrirFolha(montagem)
      expect(document.activeElement?.textContent?.trim()).toBe('Filtros')
      await preencher(naFolha('#filtros-folha-editora'), 'Pallas')
      await preencher(naFolha('#filtros-folha-paginas-min'), '100')
      await preencher(naFolha('#filtros-folha-paginas-max'), '150')
      await aplicarNaFolha()

      expect(servico.buscarLivros).toHaveBeenLastCalledWith({
        q: null,
        assunto: null,
        editora: 'Pallas',
        paginasMin: 100,
        paginasMax: 150,
      })
      expect(document.body.querySelector('[role="dialog"]')).toBeNull()
      expect(router.currentRoute.value.query).toMatchObject({ editora: 'Pallas', paginasMin: '100', paginasMax: '150' })
      expect(wrapper.get('button[aria-haspopup="dialog"]').attributes('aria-label')).toBe('Filtros, 2 ativos')
      const chips = wrapper.findAll('[aria-label^="Remover filtro"]').map((chip) => chip.attributes('aria-label'))
      expect(chips).toEqual(['Remover filtro Editora: Pallas', 'Remover filtro 100 a 150 páginas'])
      expect(wrapper.text()).toContain('12 livros encontrados')
    })

    it('mobile: faixa invertida não envia, mantém a folha aberta e foca o mínimo', async () => {
      const montagem = await montarNaRota('/descobrir')
      await flushPromises()

      await abrirFolha(montagem)
      await preencher(naFolha('#filtros-folha-paginas-min'), '200')
      await preencher(naFolha('#filtros-folha-paginas-max'), '100')
      await aplicarNaFolha()

      expect(servico.buscarLivros).not.toHaveBeenCalled()
      expect(naFolha('form').textContent).toContain('O mínimo não pode ser maior que o máximo.')
      expect(naFolha('[role="alert"]').textContent?.trim()).toBe('O mínimo não pode ser maior que o máximo.')
      expect(document.activeElement).toBe(naFolha('#filtros-folha-paginas-min'))
      expect(naFolha('#filtros-folha-paginas-max').getAttribute('aria-invalid')).toBe('true')
    })

    it('abre com os filtros da URL, e remover um chip tira só aquele filtro', async () => {
      const { wrapper, router } = await montarNaRota('/descobrir?editora=Pallas&ano=2003')
      await flushPromises()

      expect(servico.buscarLivros).toHaveBeenCalledExactlyOnceWith({ q: null, assunto: null, editora: 'Pallas', ano: 2003 })
      await wrapper.get('[aria-label="Remover filtro Editora: Pallas"]').trigger('click')
      await flushPromises()

      expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: null, assunto: null, ano: 2003 })
      expect(router.currentRoute.value.query).toEqual({ ano: '2003' })
      expect(wrapper.text()).toContain('12 livros encontrados')
    })

    it('vazio com filtros não oferece cadastro, e "Limpar filtros" volta à aterrissagem', async () => {
      servico.buscarLivros.mockResolvedValue(pagina([]))
      const { wrapper, router } = await montarNaRota('/descobrir?paginasMin=5000')
      await flushPromises()

      expect(wrapper.text()).toContain('Nenhum livro com esses filtros')
      expect(wrapper.text()).toContain('Remova um filtro ou amplie a faixa de páginas para ver mais resultados.')
      expect(wrapper.text()).not.toContain('Cadastrar por ISBN')
      expect(wrapper.get('p[role="status"]').text()).toBe('Nenhum livro com esses filtros')

      const limpar = wrapper.findAll('button').filter((botao) => botao.text() === 'Limpar filtros')
      await limpar[limpar.length - 1]!.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({})
      expect(wrapper.text()).not.toContain('Nenhum livro')
    })

    it('web: bloco Filtros no painel, Enter aplica e "Limpar filtros" só aparece com campo preenchido', async () => {
      const { wrapper, router } = await montarNaRota('/descobrir', { largo: true })
      await flushPromises()

      expect(wrapper.find('button[aria-haspopup="dialog"]').exists()).toBe(false)
      const painel = wrapper.get('form[aria-labelledby="filtros-painel-titulo"]')
      expect(painel.text()).toContain('Aplicar filtros')
      expect(painel.text()).not.toContain('Limpar filtros')

      await painel.get('#filtros-painel-autor').setValue('evaristo')
      expect(painel.text()).toContain('Limpar filtros')
      await painel.trigger('submit')
      await flushPromises()

      expect(servico.buscarLivros).toHaveBeenLastCalledWith({ q: null, assunto: null, autor: 'evaristo' })
      expect(router.currentRoute.value.query).toEqual({ autor: 'evaristo' })
      expect(wrapper.text()).toContain('Autor: evaristo')
    })

    it('web: zero páginas mostra o erro no próprio campo ao sair dele', async () => {
      const { wrapper } = await montarNaRota('/descobrir', { largo: true })
      await flushPromises()
      const painel = wrapper.get('form[aria-labelledby="filtros-painel-titulo"]')

      const minimo = painel.get('#filtros-painel-paginas-min')
      await minimo.setValue('0')
      await minimo.trigger('blur')

      expect(painel.text()).toContain('Use um número de páginas maior que zero.')
      expect(servico.buscarLivros).not.toHaveBeenCalled()
    })
  })
})
