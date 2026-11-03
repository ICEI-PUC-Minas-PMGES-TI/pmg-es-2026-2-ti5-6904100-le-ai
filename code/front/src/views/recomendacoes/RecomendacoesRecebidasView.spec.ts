import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { socialService } from '../../services/social'
import { paginaDeRecomendacoes, recomendacao } from '../../testes/massaDeRecomendacoes'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/social', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/social')>()),
  socialService: { listarRecebidas: vi.fn(), descartarRecomendacao: vi.fn() },
}))

const social = vi.mocked(socialService)

const ESTRELA = recomendacao('r1', 'A Hora da Estrela', 'Júlia Figueiredo', 'Curtinho e devastador.')
const DESPEJO = recomendacao('r2', 'Quarto de Despejo', 'Caio Rezende')

async function abrir() {
  const montagem = await montarNaRota('/descobrir/recomendacoes')
  await flushPromises()
  return { ...montagem, tela: new DOMWrapper(document.body) }
}

async function descartarPeloMenu(tela: DOMWrapper<Element>, titulo: string) {
  await tela.get(`button[aria-label^="Mais ações para ${titulo}"]`).trigger('click')
  await tela.findAll('button').find((b) => b.text().startsWith('Descartar recomendação'))!.trigger('click')
}

describe('RecomendacoesRecebidasView', () => {
  beforeEach(() => {
    social.listarRecebidas.mockReset().mockResolvedValue(paginaDeRecomendacoes([ESTRELA, DESPEJO]))
    social.descartarRecomendacao.mockReset()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lista com a regra, a contagem, a mensagem inteira e o fim da lista', async () => {
    const { tela } = await abrir()

    expect(tela.text()).toContain('Recomendações saem daqui depois de 90 dias ou quando você põe o livro na estante.')
    expect(tela.text()).toContain('2 recomendações')
    expect(tela.text()).toContain('Curtinho e devastador.')
    expect(tela.text()).toContain('Essas são todas as suas recomendações.')
  })

  it('descarte sem confirmação deixa o item esmaecido até o servidor responder e depois o tira', async () => {
    let concluir!: () => void
    social.descartarRecomendacao.mockReturnValue(new Promise<void>((resolve) => (concluir = resolve)))
    const { tela } = await abrir()

    await descartarPeloMenu(tela, 'A Hora da Estrela')
    expect(tela.findAll('li').find((li) => li.text().includes('A Hora da Estrela'))!.classes()).toContain('opacity-50')

    concluir()
    await flushPromises()

    expect(social.descartarRecomendacao).toHaveBeenCalledWith('r1', expect.any(String))
    expect(tela.text()).not.toContain('A Hora da Estrela')
    expect(tela.text()).toContain('1 recomendação')
    expect(tela.get('[role="status"]').text()).toContain('Recomendação descartada.')
  })

  it('falha no descarte devolve o item e o toast persistente repete com a mesma chave', async () => {
    social.descartarRecomendacao.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce()
    const { tela } = await abrir()

    await descartarPeloMenu(tela, 'Quarto de Despejo')
    await flushPromises()

    expect(tela.text()).toContain('Quarto de Despejo')
    expect(tela.get('[role="alert"]').text()).toContain(
      'Não foi possível descartar a recomendação. Verifique sua conexão e tente de novo.',
    )

    await tela.findAll('[role="alert"] button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    const [primeira, segunda] = social.descartarRecomendacao.mock.calls
    expect(segunda![1]).toBe(primeira![1])
    expect(tela.text()).not.toContain('Quarto de Despejo')
  })

  it('o menu leva ao perfil de quem recomendou', async () => {
    const { tela, router } = await abrir()

    await tela.get('button[aria-label^="Mais ações para A Hora da Estrela"]').trigger('click')
    await tela.findAll('button').find((b) => b.text() === 'Ver perfil de Júlia Figueiredo')!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/leitores/júliafigueiredo')
  })

  it('sem recomendações mostra o vazio que volta para o Descobrir', async () => {
    social.listarRecebidas.mockResolvedValue(paginaDeRecomendacoes([]))
    const { tela } = await abrir()

    expect(tela.text()).toContain('Nenhuma recomendação agora')
    expect(tela.text()).not.toContain('Essas são todas')
  })

  it('falha ao carregar oferece tentar de novo', async () => {
    social.listarRecebidas.mockReset().mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValue(paginaDeRecomendacoes([DESPEJO]))
    const { tela } = await abrir()

    expect(tela.text()).toContain('Não foi possível carregar suas recomendações.')
    await tela.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Quarto de Despejo')
  })
})
