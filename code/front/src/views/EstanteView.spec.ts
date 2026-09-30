import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import { leituraService } from '../services/leitura'
import { itemEstante, leitura, paginaEstante, TOTAIS_ZERADOS } from '../testes/estante'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/leitura', () => ({
  leituraService: {
    listarEstante: vi.fn(),
    detalharLeitura: vi.fn(),
    removerEstante: vi.fn(),
    registrarProgresso: vi.fn(),
  },
}))

const servico = vi.mocked(leituraService)

const TOTAIS = { LENDO: 2, QUERO_LER: 3, LIDO: 3, RELENDO: 1, ABANDONADO: 1 }

const TORTO_ARADO = itemEstante('l1', 'Torto Arado', {
  status: 'LENDO',
  leituraEmAndamentoId: 'lei-1',
  ultimaLeituraId: 'lei-1',
  paginaAtual: 148,
  totalPaginas: 264,
  percentualConcluido: 56.06,
})
const VIDAS_SECAS = itemEstante('l2', 'Vidas Secas', { status: 'LIDO', vezesLido: 2 })
const CIDADE_DE_DEUS = itemEstante('l3', 'Cidade de Deus', {
  status: 'ABANDONADO',
  ultimaLeituraId: 'lei-3',
  retomavel: true,
  paginaAtual: 210,
  totalPaginas: 552,
})

type Wrapper = Awaited<ReturnType<typeof montarNaRota>>['wrapper']

function pills(wrapper: Wrapper) {
  return wrapper.findAll('[role="group"] button')
}

function botao(wrapper: Wrapper, texto: string) {
  return wrapper.findAll('button').find((b) => b.text().trim() === texto)!
}

describe('EstanteView', () => {
  beforeEach(() => {
    localStorage.clear()
    servico.listarEstante
      .mockReset()
      .mockResolvedValue(paginaEstante([TORTO_ARADO, VIDAS_SECAS, CIDADE_DE_DEUS], { totalItens: 10, totais: TOTAIS }))
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('pills na ordem da máquina de estados, com a contagem de cada status e Todos como soma', async () => {
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()

    expect(servico.listarEstante).toHaveBeenCalledWith({ status: undefined, ordenacao: 'adicionado_desc', page: 1 })
    expect(pills(wrapper).map((pill) => pill.text().replace(/\s+/g, ' '))).toEqual([
      'Todos 10',
      'Lendo 2',
      'Quero ler 3',
      'Lido 3',
      'Relendo 1',
      'Abandonado 1',
    ])
    expect(pills(wrapper)[0]!.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('10 livros')
    expect(wrapper.find('h1').text()).toBe('Minha estante')
  })

  it('card mostra progresso de quem está lendo, conclusões e a página em que parou', async () => {
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()

    const cards = wrapper.findAll('ul[aria-label="Livros da estante"] > li')
    expect(cards).toHaveLength(3)
    expect(cards[0]!.text()).toContain('Torto Arado')
    expect(cards[0]!.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('56')
    expect(cards[0]!.text()).toContain('56%')
    expect(cards[1]!.text()).toContain('Lido 2 vezes')
    expect(cards[1]!.find('[role="progressbar"]').exists()).toBe(false)
    expect(cards[2]!.text()).toContain('Parou na página 210 de 552')
  })

  it('trocar o filtro vai para a URL e busca de novo a partir da primeira página', async () => {
    const { router, wrapper } = await montarNaRota('/estante')
    await flushPromises()

    await pills(wrapper)[1]!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ status: 'LENDO' })
    expect(servico.listarEstante).toHaveBeenLastCalledWith({ status: 'LENDO', ordenacao: 'adicionado_desc', page: 1 })
    expect(pills(wrapper)[1]!.attributes('aria-pressed')).toBe('true')

    await pills(wrapper)[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('trocar a ordenação no select da web vai para a URL e busca de novo', async () => {
    const { router, wrapper } = await montarNaRota('/estante?status=LIDO')
    await flushPromises()

    const select = wrapper.get('select')
    expect(select.findAll('option').map((opcao) => opcao.text())).toEqual([
      'Adicionados recentemente',
      'Adicionados há mais tempo',
      'Título, A a Z',
      'Título, Z a A',
      'Autor, A a Z',
      'Autor, Z a A',
      'Maior progresso',
      'Menor progresso',
    ])
    await select.setValue('titulo_asc')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ status: 'LIDO', ordenacao: 'titulo_asc' })
    expect(servico.listarEstante).toHaveBeenLastCalledWith({ status: 'LIDO', ordenacao: 'titulo_asc', page: 1 })
  })

  it('no mobile, a ordenação abre uma folha e a escolha fecha a folha e atualiza a URL', async () => {
    const { router, wrapper } = await montarNaRota('/estante')
    await flushPromises()

    await wrapper.get('button[aria-label="Ordenar por: Adicionados recentemente"]').trigger('click')
    await flushPromises()
    const opcao = [...document.body.querySelectorAll('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === 'Autor, Z a A',
    ) as HTMLButtonElement
    opcao.click()
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ ordenacao: 'autor_desc' })
    expect(servico.listarEstante).toHaveBeenLastCalledWith({ status: undefined, ordenacao: 'autor_desc', page: 1 })
  })

  it('a URL define filtro e ordenação ao abrir, e valor desconhecido cai no padrão', async () => {
    await montarNaRota('/estante?status=RELENDO&ordenacao=progresso_desc')
    await flushPromises()
    expect(servico.listarEstante).toHaveBeenLastCalledWith({ status: 'RELENDO', ordenacao: 'progresso_desc', page: 1 })

    document.body.innerHTML = ''
    await montarNaRota('/estante?status=FAVORITOS&ordenacao=nota')
    await flushPromises()
    expect(servico.listarEstante).toHaveBeenLastCalledWith({ status: undefined, ordenacao: 'adicionado_desc', page: 1 })
  })

  it('rolagem pede a próxima página e acrescenta no fim; trocar o filtro recomeça', async () => {
    servico.listarEstante
      .mockResolvedValueOnce(paginaEstante([TORTO_ARADO], { totalPaginas: 2, totalItens: 2, totais: TOTAIS }))
      .mockResolvedValueOnce(paginaEstante([VIDAS_SECAS], { page: 2, totalPaginas: 2, totalItens: 2, totais: TOTAIS }))
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()

    await botao(wrapper, 'Carregar mais').trigger('click')
    await flushPromises()

    expect(servico.listarEstante).toHaveBeenLastCalledWith({ status: undefined, ordenacao: 'adicionado_desc', page: 2 })
    expect(wrapper.findAll('ul[aria-label="Livros da estante"] > li')).toHaveLength(2)
    expect(wrapper.findAll('button').some((b) => b.text().trim() === 'Carregar mais')).toBe(false)

    servico.listarEstante.mockResolvedValueOnce(paginaEstante([CIDADE_DE_DEUS], { totais: TOTAIS }))
    await pills(wrapper)[5]!.trigger('click')
    await flushPromises()
    expect(servico.listarEstante).toHaveBeenLastCalledWith({ status: 'ABANDONADO', ordenacao: 'adicionado_desc', page: 1 })
    expect(wrapper.findAll('ul[aria-label="Livros da estante"] > li')).toHaveLength(1)
  })

  it('carregando: skeleton no lugar da grade e pills sem contagem', async () => {
    servico.listarEstante.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(pills(wrapper).map((pill) => pill.text())).toEqual(['Todos', 'Lendo', 'Quero ler', 'Lido', 'Relendo', 'Abandonado'])
  })

  it('estante vazia: pills zerados, Buscar livros leva a Descobrir e o cadastro por ISBN continua', async () => {
    servico.listarEstante.mockResolvedValue(paginaEstante([], { totais: TOTAIS_ZERADOS }))
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()

    expect(pills(wrapper)[0]!.text().replace(/\s+/g, ' ')).toBe('Todos 0')
    expect(wrapper.text()).toContain('Sua estante está vazia')
    expect(wrapper.get('main a[href="/descobrir"]').text()).toBe('Buscar livros')
    expect(wrapper.get('a[href="/estante/adicionar"]').text()).toBe('Cadastrar por ISBN')
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('vazio por filtro: copy do status e o botão leva ao filtro relacionado', async () => {
    servico.listarEstante.mockResolvedValue(paginaEstante([], { totais: { ...TOTAIS, RELENDO: 0 } }))
    const { router, wrapper } = await montarNaRota('/estante?status=RELENDO')
    await flushPromises()

    expect(wrapper.text()).toContain('Nenhuma releitura em andamento')
    expect(wrapper.text()).toContain('Releituras aparecem aqui quando você recomeça um livro que já concluiu.')
    await botao(wrapper, 'Ver livros lidos').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ status: 'LIDO' })
  })

  it('vazio de Quero ler leva a Descobrir', async () => {
    servico.listarEstante.mockResolvedValue(paginaEstante([], { totais: { ...TOTAIS, QUERO_LER: 0 } }))
    const { router, wrapper } = await montarNaRota('/estante?status=QUERO_LER')
    await flushPromises()

    await botao(wrapper, 'Buscar livros').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/descobrir')
  })

  it('erro ou tempo esgotado: banner com Tentar de novo, que busca de novo', async () => {
    servico.listarEstante.mockRejectedValueOnce(
      new ApiError('O servidor demorou para responder. Tente novamente.', 0, 'TEMPO_LIMITE_EXCEDIDO'),
    )
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Não foi possível carregar sua estante. Verifique sua conexão e tente de novo.',
    )
    await botao(wrapper, 'Tentar de novo').trigger('click')
    await flushPromises()

    expect(servico.listarEstante).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Torto Arado')
  })

  it('toque no card em andamento busca a leitura e abre as ações com o status atual', async () => {
    servico.detalharLeitura.mockReset().mockResolvedValue(leitura({ livroId: 'l1' }))
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()

    await wrapper.findAll('ul li button')[0]!.trigger('click')
    await flushPromises()

    expect(servico.detalharLeitura).toHaveBeenCalledWith('lei-1')
    const dialogo = document.body.querySelector('[role="dialog"]')!
    expect(dialogo.textContent).toContain('Torto Arado')
    expect(dialogo.textContent).toContain('Lendo')
    const acoes = [...dialogo.querySelectorAll('ul button')].map((b) => b.textContent!.trim())
    expect(acoes).toEqual(['Registrar progresso', 'Finalizar leitura', 'Abandonar leitura'])
  })

  it('toque no card Abandonado busca a última leitura e oferece Retomar leitura', async () => {
    servico.detalharLeitura
      .mockReset()
      .mockResolvedValue(leitura({ id: 'lei-3', livroId: 'l3', status: 'ABANDONADO', retomavel: true }))
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()

    await wrapper.findAll('ul li button')[2]!.trigger('click')
    await flushPromises()

    expect(servico.detalharLeitura).toHaveBeenCalledWith('lei-3')
    const dialogo = document.body.querySelector('[role="dialog"]')!
    expect(dialogo.textContent).toContain('Cidade de Deus')
    const acoes = [...dialogo.querySelectorAll('ul button')].map((b) => b.textContent!.trim())
    expect(acoes).toEqual(['Retomar leitura'])
  })

  it('ação salva recarrega a estante com os novos totais', async () => {
    const querLer = itemEstante('l4', 'Quarto de despejo')
    servico.listarEstante.mockResolvedValue(paginaEstante([querLer], { totais: { ...TOTAIS_ZERADOS, QUERO_LER: 1 } }))
    servico.detalharLeitura.mockReset()
    servico.removerEstante.mockReset().mockResolvedValue(undefined)
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()
    servico.listarEstante.mockResolvedValue(paginaEstante([], { totais: TOTAIS_ZERADOS }))

    await wrapper.findAll('ul li button')[0]!.trigger('click')
    await flushPromises()
    expect(servico.detalharLeitura).not.toHaveBeenCalled()
    const remover = () =>
      [...document.body.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent!.trim() === 'Remover da estante')
    remover()[0]!.click()
    await flushPromises()
    remover().at(-1)!.click()
    await flushPromises()

    expect(servico.removerEstante).toHaveBeenCalledWith('l4', expect.any(String))
    expect(servico.listarEstante).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Sua estante está vazia')
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('falha ao buscar a leitura: aviso e o painel não abre', async () => {
    servico.detalharLeitura.mockReset().mockRejectedValue(new ApiError('falha', 500, 'ERRO_INTERNO'))
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()

    await wrapper.findAll('ul li button')[0]!.trigger('click')
    await flushPromises()

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(wrapper.text()).toContain('Não foi possível carregar as ações deste livro.')
  })

  it('Registrar progresso no card em andamento abre o dialog, salva e recarrega a estante', async () => {
    servico.detalharLeitura.mockReset().mockResolvedValue(leitura({ livroId: 'l1' }))
    servico.registrarProgresso.mockReset().mockResolvedValue({
      progresso: {
        id: 'p-1',
        leituraId: 'lei-1',
        posicao: 1,
        pagina: 172,
        paginaAnterior: 148,
        paginasLidas: 24,
        minutos: 45,
        registradoEmDispositivo: '2026-09-27T10:00:00Z',
        fusoHorarioDispositivo: 'America/Sao_Paulo',
        dataLocal: '2026-09-27',
        criadoEm: '2026-09-27T10:00:00Z',
      },
      resumo: { paginaAtual: 172, totalPaginas: 264, percentualConcluido: 65, minutosTotais: 260 },
    })
    const { wrapper } = await montarNaRota('/estante')
    await flushPromises()
    await wrapper.findAll('ul li button')[0]!.trigger('click')
    await flushPromises()
    const registrar = [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] ul button')].find(
      (b) => b.textContent!.trim() === 'Registrar progresso',
    )!
    registrar.click()
    await flushPromises()

    const dialogo = document.body.querySelector('[role="dialog"]')!
    expect(dialogo.getAttribute('aria-label')).toBe('Registrar progresso')
    expect(dialogo.textContent).toContain('Página 148 de 264')
    const [pagina, , minutos] = [...dialogo.querySelectorAll('input')]
    pagina!.value = '172'
    pagina!.dispatchEvent(new Event('input'))
    minutos!.value = '45'
    minutos!.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(dialogo.textContent).toContain('Você leu 24 páginas')
    const chamadasAntes = servico.listarEstante.mock.calls.length
    dialogo.querySelector('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(servico.registrarProgresso).toHaveBeenCalledWith(
      'lei-1',
      expect.objectContaining({ pagina: 172, minutos: 45 }),
      expect.any(String),
    )
    expect(servico.listarEstante.mock.calls.length).toBe(chamadasAntes + 1)
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('Ver atualizações leva à tela de progresso da leitura em andamento', async () => {
    servico.detalharLeitura.mockReset().mockResolvedValue(leitura({ livroId: 'l1' }))
    const { wrapper, router } = await montarNaRota('/estante')
    await flushPromises()
    await wrapper.findAll('ul li button')[0]!.trigger('click')
    await flushPromises()
    const push = vi.spyOn(router, 'push')

    const ver = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent!.trim() === 'Ver atualizações',
    )!
    ver.click()
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/estante/leituras/lei-1/progresso')
  })
})
