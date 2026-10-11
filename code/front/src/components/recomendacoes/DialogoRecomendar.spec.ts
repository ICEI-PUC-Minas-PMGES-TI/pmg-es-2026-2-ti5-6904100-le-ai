import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import { socialService, type CandidatoARecomendacao } from '../../services/social'
import DialogoRecomendar from './DialogoRecomendar.vue'

vi.mock('../../services/social', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/social')>()),
  socialService: { listarCandidatos: vi.fn(), recomendar: vi.fn() },
}))

const push = vi.fn()
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
}))

const social = vi.mocked(socialService)

const LIVRO = { id: 'l1', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null }

function leitor(id: string, nomeExibicao: string, username: string, extra: Partial<CandidatoARecomendacao> = {}) {
  return { leitor: { id, nomeExibicao, username, avatarUrl: null }, jaTemLivro: false, limiteAtingido: false, ...extra }
}

const BEATRIZ = leitor('u-bia', 'Beatriz Okada', 'biaokada', { jaTemLivro: true })
const CAIO = leitor('u-caio', 'Caio Rezende', 'caiorezende')
const DANIEL = leitor('u-dani', 'Daniel Ferraz', 'danielferraz', { limiteAtingido: true })
const JULIA = leitor('u-ju', 'Júlia Figueiredo', 'juliafigueiredo')
const LIVIA = leitor('u-li', 'Lívia Carvalho', 'liviacarvalho')

function montar() {
  const wrapper = mount(DialogoRecomendar, { props: { livro: LIVRO }, attachTo: document.body })
  return { wrapper, tela: new DOMWrapper(document.body) }
}

function linha(tela: DOMWrapper<Element>, nome: string) {
  return tela.findAll('[aria-label]').find((elemento) => elemento.attributes('aria-label')!.startsWith(nome))!
}

function botaoDeEnvio(tela: DOMWrapper<Element>) {
  return tela.findAll('footer button').at(-1)!
}

describe('DialogoRecomendar', () => {
  beforeEach(() => {
    social.listarCandidatos.mockReset().mockResolvedValue([BEATRIZ, CAIO, DANIEL, JULIA, LIVIA])
    social.recomendar.mockReset()
    push.mockReset()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mostra quem já tem o livro e quem atingiu o limite com o motivo, sem deixar escolher', async () => {
    const { tela } = montar()
    await flushPromises()

    expect(social.listarCandidatos).toHaveBeenCalledWith('l1')
    expect(linha(tela, 'Beatriz Okada').attributes('aria-label')).toBe(
      'Beatriz Okada, já tem esse livro em sua estante, indisponível',
    )
    expect(linha(tela, 'Daniel Ferraz').text()).toContain('Limite de recomendações para esta pessoa')
    expect(linha(tela, 'Beatriz Okada').element.tagName).not.toBe('BUTTON')
    expect(tela.text()).toContain('Nenhum escolhido')
    expect(botaoDeEnvio(tela).attributes('disabled')).toBeDefined()
  })

  it('a busca filtra sem acento e sem @, e a escolha fora do filtro continua valendo', async () => {
    const { tela } = montar()
    await flushPromises()
    await linha(tela, 'Júlia Figueiredo').trigger('click')

    await tela.get('input[type="search"]').setValue('@livia')

    expect(tela.text()).toContain('Lívia Carvalho')
    expect(tela.text()).not.toContain('Caio Rezende')
    expect(tela.text()).toContain('1 escolhido')
    expect(botaoDeEnvio(tela).text()).toBe('Enviar para 1 leitor')

    await tela.get('input[type="search"]').setValue('ninguem')
    expect(tela.text()).toContain('Ninguém com esse nome entre os leitores que você segue e que seguem você.')
  })

  it('mensagem acima de 280 caracteres troca o helper pelo erro e bloqueia o envio', async () => {
    const { tela } = montar()
    await flushPromises()
    await linha(tela, 'Caio Rezende').trigger('click')

    await tela.get('textarea').setValue('a'.repeat(281))

    expect(tela.text()).toContain('A mensagem passou do limite de 280 caracteres.')
    expect(botaoDeEnvio(tela).attributes('disabled')).toBeDefined()
  })

  it('envio aceito para todos fecha a tela e avisa com os nomes, mandando a mensagem sem espaços', async () => {
    social.recomendar.mockResolvedValue({
      resultados: [
        { destinatarioId: 'u-caio', status: 'CRIADA', recomendacaoId: 'r1', motivo: null },
        { destinatarioId: 'u-ju', status: 'CRIADA', recomendacaoId: 'r2', motivo: null },
      ],
      totalCriadas: 2,
    })
    const { wrapper, tela } = montar()
    await flushPromises()
    await linha(tela, 'Caio Rezende').trigger('click')
    await linha(tela, 'Júlia Figueiredo').trigger('click')
    await tela.get('textarea').setValue('  Lembrei de você.  ')

    await botaoDeEnvio(tela).trigger('click')
    await flushPromises()

    expect(social.recomendar).toHaveBeenCalledWith(
      { livroId: 'l1', destinatarios: ['u-caio', 'u-ju'], mensagem: 'Lembrei de você.' },
      expect.any(String),
    )
    expect(wrapper.emitted('fechar')).toHaveLength(1)
    expect(wrapper.emitted('enviada')).toEqual([['Recomendação enviada para Caio Rezende e Júlia Figueiredo.']])
  })

  it('com três ou mais, o aviso conta os leitores', async () => {
    social.recomendar.mockResolvedValue({
      resultados: ['u-caio', 'u-ju', 'u-li'].map((id, i) => ({
        destinatarioId: id,
        status: 'CRIADA' as const,
        recomendacaoId: `r${i}`,
        motivo: null,
      })),
      totalCriadas: 3,
    })
    const { wrapper, tela } = montar()
    await flushPromises()
    for (const nome of ['Caio Rezende', 'Júlia Figueiredo', 'Lívia Carvalho']) {
      await linha(tela, nome).trigger('click')
    }

    await botaoDeEnvio(tela).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('enviada')).toEqual([['Recomendação enviada para 3 leitores.']])
  })

  it('envio em parte mantém a tela aberta, diz quem não recebeu e troca o botão por Concluir', async () => {
    social.recomendar.mockResolvedValue({
      resultados: [
        { destinatarioId: 'u-caio', status: 'BLOQUEADA', recomendacaoId: null, motivo: 'JA_TEM_LIVRO' },
        { destinatarioId: 'u-ju', status: 'CRIADA', recomendacaoId: 'r2', motivo: null },
      ],
      totalCriadas: 1,
    })
    const { wrapper, tela } = montar()
    await flushPromises()
    await linha(tela, 'Caio Rezende').trigger('click')
    await linha(tela, 'Júlia Figueiredo').trigger('click')

    await botaoDeEnvio(tela).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('fechar')).toBeUndefined()
    expect(tela.get('[role="alert"]').text()).toBe(
      'Recomendação enviada para Júlia Figueiredo. Caio Rezende já tem esse livro em sua estante e não recebeu.',
    )
    expect(linha(tela, 'Júlia Figueiredo').attributes('aria-label')).toBe('Júlia Figueiredo, recomendação enviada')
    expect(linha(tela, 'Caio Rezende').attributes('aria-label')).toContain('indisponível')
    expect(botaoDeEnvio(tela).text()).toBe('Concluir')

    await botaoDeEnvio(tela).trigger('click')
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })

  it('limite de frequência avisa sem perder a escolha; falha de rede repete a mesma chave', async () => {
    social.recomendar
      .mockRejectedValueOnce(new ApiError('Muitas', 429, 'MUITAS_REQUISICOES'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { tela } = montar()
    await flushPromises()
    await linha(tela, 'Caio Rezende').trigger('click')

    await botaoDeEnvio(tela).trigger('click')
    await flushPromises()
    expect(tela.text()).toContain('Você enviou muitas recomendações em pouco tempo.')
    expect(botaoDeEnvio(tela).text()).toBe('Enviar para 1 leitor')

    await botaoDeEnvio(tela).trigger('click')
    await flushPromises()
    expect(tela.text()).toContain('Não foi possível enviar a recomendação.')
    expect(social.recomendar.mock.calls[1]![1]).toBe(social.recomendar.mock.calls[0]![1])
  })

  it('falha ao carregar os leitores oferece tentar de novo', async () => {
    social.listarCandidatos.mockReset().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValue([CAIO])
    const { tela } = montar()
    await flushPromises()

    expect(tela.text()).toContain('Não foi possível carregar seus leitores.')
    await tela.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(tela.text()).toContain('Caio Rezende')
  })

  it('sem mútuos explica a regra e leva à busca de leitores', async () => {
    social.listarCandidatos.mockReset().mockResolvedValue([])
    const { wrapper, tela } = montar()
    await flushPromises()

    expect(tela.text()).toContain('Ninguém para recomendar ainda')
    expect(tela.find('footer').exists()).toBe(false)
    await tela.findAll('button').find((b) => b.text() === 'Buscar leitores')!.trigger('click')

    expect(push).toHaveBeenCalledWith('/perfil/buscar')
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })

  it('fechar sem nada escolhido sai direto; com escolha, pede confirmação antes', async () => {
    const { wrapper, tela } = montar()
    await flushPromises()

    await linha(tela, 'Caio Rezende').trigger('click')
    await tela.get('[data-fechar]').trigger('click')
    expect(wrapper.emitted('fechar')).toBeUndefined()
    expect(tela.text()).toContain('Descartar esta recomendação?')

    await tela.findAll('button').find((b) => b.text() === 'Descartar')!.trigger('click')
    expect(wrapper.emitted('fechar')).toHaveLength(1)
  })
})
