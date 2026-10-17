import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import { leituraService, type OcorrenciaHistorico, type PaginaHistorico } from '../services/leitura'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/leitura', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/leitura')>()),
  leituraService: {
    listarHistorico: vi.fn(),
    listarProgresso: vi.fn().mockReturnValue(new Promise(() => {})),
    detalharLeitura: vi.fn().mockReturnValue(new Promise(() => {})),
    consultarItemEstante: vi.fn(),
  },
}))

const servico = vi.mocked(leituraService)

function ocorrencia(leituraId: string, titulo: string, dataFim: string, releitura = false): OcorrenciaHistorico {
  return {
    leituraId,
    livro: { id: `livro-${titulo}`, tipo: 'oficial', titulo, autor: 'Machado de Assis', capaUrl: null },
    dataInicio: dataFim,
    dataFim,
    releitura,
    duracaoDias: 1,
    paginaFinal: 256,
    totalPaginas: 256,
  }
}

function pagina(itens: OcorrenciaHistorico[], extra: Partial<PaginaHistorico> = {}): PaginaHistorico {
  return {
    itens,
    paginacao: { page: 1, limite: 20, totalItens: itens.length, totalPaginas: 1 },
    anos: [
      { ano: 2025, total: 2 },
      { ano: 2024, total: 1 },
    ],
    totais: { livros: 1, leituras: itens.length },
    ...extra,
  }
}

const DOM_CASMURRO = [
  ocorrencia('lei-3', 'Dom Casmurro', '2025-11-16', true),
  ocorrencia('lei-2', 'Dom Casmurro', '2025-02-09', true),
  ocorrencia('lei-1', 'Dom Casmurro', '2024-03-22'),
]

describe('HistoricoView', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    servico.listarHistorico.mockReset().mockResolvedValue(pagina(DOM_CASMURRO))
  })

  it('agrupa por ano, pesquisa em todos os anos, filtra por ano, pagina e abre a ocorrência', async () => {
    servico.listarHistorico.mockResolvedValueOnce(
      pagina(DOM_CASMURRO.slice(0, 2), {
        paginacao: { page: 1, limite: 2, totalItens: 3, totalPaginas: 2 },
        totais: { livros: 1, leituras: 3 },
      }),
    )
    const { wrapper, router } = await montarNaRota('/estante/historico')
    await flushPromises()

    expect(wrapper.findAll('[data-grupo-ano] h2').map((titulo) => titulo.text())).toEqual(['2025'])
    expect(wrapper.text()).toContain('3 leituras concluídas')

    servico.listarHistorico.mockResolvedValueOnce(pagina([DOM_CASMURRO[2]!], { paginacao: { page: 2, limite: 2, totalItens: 3, totalPaginas: 2 } }))
    await wrapper.findAll('button').find((botao) => botao.text() === 'Carregar mais')!.trigger('click')
    await flushPromises()
    expect(servico.listarHistorico).toHaveBeenLastCalledWith({ ano: undefined, q: undefined, page: 2 })
    expect(wrapper.findAll('[data-grupo-ano] h2').map((titulo) => titulo.text())).toEqual(['2025', '2024'])

    await wrapper.get('#pesquisa-historico').setValue('machado')
    await wrapper.get('form[role="search"]').trigger('submit')
    await flushPromises()
    expect(servico.listarHistorico).toHaveBeenLastCalledWith({ ano: undefined, q: 'machado', page: 1 })
    expect(wrapper.findAll('[data-grupo-livro]')).toHaveLength(1)
    expect(wrapper.findAll('[data-ocorrencia]')).toHaveLength(3)

    await wrapper.findAll('[role="group"] button').find((botao) => botao.text().startsWith('2025'))!.trigger('click')
    await flushPromises()
    expect(servico.listarHistorico).toHaveBeenLastCalledWith({ ano: 2025, q: 'machado', page: 1 })

    await wrapper.get('[data-ocorrencia]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/estante/leituras/lei-3/progresso')
  })

  it('com o serviço indisponível mostra o erro e tenta de novo', async () => {
    servico.listarHistorico.mockRejectedValueOnce(new ApiError('indisponível', 503, 'SERVICO_INDISPONIVEL'))
    const { wrapper } = await montarNaRota('/estante/historico')
    await flushPromises()

    expect(wrapper.find('[data-erro]').text()).toContain('Não foi possível carregar seu histórico')
    await wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-erro]').exists()).toBe(false)
    expect(wrapper.findAll('[data-ocorrencia]')).toHaveLength(3)
  })
})
