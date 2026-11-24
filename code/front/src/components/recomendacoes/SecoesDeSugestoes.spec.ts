import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { acervoService } from '../../services/acervo'
import { ApiError } from '../../services/api'
import { socialService, type Sugestao, type Sugestoes } from '../../services/social'
import { paginaDeRecomendacoes } from '../../testes/massaDeRecomendacoes'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/acervo', () => ({
  acervoService: { listarAssuntos: vi.fn(), buscarLivros: vi.fn() },
}))

vi.mock('../../services/social', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/social')>()),
  socialService: {
    listarRecebidas: vi.fn(),
    descartarRecomendacao: vi.fn(),
    listarSugestoes: vi.fn(),
    descartarSugestao: vi.fn(),
  },
}))

const social = vi.mocked(socialService)

function sugestao(id: string, titulo: string, autor: string, motivo: string, tipo: Sugestao['motivo']['tipo'] = 'SEGUIDOS'): Sugestao {
  return {
    livro: { id, tipo: 'OFICIAL', titulo, autor, capaUrl: null },
    motivo: { tipo, texto: motivo },
  }
}

const EMPILHADAS = sugestao('l1', 'Mulheres Empilhadas', 'Patrícia Melo', '4 pessoas que você segue leram')
const PASSARO = sugestao('l2', 'O Peso do Pássaro Morto', 'Aline Bei', '3 pessoas que você segue leram')
const SOLITARIA = sugestao('l3', 'Solitária', 'Eliana Alves Cruz', '2 pessoas que você segue leram')
const ARQUIPELAGO = sugestao('l4', 'O Arquipélago', 'Erico Verissimo', 'Continuação de O Tempo e o Vento', 'SERIE')
const SOL = sugestao('l5', 'O Sol na Cabeça', 'Geovani Martins', '1 pessoa que você segue leu')

function resposta(seguidos: Sugestao[], gosto: Sugestao[], proximo: number | null = null): Sugestoes {
  return {
    seguidos: { itens: seguidos, proximoOffset: proximo },
    gosto: { itens: gosto, proximoOffset: null },
  }
}

async function abrir() {
  const montagem = await montarNaRota('/descobrir')
  await flushPromises()
  return { ...montagem, tela: new DOMWrapper(document.body) }
}

async function descartarPeloMenu(tela: DOMWrapper<Element>, titulo: string) {
  await tela.get(`button[aria-label="Mais ações para ${titulo}"]`).trigger('click')
  await tela.findAll('button').find((b) => b.text().startsWith('Descartar sugestão'))!.trigger('click')
}

describe('SecoesDeSugestoes (F-REC-ALG)', () => {
  beforeEach(() => {
    vi.mocked(acervoService.listarAssuntos).mockReset().mockResolvedValue([])
    social.listarRecebidas.mockReset().mockResolvedValue(paginaDeRecomendacoes([]))
    social.listarSugestoes.mockReset().mockResolvedValue(resposta([EMPILHADAS, PASSARO], [ARQUIPELAGO]))
    social.descartarSugestao.mockReset().mockResolvedValue()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mostra as duas seções rotuladas, com o motivo e sem quem leu, abaixo das recebidas', async () => {
    const { tela } = await abrir()

    const titulos = tela.findAll('h2').map((h) => h.text())
    expect(titulos).toEqual(['Recomendações recebidas', 'Quem você segue leu', 'Do seu gosto'])
    expect(tela.text()).toContain('4 pessoas que você segue leram')
    expect(tela.text()).toContain('Continuação de O Tempo e o Vento')
    expect(
      tela.get('a[aria-label^="Mulheres Empilhadas"]').attributes('aria-label'),
    ).toBe('Mulheres Empilhadas, de Patrícia Melo. 4 pessoas que você segue leram.')
    expect(social.listarSugestoes).toHaveBeenCalledWith()
  })

  it('seção vazia some inteira, e sem as duas a aterrissagem fica só com as recebidas', async () => {
    social.listarSugestoes.mockResolvedValue(resposta([], [ARQUIPELAGO]))
    const { tela, wrapper } = await abrir()

    expect(tela.text()).not.toContain('Quem você segue leu')
    expect(tela.text()).toContain('Do seu gosto')
    wrapper.unmount()
    document.body.innerHTML = ''

    social.listarSugestoes.mockResolvedValue(resposta([], []))
    const sem = await abrir()
    expect(sem.tela.findAll('h2').map((h) => h.text())).toEqual(['Recomendações recebidas'])
  })

  it('falha das sugestões mostra o banner sem título e não derruba as recebidas', async () => {
    social.listarSugestoes.mockReset().mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValue(resposta([EMPILHADAS], []))
    const { tela } = await abrir()

    expect(tela.text()).toContain('Não foi possível carregar as sugestões. Verifique sua conexão e tente de novo.')
    expect(tela.text()).toContain('Recomendações recebidas')
    expect(tela.text()).not.toContain('Quem você segue leu')

    const banner = tela.findAll('[role="alert"]').find((a) => a.text().includes('sugestões'))!
    await banner.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Mulheres Empilhadas')
  })

  it('Mostrar mais pede a continuação da seção pelo offset e some no fim', async () => {
    social.listarSugestoes.mockReset()
      .mockResolvedValueOnce(resposta([EMPILHADAS, PASSARO], [], 2))
      .mockResolvedValueOnce({ seguidos: { itens: [SOLITARIA], proximoOffset: null }, gosto: null })
    const { tela } = await abrir()

    await tela.findAll('button').find((b) => b.text() === 'Mostrar mais')!.trigger('click')
    await flushPromises()

    expect(social.listarSugestoes).toHaveBeenLastCalledWith('seguidos', 2)
    expect(tela.text()).toContain('Solitária')
    expect(tela.text()).toContain('1 sugestão carregada')
    expect(tela.findAll('button').some((b) => b.text() === 'Mostrar mais')).toBe(false)
  })

  it('falha ao carregar mais mantém os itens e oferece tentar de novo', async () => {
    social.listarSugestoes.mockReset()
      .mockResolvedValueOnce(resposta([EMPILHADAS, PASSARO], [], 2))
      .mockRejectedValueOnce(new TypeError('offline'))
    const { tela } = await abrir()

    await tela.findAll('button').find((b) => b.text() === 'Mostrar mais')!.trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Não foi possível carregar mais sugestões.')
    expect(tela.text()).toContain('O Peso do Pássaro Morto')
  })

  it('descarte tira o item, avisa e desce o offset para a próxima página não pular um livro', async () => {
    social.listarSugestoes.mockReset()
      .mockResolvedValueOnce(resposta([EMPILHADAS, PASSARO, SOLITARIA], [], 3))
      .mockResolvedValueOnce({ seguidos: { itens: [SOL], proximoOffset: null }, gosto: null })
    const { tela } = await abrir()

    await descartarPeloMenu(tela, 'O Peso do Pássaro Morto')
    await flushPromises()

    expect(social.descartarSugestao).toHaveBeenCalledWith('l2')
    expect(tela.text()).not.toContain('O Peso do Pássaro Morto')
    expect(tela.get('[role="status"].pointer-events-auto, [role="status"]:not(.sr-only)').text()).toContain('Sugestão descartada.')

    await tela.findAll('button').find((b) => b.text() === 'Mostrar mais')!.trigger('click')
    await flushPromises()
    expect(social.listarSugestoes).toHaveBeenLastCalledWith('seguidos', 2)
  })

  it('falha no descarte devolve o item e o toast oferece tentar de novo', async () => {
    social.descartarSugestao.mockReset().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce()
    const { tela } = await abrir()

    await descartarPeloMenu(tela, 'Mulheres Empilhadas')
    await flushPromises()

    expect(tela.text()).toContain('Mulheres Empilhadas')
    const alerta = tela.findAll('[role="alert"]').find((a) => a.text().includes('descartar a sugestão'))!
    await alerta.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(social.descartarSugestao).toHaveBeenCalledTimes(2)
    expect(tela.text()).not.toContain('Mulheres Empilhadas')
  })

  it('livro nas duas seções sai das duas ao ser descartado, e o offset de cada uma desce', async () => {
    const PASSARO_NO_GOSTO = { ...PASSARO, motivo: { tipo: 'AUTOR' as const, texto: 'Do mesmo autor de Pequena Coreografia do Adeus' } }
    social.listarSugestoes.mockReset()
      .mockResolvedValueOnce({
        seguidos: { itens: [EMPILHADAS, PASSARO], proximoOffset: 2 },
        gosto: { itens: [ARQUIPELAGO, PASSARO_NO_GOSTO], proximoOffset: 2 },
      })
      .mockResolvedValueOnce({ seguidos: null, gosto: { itens: [SOL], proximoOffset: null } })
    const { tela } = await abrir()

    await tela.get('[data-secao="seguidos"] button[aria-label="Mais ações para O Peso do Pássaro Morto"]').trigger('click')
    await tela.findAll('button').find((b) => b.text().startsWith('Descartar sugestão'))!.trigger('click')
    await flushPromises()

    expect(tela.text()).not.toContain('O Peso do Pássaro Morto')
    await tela.get('[data-secao="gosto"]').findAll('button').find((b) => b.text() === 'Mostrar mais')!.trigger('click')
    await flushPromises()
    expect(social.listarSugestoes).toHaveBeenLastCalledWith('gosto', 1)
  })

  it('descarte que volta 404 tira o item como no sucesso, sem oferecer tentar de novo', async () => {
    social.descartarSugestao.mockReset().mockRejectedValueOnce(new ApiError('Livro não encontrado.', 404, 'NAO_ENCONTRADO'))
    const { tela } = await abrir()

    await descartarPeloMenu(tela, 'Mulheres Empilhadas')
    await flushPromises()

    expect(tela.text()).not.toContain('Mulheres Empilhadas')
    expect(tela.findAll('[role="alert"]').some((a) => a.text().includes('descartar a sugestão'))).toBe(false)
    expect(tela.text()).toContain('Sugestão descartada.')
  })

  it('descarte confirmado enquanto a página seguinte vem desconta do offset que ela traz', async () => {
    let entregar!: (valor: Sugestoes) => void
    social.listarSugestoes.mockReset()
      .mockResolvedValueOnce(resposta([EMPILHADAS, PASSARO], [], 2))
      .mockReturnValueOnce(new Promise<Sugestoes>((resolve) => (entregar = resolve)))
      .mockResolvedValueOnce({ seguidos: { itens: [SOL], proximoOffset: null }, gosto: null })
    const { tela } = await abrir()

    await tela.findAll('button').find((b) => b.text() === 'Mostrar mais')!.trigger('click')
    await descartarPeloMenu(tela, 'Mulheres Empilhadas')
    await flushPromises()
    // O servidor montou esta página antes do descarte: o próximo seria 3, e agora é 2.
    entregar({ seguidos: { itens: [SOLITARIA], proximoOffset: 3 }, gosto: null })
    await flushPromises()

    await tela.findAll('button').find((b) => b.text() === 'Mostrar mais')!.trigger('click')
    await flushPromises()
    expect(social.listarSugestoes).toHaveBeenLastCalledWith('seguidos', 2)
    expect(tela.text()).toContain('O Sol na Cabeça')
  })
})
