import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import { type Estatisticas, type GraficosEstatisticas, leituraService } from '../../services/leitura'
import { estatisticas, graficosDoAno, ponto, SEM_REGISTRO } from '../../testes/estatisticas'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/leitura', () => ({
  leituraService: { consultarMinhasEstatisticas: vi.fn(), consultarGraficosEstatisticas: vi.fn() },
}))

const leitura = vi.mocked(leituraService)

/** O dia dos artboards: 29 de setembro de 2026, meio-dia em São Paulo. */
const DIA_DO_PROTOTIPO = new Date('2026-09-29T15:00:00Z')

const DE_2025 = estatisticas({
  ano: 2025,
  totais: { livrosConcluidos: 14, paginasLidas: 5150, minutosLidos: 5285 },
  medias: {
    paginasPorDia: { valor: 21.4, paginasLidas: 5150, diasComLeitura: 241 },
    diasPorLivro: { valor: 19, dias: 266, leiturasConcluidas: 14 },
    notaMedia: { valor: 3.9, quantidade: 13 },
  },
})

function botaoDoPeriodo(wrapper: Awaited<ReturnType<typeof montarNaRota>>['wrapper'], rotulo: string) {
  const botao = wrapper.findAll('button[aria-pressed]').find((b) => b.attributes('aria-label')?.startsWith(rotulo))
  if (!botao) throw new Error(`Sem o período ${rotulo}`)
  return botao
}

describe('EstatisticasView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(DIA_DO_PROTOTIPO)
    localStorage.clear()
    leitura.consultarMinhasEstatisticas.mockReset().mockResolvedValue(estatisticas())
    leitura.consultarGraficosEstatisticas.mockReset().mockResolvedValue(graficosDoAno())
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('abre no ano corrente com totais, médias e gráficos em pt-BR (5.1)', async () => {
    const { wrapper } = await montarNaRota('/perfil/estatisticas', { largo: true })
    await flushPromises()

    expect(leitura.consultarMinhasEstatisticas).toHaveBeenCalledWith(2026)
    expect(leitura.consultarGraficosEstatisticas).toHaveBeenCalledWith(2026)
    expect(wrapper.get('h1').text()).toBe('Estatísticas')
    const texto = wrapper.text()
    expect(texto).toContain('De 1º de janeiro a 29 de setembro de 2026')
    expect(texto).toContain('Livros concluídos: 9 livros')
    expect(texto).toContain('Páginas lidas: 3.818 páginas')
    expect(texto).toContain('Tempo de leitura: 71 h 20 min')
    expect(texto).toContain('20,4')
    expect(texto).toContain('19,1')
    expect(texto).toContain('4,2')
    expect(texto).toContain('Média das 8 notas que você deu em 2026.')
    expect(texto).toContain('Páginas por mês')
    expect(texto).toContain('Livros concluídos por mês')
    expect(texto).toContain('Um registro novo pode levar alguns instantes para aparecer aqui.')
  })

  it('o seletor tem os anos com livros e o acumulado, com o ano corrente ativo', async () => {
    const { wrapper } = await montarNaRota('/perfil/estatisticas', { largo: true })
    await flushPromises()

    const rotulos = wrapper.findAll('button[aria-pressed]').map((b) => b.attributes('aria-label'))
    expect(rotulos).toEqual(['2026, 9 livros', '2025, 14 livros', '2024, 11 livros', '2023, 0 livros', 'Acumulado, 34 livros'])
    expect(botaoDoPeriodo(wrapper, '2026').attributes('aria-pressed')).toBe('true')
  })

  it('trocar de período vai para a rota, recarrega e anuncia o novo intervalo', async () => {
    leitura.consultarMinhasEstatisticas.mockImplementation(async (periodo) =>
      periodo === 2025 ? DE_2025 : estatisticas(),
    )
    leitura.consultarGraficosEstatisticas.mockImplementation(async (periodo) =>
      periodo === 2025 ? graficosDoAno(2025, 12) : graficosDoAno(),
    )
    const { wrapper, router } = await montarNaRota('/perfil/estatisticas', { largo: true })
    await flushPromises()

    await botaoDoPeriodo(wrapper, '2025').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.periodo).toBe('2025')
    expect(leitura.consultarMinhasEstatisticas).toHaveBeenLastCalledWith(2025)
    expect(botaoDoPeriodo(wrapper, '2025').attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('De 1º de janeiro a 31 de dezembro de 2025')
    expect(wrapper.text()).toContain('Tempo de leitura: 88 h 05 min')
    expect(wrapper.text()).toContain('5.144 páginas em 2025')
    expect(wrapper.find('[aria-live="polite"]').text()).toBe('Mostrando 2025, de 1º de janeiro a 31 de dezembro de 2025')
  })

  it('o acumulado pela rota diz desde o primeiro registro e soma as notas que já deu (5.2)', async () => {
    leitura.consultarMinhasEstatisticas.mockResolvedValue(
      estatisticas({
        ano: null,
        totais: { livrosConcluidos: 34, paginasLidas: 13538, minutosLidos: 13895 },
        medias: {
          paginasPorDia: { valor: 21.9, paginasLidas: 13538, diasComLeitura: 618 },
          diasPorLivro: { valor: 20, dias: 680, leiturasConcluidas: 34 },
          notaMedia: { valor: 4, quantidade: 31 },
        },
      }),
    )
    const anos: GraficosEstatisticas = {
      ano: null,
      granularidade: 'ano',
      pontos: [ponto(null, 360, 0, 2023), ponto(null, 4210, 11, 2024), ponto(null, 5150, 14, 2025), ponto(null, 3818, 9)],
    }
    leitura.consultarGraficosEstatisticas.mockResolvedValue(anos)
    const { wrapper } = await montarNaRota('/perfil/estatisticas?periodo=acumulado', { largo: true })
    await flushPromises()

    expect(leitura.consultarMinhasEstatisticas).toHaveBeenCalledWith('acumulado')
    const texto = wrapper.text()
    expect(texto).toContain('Desde 12 de novembro de 2023, seu primeiro registro')
    expect(texto).toContain('231 h 35 min')
    expect(texto).toContain('4,0')
    expect(texto).toContain('Média das 31 notas que você já deu.')
    expect(texto).toContain('Páginas por ano')
    expect(texto).toContain('13.538 páginas desde 2023')
    expect(botaoDoPeriodo(wrapper, 'Acumulado').attributes('aria-pressed')).toBe('true')
  })

  it('média sem denominador vira frase, nunca zero (5.3)', async () => {
    const de2023: Estatisticas = estatisticas({
      ano: 2023,
      totais: { livrosConcluidos: 0, paginasLidas: 360, minutosLidos: 460 },
      medias: {
        paginasPorDia: { valor: 25.7, paginasLidas: 360, diasComLeitura: 14 },
        diasPorLivro: { valor: null, dias: 0, leiturasConcluidas: 0 },
        notaMedia: { valor: null, quantidade: 0 },
      },
    })
    leitura.consultarMinhasEstatisticas.mockResolvedValue(de2023)
    leitura.consultarGraficosEstatisticas.mockResolvedValue({
      ano: 2023,
      granularidade: 'mes',
      pontos: [ponto(11, 146, 0, 2023), ponto(12, 214, 0, 2023)],
    })
    const { wrapper } = await montarNaRota('/perfil/estatisticas?periodo=2023', { largo: true })
    await flushPromises()

    const texto = wrapper.text()
    expect(texto).toContain('De 12 de novembro a 31 de dezembro de 2023, desde o seu primeiro registro')
    expect(texto).toContain('Sem leituras concluídas em 2023')
    expect(texto).toContain('Nenhuma nota dada em 2023')
    expect(texto).toContain('Média das notas que você deu em 2023.')
    expect(texto).toContain('Nenhum livro concluído em 2023.')
    expect(texto).toContain('360 páginas de novembro a dezembro')
  })

  it('sem nenhum registro, o vazio com Ir para a estante e sem seletor (4.7)', async () => {
    leitura.consultarMinhasEstatisticas.mockResolvedValue(SEM_REGISTRO)
    leitura.consultarGraficosEstatisticas.mockResolvedValue({ ano: 2026, granularidade: 'mes', pontos: [] })
    const { wrapper } = await montarNaRota('/perfil/estatisticas', { largo: true })
    await flushPromises()

    expect(wrapper.text()).toContain('Suas estatísticas começam no primeiro registro')
    expect(wrapper.findAll('a[href="/estante"]').some((a) => a.text() === 'Ir para a estante')).toBe(true)
    expect(wrapper.find('button[aria-pressed]').exists()).toBe(false)
  })

  it.each([
    ['tempo esgotado', new ApiError('Tempo esgotado.', 0, 'TEMPO_LIMITE_EXCEDIDO')],
    ['serviço fora do ar', new ApiError('Falhou', 503, 'SERVICO_INDISPONIVEL')],
  ])('%s vira o banner com Tentar de novo, mantendo o seletor (RNF-TST-04/06)', async (_, erro) => {
    leitura.consultarGraficosEstatisticas.mockRejectedValueOnce(erro)
    const { wrapper } = await montarNaRota('/perfil/estatisticas', { largo: true })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Não foi possível carregar suas estatísticas. Verifique sua conexão e tente de novo.',
    )
    expect(wrapper.find('button[aria-pressed]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Totais')

    await wrapper.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Livros concluídos: 9 livros')
  })

  it('enquanto carrega, o skeleton (cold start não é erro)', async () => {
    leitura.consultarMinhasEstatisticas.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await montarNaRota('/perfil/estatisticas', { largo: true })
    await flushPromises()

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('a resposta atrasada de um período anterior é descartada', async () => {
    const { wrapper } = await montarNaRota('/perfil/estatisticas', { largo: true })
    await flushPromises()
    // 2024 demora; o leitor já trocou para 2025 quando ela chega.
    let responder2024: (valor: Estatisticas) => void = () => {}
    leitura.consultarMinhasEstatisticas.mockImplementation((periodo) =>
      periodo === 2024 ? new Promise((resolve) => (responder2024 = resolve)) : Promise.resolve(DE_2025),
    )

    await botaoDoPeriodo(wrapper, '2024').trigger('click')
    await flushPromises()
    await botaoDoPeriodo(wrapper, '2025').trigger('click')
    await flushPromises()
    responder2024(estatisticas({ ano: 2024, totais: { livrosConcluidos: 11, paginasLidas: 1, minutosLidos: 1 } }))
    await flushPromises()

    expect(wrapper.text()).toContain('Livros concluídos: 14 livros')
    expect(wrapper.text()).not.toContain('Livros concluídos: 11 livros')
  })

  it('na web a volta é pela sidebar: a seta só aparece abaixo de 768px', async () => {
    const { wrapper } = await montarNaRota('/perfil/estatisticas', { largo: true })
    await flushPromises()

    expect(wrapper.get('button[aria-label="Voltar"]').classes()).toContain('md:hidden')
  })
})
