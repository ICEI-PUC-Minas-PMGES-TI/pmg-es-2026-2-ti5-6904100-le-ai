import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import { leituraService } from '../services/leitura'
import { perfilService, type Perfil } from '../services/perfil'
import { itemEstante, paginaEstante } from '../testes/estante'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/perfil', () => ({
  perfilService: { obterPerfil: vi.fn(), seguir: vi.fn(), deixarDeSeguir: vi.fn() },
}))

vi.mock('../services/leitura', () => ({
  leituraService: { listarEstantePerfil: vi.fn() },
}))

const servico = vi.mocked(perfilService)
const leitura = vi.mocked(leituraService)

const PUBLICO: Perfil = {
  id: 'u2',
  username: 'rafaokamoto',
  displayName: 'Rafael Okamoto',
  avatarUrl: null,
  privacidade: 'publico',
  conteudoRestrito: false,
  relacao: 'nenhuma',
  biografia: 'Professor de história.',
  contadores: { seguidores: 212, seguidos: 148 },
}

const PRIVADO: Perfil = {
  ...PUBLICO,
  id: 'u3',
  username: 'bia.nogueira',
  displayName: 'Beatriz Nogueira',
  privacidade: 'privado',
  conteudoRestrito: true,
  biografia: 'Tradutora.',
  contadores: { seguidores: 57, seguidos: 63 },
}

type Wrapper = Awaited<ReturnType<typeof montarNaRota>>['wrapper']

function botao(wrapper: Wrapper, texto: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(texto))!
}

function botaoNoCorpo(texto: string) {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)!
}

describe('PerfilDeOutroView', () => {
  beforeEach(() => {
    localStorage.clear()
    servico.obterPerfil.mockReset().mockResolvedValue(PUBLICO)
    servico.seguir.mockReset()
    servico.deixarDeSeguir.mockReset().mockResolvedValue(undefined)
    leitura.listarEstantePerfil
      .mockReset()
      .mockResolvedValue(paginaEstante([itemEstante('l1', 'Os Sertões', { status: 'LIDO', vezesLido: 1 })]))
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('público, não sigo: identidade pública e Seguir tem efeito imediato', async () => {
    servico.seguir.mockResolvedValue({ estado: 'seguindo', solicitacaoId: null })
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()

    expect(servico.obterPerfil).toHaveBeenCalledWith('rafaokamoto')
    expect(wrapper.text()).toContain('Rafael Okamoto')
    expect(wrapper.text()).toContain('Perfil público')
    expect(wrapper.text()).toContain('Professor de história.')
    expect(wrapper.text()).not.toContain('Este perfil é privado')
    // Contadores de terceiros não são links: não há lista do grafo alheio.
    expect(wrapper.find('a[href*="conexoes"]').exists()).toBe(false)

    await botao(wrapper, 'Seguir').trigger('click')
    await flushPromises()

    expect(servico.seguir).toHaveBeenCalledWith('rafaokamoto', expect.any(String))
    expect(botao(wrapper, 'Seguindo')).toBeDefined()
    expect(wrapper.find('[aria-label="213 seguidores"]').exists()).toBe(true)
  })

  it('privado, não sigo: bloco de restrição que não é erro, e o pedido fica aguardando', async () => {
    servico.obterPerfil.mockResolvedValue(PRIVADO)
    servico.seguir.mockResolvedValue({ estado: 'solicitacao_pendente', solicitacaoId: 's1' })
    const { wrapper } = await montarNaRota('/leitores/bia.nogueira')
    await flushPromises()

    expect(wrapper.text()).toContain('Este perfil é privado')
    expect(wrapper.text()).toContain('Envie uma solicitação para ver a estante e as resenhas de Beatriz.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    await botao(wrapper, 'Solicitar para seguir').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Solicitação enviada')
    expect(wrapper.text()).toContain('Sua solicitação está aguardando resposta.')
  })

  it('seguindo: desfazer pede confirmação com a consequência, sem pronome de gênero', async () => {
    servico.obterPerfil.mockResolvedValue({ ...PRIVADO, relacao: 'seguindo', conteudoRestrito: false })
    const { wrapper } = await montarNaRota('/leitores/bia.nogueira')
    await flushPromises()

    expect(wrapper.text()).toContain('Você vê este perfil porque segue Beatriz.')
    await botao(wrapper, 'Seguindo').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Deixar de seguir Beatriz?')
    expect(document.body.textContent).toContain('As atividades dessa pessoa saem do seu feed, e você perde o acesso')
    expect(servico.deixarDeSeguir).not.toHaveBeenCalled()

    botaoNoCorpo('Deixar de seguir').click()
    await flushPromises()

    expect(servico.deixarDeSeguir).toHaveBeenCalledWith('bia.nogueira', expect.any(String))
    expect(wrapper.text()).toContain('Solicitar para seguir')
    expect(wrapper.text()).toContain('Este perfil é privado')
  })

  it('pedido recebido tem a linha para a caixa, e o botão de relação não muda', async () => {
    servico.obterPerfil.mockResolvedValue({ ...PUBLICO, relacao: 'solicitacao_recebida' })
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()

    expect(wrapper.get('a[href="/perfil/solicitacoes"]').text()).toContain('Rafael pediu para seguir você.')
    expect(botao(wrapper, 'Seguir')).toBeDefined()
    expect(wrapper.text()).not.toContain('Aceitar')
  })

  it('404 é "Perfil não encontrado", igual para inexistente e oculto', async () => {
    servico.obterPerfil.mockRejectedValue(new ApiError('Não encontramos esse leitor.', 404, 'RECURSO_NAO_ENCONTRADO'))
    const { wrapper } = await montarNaRota('/leitores/ninguem')
    await flushPromises()

    expect(wrapper.text()).toContain('Perfil não encontrado')
    expect(wrapper.get('a[href="/perfil/buscar"]').text()).toBe('Buscar leitor')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('o próprio username abre o próprio perfil', async () => {
    servico.obterPerfil.mockResolvedValue({ ...PUBLICO, relacao: 'proprio' })
    const { router } = await montarNaRota('/leitores/marinableu')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/perfil')
  })

  it('409 ao seguir recarrega o estado do servidor', async () => {
    servico.obterPerfil.mockResolvedValueOnce(PUBLICO).mockResolvedValueOnce({ ...PUBLICO, relacao: 'seguindo' })
    servico.seguir.mockRejectedValue(new ApiError('Você já segue esse leitor.', 409, 'CONFLITO'))
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()

    await botao(wrapper, 'Seguir').trigger('click')
    await flushPromises()

    expect(servico.obterPerfil).toHaveBeenCalledTimes(2)
    expect(botao(wrapper, 'Seguindo')).toBeDefined()
  })

  it('estante visível: cards só leitura com a estante do perfil, paginada', async () => {
    leitura.listarEstantePerfil
      .mockResolvedValueOnce(paginaEstante([itemEstante('l1', 'Os Sertões', { status: 'LIDO', vezesLido: 1 })], { totalPaginas: 2, totalItens: 2 }))
      .mockResolvedValueOnce(paginaEstante([itemEstante('l2', 'O Cortiço')], { page: 2, totalPaginas: 2, totalItens: 2 }))
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()

    expect(leitura.listarEstantePerfil).toHaveBeenCalledWith('u2', { page: 1 })
    const secao = wrapper.get('section[aria-labelledby="titulo-estante-do-perfil"]')
    expect(secao.text()).toContain('Os Sertões')
    expect(secao.text()).toContain('Lido 1 vez')
    expect(secao.findAll('li button')).toHaveLength(0)

    await botao(wrapper, 'Carregar mais').trigger('click')
    await flushPromises()
    expect(leitura.listarEstantePerfil).toHaveBeenLastCalledWith('u2', { page: 2 })
    expect(secao.findAll('li')).toHaveLength(2)
  })

  it('perfil restrito não pede a estante; 403 do leitura vira o bloco de perfil privado', async () => {
    servico.obterPerfil.mockResolvedValue(PRIVADO)
    const { wrapper } = await montarNaRota('/leitores/bia.nogueira')
    await flushPromises()
    expect(leitura.listarEstantePerfil).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Este perfil é privado')

    document.body.innerHTML = ''
    servico.obterPerfil.mockResolvedValue({ ...PRIVADO, conteudoRestrito: false })
    leitura.listarEstantePerfil.mockRejectedValue(new ApiError('Proibido.', 403, 'PROIBIDO'))
    const outra = await montarNaRota('/leitores/bia.nogueira')
    await flushPromises()
    expect(outra.wrapper.text()).toContain('Este perfil é privado')
    expect(outra.wrapper.text()).not.toContain('Não foi possível carregar a estante')
    expect(outra.wrapper.find('section[aria-labelledby="titulo-estante-do-perfil"]').exists()).toBe(false)
  })

  it('404 do leitura esconde a seção; outra falha mostra erro com Tentar de novo', async () => {
    leitura.listarEstantePerfil.mockRejectedValueOnce(new ApiError('Não encontrado.', 404, 'NAO_ENCONTRADO'))
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()
    expect(wrapper.find('section[aria-labelledby="titulo-estante-do-perfil"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Este perfil é privado')

    document.body.innerHTML = ''
    leitura.listarEstantePerfil.mockRejectedValueOnce(new ApiError('Falha.', 0, 'SERVICO_INDISPONIVEL'))
    const outra = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()
    expect(outra.wrapper.text()).toContain('Não foi possível carregar a estante. Verifique sua conexão e tente de novo.')
    await outra.wrapper.findAll('button').filter((b) => b.text() === 'Tentar de novo').at(-1)!.trigger('click')
    await flushPromises()
    expect(outra.wrapper.text()).toContain('Os Sertões')
  })

  it('estante vazia do perfil fala com o primeiro nome', async () => {
    leitura.listarEstantePerfil.mockResolvedValue(paginaEstante([]))
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()
    expect(wrapper.text()).toContain('Rafael ainda não adicionou livros à estante.')
  })
})
