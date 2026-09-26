import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api'
import { perfilService, type Perfil } from '../services/perfil'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/perfil', () => ({
  perfilService: { obterPerfil: vi.fn(), seguir: vi.fn(), deixarDeSeguir: vi.fn() },
}))

const servico = vi.mocked(perfilService)

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

  it('conteúdo visível: Estante e Resenhas vazias com texto neutro, sem o CTA do dono', async () => {
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()

    expect(wrapper.text()).toContain('Rafael ainda não tem livros na estante.')
    expect(wrapper.text()).toContain('Rafael ainda não escreveu resenhas.')
    expect(wrapper.findAll('[role="tab"]').map((aba) => aba.text())).toEqual(['Estante', 'Resenhas'])
    expect(wrapper.text()).not.toContain('Buscar livros')
    expect(wrapper.text()).not.toContain('livros lidos')
  })

  it('RN-08: com conteúdo restrito, as seções de leitura não aparecem', async () => {
    servico.obterPerfil.mockResolvedValue(PRIVADO)
    const { wrapper } = await montarNaRota('/leitores/bia.nogueira')
    await flushPromises()

    expect(wrapper.text()).toContain('Este perfil é privado')
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('ainda não tem livros na estante')
    expect(wrapper.text()).not.toContain('Resenhas')
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
})
