import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import { leituraService, type PaginaProgresso, type Progresso } from '../services/leitura'
import { TEXTOS_DAS_ATUALIZACOES, TEXTOS_DO_REGISTRO } from '../progresso/textos'
import { itemEstante, leitura } from '../testes/estante'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/leitura', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/leitura')>()),
  leituraService: {
    listarProgresso: vi.fn(),
    detalharLeitura: vi.fn(),
    consultarItemEstante: vi.fn(),
    excluirTrechoProgresso: vi.fn(),
    registrarProgresso: vi.fn(),
  },
}))

const servico = vi.mocked(leituraService)
const CAMINHO = '/estante/leituras/lei-1/progresso'

function progresso(id: string, posicao: number, pagina: number, paginaAnterior: number, minutos = 30): Progresso {
  return {
    id,
    leituraId: 'lei-1',
    posicao,
    pagina,
    paginaAnterior,
    paginasLidas: pagina - paginaAnterior,
    minutos,
    registradoEmDispositivo: '2026-09-08T10:00:00Z',
    fusoHorarioDispositivo: 'America/Sao_Paulo',
    dataLocal: `2026-09-0${posicao}`,
    criadoEm: '2026-09-08T10:00:00Z',
  }
}

const ITENS = [progresso('p4', 4, 172, 148, 45), progresso('p3', 3, 148, 117, 70), progresso('p2', 2, 117, 55), progresso('p1', 1, 55, 0)]

function pagina(
  itens: Progresso[],
  { page = 1, totalPaginas = 1, totalItens = itens.length, paginaAtual = 172, minutosTotais = 260, somenteLeitura = false } = {},
): PaginaProgresso {
  return {
    itens,
    paginacao: { page, limite: 20, totalItens, totalPaginas },
    resumo: { paginaAtual, totalPaginas: 264, percentualConcluido: (paginaAtual / 264) * 100, minutosTotais },
    somenteLeitura,
  }
}

async function montar() {
  const montado = await montarNaRota(CAMINHO)
  await flushPromises()
  return montado
}

const resumoTexto = (wrapper: Awaited<ReturnType<typeof montar>>['wrapper']) => wrapper.get('[data-resumo]').text()

describe('ProgressoView', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    for (const funcao of Object.values(servico)) funcao.mockReset()
    servico.listarProgresso.mockResolvedValue(pagina(ITENS))
    servico.detalharLeitura.mockResolvedValue(leitura({ paginaAtual: 172 }))
    servico.consultarItemEstante.mockResolvedValue(itemEstante('livro-1', 'Torto Arado'))
  })

  it('mostra o resumo com o livro e as atualizações em tabela e em lista', async () => {
    const { wrapper } = await montar()

    expect(servico.listarProgresso).toHaveBeenCalledWith('lei-1', { page: 1, limite: 20 })
    expect(resumoTexto(wrapper)).toContain('Torto Arado')
    expect(resumoTexto(wrapper)).toContain('65%')
    expect(resumoTexto(wrapper)).toContain('Página 172 de 264')
    expect(resumoTexto(wrapper)).toContain('172 páginas')
    expect(resumoTexto(wrapper)).toContain('4 h 20 min')
    expect(resumoTexto(wrapper)).toContain('4 registros')

    const tabela = wrapper.get('[data-tabela]')
    expect(tabela.classes()).toEqual(expect.arrayContaining(['hidden', 'md:block', 'overflow-x-auto']))
    expect(tabela.findAll('th').map((th) => th.text()).slice(0, 4)).toEqual(['Data', 'Página', 'Páginas lidas', 'Tempo'])
    expect(tabela.findAll('[data-linha]')).toHaveLength(4)
    expect(tabela.findAll('[data-linha]')[0].text()).toContain('24 páginas')

    const lista = wrapper.get('[data-lista]')
    expect(lista.classes()).toContain('md:hidden')
    expect(lista.findAll('[data-linha]')[0].text()).toContain('página 172')
    expect(lista.findAll('[data-linha]')[0].text()).toContain('24 páginas · 45 min')
    expect(document.querySelector('[data-registrar]')).not.toBeNull()
    expect(wrapper.find('[data-aviso-ritmo]').exists()).toBe(false)
  })

  it('carrega a página seguinte ao chegar ao fim da lista', async () => {
    servico.listarProgresso
      .mockResolvedValueOnce(pagina(ITENS.slice(0, 2), { totalPaginas: 2, totalItens: 4 }))
      .mockResolvedValueOnce(pagina(ITENS.slice(2), { page: 2, totalPaginas: 2, totalItens: 4 }))
    const { wrapper } = await montar()
    expect(wrapper.get('[data-tabela]').findAll('[data-linha]')).toHaveLength(2)

    await wrapper.findAll('button').find((botao) => botao.text() === 'Carregar mais')!.trigger('click')
    await flushPromises()

    expect(servico.listarProgresso).toHaveBeenLastCalledWith('lei-1', { page: 2, limite: 20 })
    expect(wrapper.get('[data-tabela]').findAll('[data-linha]')).toHaveLength(4)
  })

  it('confirma a exclusão de um intermediário com o alcance e a página resultante', async () => {
    servico.excluirTrechoProgresso.mockResolvedValue({
      idsRemovidos: ['p4', 'p3', 'p2'],
      resumo: { paginaAtual: 55, totalPaginas: 264, percentualConcluido: 20.83, minutosTotais: 260 },
    })
    const { wrapper } = await montar()

    await wrapper.get('[data-tabela]').findAll('[data-excluir]')[2].trigger('click')
    await flushPromises()
    const dialogo = document.querySelector('[role="dialog"]')!
    expect(dialogo.textContent).toContain(TEXTOS_DAS_ATUALIZACOES.confirmacaoAlcance(3))
    expect(dialogo.textContent).toContain('Sua página atual volta para 55 e o percentual para 21%.')

    servico.listarProgresso.mockResolvedValue(pagina([ITENS[3]], { paginaAtual: 55 }))
    const confirmar = [...dialogo.querySelectorAll('button')].find((botao) => botao.textContent?.includes('Excluir atualização'))!
    confirmar.click()
    await flushPromises()

    expect(servico.excluirTrechoProgresso).toHaveBeenCalledWith('p2', { ultimoProgressoIdConfirmado: 'p4' }, expect.any(String))
    expect(resumoTexto(wrapper)).toContain('Página 55 de 264')
    expect(resumoTexto(wrapper)).toContain('1 registro')
    expect(wrapper.get('[data-tabela]').findAll('[data-linha]')).toHaveLength(1)
    expect(wrapper.find('[data-aviso]').exists()).toBe(false)
  })

  it('excluir o último não fala em outros registros excluídos', async () => {
    const { wrapper } = await montar()

    await wrapper.get('[data-tabela]').findAll('[data-excluir]')[0].trigger('click')
    await flushPromises()

    expect(document.querySelector('[data-alcance]')).toBeNull()
    expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Sua página atual volta para 148 e o percentual para 56%.')
  })

  it('recarrega a lista e avisa quando ela mudou em outro lugar', async () => {
    servico.excluirTrechoProgresso.mockRejectedValue(new ApiError('Conflito.', 409, 'CONFLITO'))
    const { wrapper } = await montar()

    await wrapper.get('[data-tabela]').findAll('[data-excluir]')[1].trigger('click')
    await flushPromises()
    const dialogo = document.querySelector('[role="dialog"]')!
    ;[...dialogo.querySelectorAll('button')].find((botao) => botao.textContent?.includes('Excluir atualização'))!.click()
    await flushPromises()

    expect(servico.listarProgresso).toHaveBeenCalledTimes(2)
    expect(wrapper.get('[data-aviso]').text()).toBe(TEXTOS_DO_REGISTRO.erroListaDesatualizada)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('nenhuma atualização oferece edição; correção é excluir e registrar de novo', async () => {
    const { wrapper } = await montar()

    const linhas = wrapper.get('[data-tabela]').findAll('[data-linha]')
    expect(linhas.length).toBeGreaterThan(1)
    expect(linhas.every((linha) => linha.find('[data-excluir]').exists())).toBe(true)
    expect(wrapper.find('[data-editar]').exists()).toBe(false)
    expect(wrapper.findAll('button').some((botao) => /editar/i.test(botao.attributes('aria-label') ?? ''))).toBe(false)
    expect(wrapper.findComponent({ name: 'RegistrarProgresso' }).props()).not.toHaveProperty('modo')
  })

  it('somente leitura esconde registrar e excluir', async () => {
    servico.listarProgresso.mockResolvedValue(pagina(ITENS, { somenteLeitura: true }))
    const { wrapper } = await montar()

    expect(wrapper.findAll('[data-linha]').length).toBeGreaterThan(0)
    expect(wrapper.find('[data-excluir]').exists()).toBe(false)
    expect(document.querySelector('[data-registrar]')).toBeNull()
  })

  it('mostra o vazio com Iniciada e o convite a registrar', async () => {
    servico.listarProgresso.mockResolvedValue(pagina([], { paginaAtual: 0, minutosTotais: 0 }))
    const { wrapper } = await montar()

    expect(wrapper.get('[data-vazio]').text()).toContain(TEXTOS_DAS_ATUALIZACOES.vazioTitulo)
    expect(wrapper.get('[data-vazio]').text()).toContain(TEXTOS_DAS_ATUALIZACOES.vazioBotao)
    expect(wrapper.get('[data-percentual]').text()).toBe('Iniciada')
    expect(wrapper.get('[data-linha-pagina]').text()).toBe('Iniciada em 12 de agosto de 2026')
    expect(resumoTexto(wrapper)).toContain('0 páginas')
    expect(resumoTexto(wrapper)).toContain('0 min')
    expect(resumoTexto(wrapper)).toContain('0 registros')
  })

  it('mostra o registro sem tempo informado sem a coluna de tempo preenchida', async () => {
    servico.listarProgresso.mockResolvedValue(pagina([progresso('p4', 4, 172, 148, 0), ...ITENS.slice(1)]))
    const { wrapper } = await montar()

    const celulas = wrapper.get('[data-tabela]').findAll('[data-linha]')[0].findAll('td')
    expect(celulas[3].text()).toBe('')
    expect(wrapper.get('[data-lista]').findAll('[data-linha]')[0].text()).toContain('24 páginas')
    expect(wrapper.get('[data-lista]').findAll('[data-linha]')[0].text()).not.toContain('·')
  })

  it('avisa o ritmo acima da média e destaca a exclusão do registro', async () => {
    const itens = [progresso('p3', 3, 250, 148, 15), progresso('p2', 2, 148, 117), progresso('p1', 1, 117, 55)]
    servico.listarProgresso.mockResolvedValue(pagina(itens, { paginaAtual: 250 }))
    const { wrapper } = await montar()

    const texto = '102 páginas em 15 minutos. Se você digitou errado, exclua este registro para voltar à página 148.'
    const tabela = wrapper.get('[data-tabela]')
    expect(tabela.findAll('[data-aviso-ritmo]').map((aviso) => aviso.text())).toEqual([texto])
    expect(tabela.findAll('[data-excluir]')[0].classes()).toContain('text-ambar')
    expect(tabela.findAll('[data-excluir]')[1].classes()).not.toContain('text-ambar')
    const lista = wrapper.get('[data-lista]')
    expect(lista.findAll('[data-linha]')[0].get('[data-aviso-ritmo]').text()).toBe(texto)
    expect(lista.findAll('[data-aviso-ritmo]')).toHaveLength(1)
    expect(lista.findAll('[data-excluir]')[0].classes()).toContain('text-ambar')
  })

  it('mostra o skeleton enquanto carrega', async () => {
    servico.listarProgresso.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await montar()

    expect(wrapper.find('[data-carregando]').exists()).toBe(true)
    expect(wrapper.find('[data-resumo]').exists()).toBe(false)
  })

  it('mostra o erro e tenta de novo', async () => {
    servico.listarProgresso.mockRejectedValueOnce(new ApiError('Sem conexão.', 0, 'NETWORK_ERROR'))
    const { wrapper } = await montar()

    expect(wrapper.get('[data-erro]').text()).toContain(TEXTOS_DAS_ATUALIZACOES.erroTexto)
    await wrapper.get('[data-erro] button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-erro]').exists()).toBe(false)
    expect(wrapper.get('[data-tabela]').findAll('[data-linha]')).toHaveLength(4)
  })
})
