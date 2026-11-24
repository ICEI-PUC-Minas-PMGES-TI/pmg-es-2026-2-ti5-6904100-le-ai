import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { zerarSessaoDoDescarteEmLote } from '../../recomendacoes/sessaoDoDescarteEmLote'
import { socialService } from '../../services/social'
import { paginaDeRecomendacoes, recomendacao } from '../../testes/massaDeRecomendacoes'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/social', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/social')>()),
  socialService: {
    listarRecebidas: vi.fn(),
    descartarRecomendacao: vi.fn(),
    contarRestantesDoLivro: vi.fn(),
    descartarRecomendacoesDoLivro: vi.fn(),
  },
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

  describe('pergunta de descarte em lote (F-REC-ALG, RN-22.12/13)', () => {
    const RIO = ['Lívia Carvalho', 'Caio Rezende', 'Henrique Sampaio', 'Beatriz Okada', 'Júlia Figueiredo'].map(
      (quem, indice) => {
        const item = recomendacao(`rio${indice}`, 'Tudo É Rio', quem)
        return { ...item, livro: { ...item.livro, id: 'tudo-e-rio' } }
      },
    )

    beforeEach(() => {
      zerarSessaoDoDescarteEmLote()
      social.listarRecebidas.mockResolvedValue(paginaDeRecomendacoes([...RIO, ESTRELA]))
      social.descartarRecomendacao.mockResolvedValue()
      social.contarRestantesDoLivro.mockReset().mockResolvedValue(2)
      social.descartarRecomendacoesDoLivro.mockReset().mockResolvedValue(2)
    })

    async function descartarTres(tela: DOMWrapper<Element>) {
      for (let vez = 0; vez < 3; vez++) {
        await descartarPeloMenu(tela, 'Tudo É Rio')
        await flushPromises()
      }
    }

    it('só pergunta no terceiro descarte do mesmo livro, com quantas restam e sem o toast', async () => {
      const { tela } = await abrir()

      await descartarPeloMenu(tela, 'Tudo É Rio')
      await flushPromises()
      await descartarPeloMenu(tela, 'Tudo É Rio')
      await flushPromises()
      expect(social.contarRestantesDoLivro).not.toHaveBeenCalled()

      await descartarPeloMenu(tela, 'Tudo É Rio')
      await flushPromises()

      expect(social.contarRestantesDoLivro).toHaveBeenCalledWith('tudo-e-rio')
      const dialogo = tela.get('[role="dialog"]')
      expect(dialogo.text()).toContain('Deseja remover todas as recomendações atuais do livro Tudo É Rio?')
      expect(dialogo.text()).toContain('Ainda restam 2 recomendações deste livro na sua lista.')
      expect(document.activeElement?.textContent?.trim()).toBe('Agora não')
      expect(tela.text()).not.toContain('Recomendação descartada.')
    })

    it('Remover todas tira as restantes juntas, com a contagem e o toast do lote', async () => {
      const { tela } = await abrir()
      await descartarTres(tela)

      await tela.findAll('[role="dialog"] button').find((b) => b.text() === 'Remover todas')!.trigger('click')
      await flushPromises()

      const [livroId, chave] = social.descartarRecomendacoesDoLivro.mock.calls[0]!
      expect(livroId).toBe('tudo-e-rio')
      expect(chave).toEqual(expect.any(String))
      expect(tela.find('[role="dialog"]').exists()).toBe(false)
      expect(tela.findAll('li').some((li) => li.text().includes('Tudo É Rio'))).toBe(false)
      expect(tela.text()).toContain('1 recomendação')
      expect(tela.get('[role="status"]').text()).toContain('2 recomendações de Tudo É Rio descartadas.')
    })

    it('falha do lote mantém a pergunta aberta com o banner, e repetir usa a mesma chave', async () => {
      social.descartarRecomendacoesDoLivro.mockReset().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(2)
      const { tela } = await abrir()
      await descartarTres(tela)

      const remover = () => tela.findAll('[role="dialog"] button').find((b) => b.text() === 'Remover todas')!
      await remover().trigger('click')
      await flushPromises()

      expect(tela.get('[role="dialog"]').text()).toContain(
        'Não foi possível remover as recomendações. Verifique sua conexão e tente de novo.',
      )
      expect(tela.text()).toContain('2 recomendações')

      await remover().trigger('click')
      await flushPromises()

      const [primeira, segunda] = social.descartarRecomendacoesDoLivro.mock.calls
      expect(segunda![1]).toBe(primeira![1])
      expect(tela.find('[role="dialog"]').exists()).toBe(false)
    })

    it('Agora não suprime a pergunta daquele livro na sessão, e uma sessão nova volta a contar', async () => {
      const { tela, wrapper } = await abrir()
      await descartarTres(tela)

      await tela.findAll('[role="dialog"] button').find((b) => b.text() === 'Agora não')!.trigger('click')
      await flushPromises()
      await descartarPeloMenu(tela, 'Tudo É Rio')
      await flushPromises()

      expect(social.contarRestantesDoLivro).toHaveBeenCalledTimes(1)
      expect(tela.find('[role="dialog"]').exists()).toBe(false)
      expect(tela.get('[role="status"]').text()).toContain('Recomendação descartada.')

      wrapper.unmount()
      document.body.innerHTML = ''
      zerarSessaoDoDescarteEmLote()
      const nova = await abrir()
      await descartarTres(nova.tela)
      expect(social.contarRestantesDoLivro).toHaveBeenCalledTimes(2)
    })

    it('sem restantes no terceiro descarte, é um descarte comum', async () => {
      social.contarRestantesDoLivro.mockResolvedValue(0)
      const { tela } = await abrir()
      await descartarTres(tela)

      expect(tela.find('[role="dialog"]').exists()).toBe(false)
      expect(tela.get('[role="status"]').text()).toContain('Recomendação descartada.')
    })

    it('o mesmo descarte repetido depois de uma falha conta uma vez só', async () => {
      social.descartarRecomendacao.mockReset()
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new TypeError('offline'))
        .mockResolvedValue()
      const { tela } = await abrir()

      await descartarPeloMenu(tela, 'Tudo É Rio')
      await flushPromises()
      await descartarPeloMenu(tela, 'Tudo É Rio')
      await flushPromises()
      await tela.findAll('[role="alert"] button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
      await flushPromises()

      expect(social.contarRestantesDoLivro).not.toHaveBeenCalled()
    })
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
