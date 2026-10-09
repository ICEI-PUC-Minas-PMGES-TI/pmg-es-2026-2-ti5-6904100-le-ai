import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import { leituraService, type ResenhaDoPerfil } from '../../services/leitura'
import { listasService } from '../../services/listas'
import { perfilService, type Perfil } from '../../services/perfil'
import { itemEstante, paginaEstante } from '../../testes/estante'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/perfil', () => ({
  perfilService: { obterPerfil: vi.fn(), seguir: vi.fn(), deixarDeSeguir: vi.fn() },
}))

vi.mock('../../services/leitura', () => ({
  leituraService: { listarEstantePerfil: vi.fn(), listarResenhasPerfil: vi.fn() },
}))

vi.mock('../../services/listas', () => ({
  listasService: { listarDoPerfil: vi.fn() },
}))

const servico = vi.mocked(perfilService)
const leitura = vi.mocked(leituraService)
const listas = vi.mocked(listasService)

function resenhaDoPerfil(extras: Partial<ResenhaDoPerfil> = {}): ResenhaDoPerfil {
  return {
    id: 'r1',
    usuarioId: 'u2',
    livroId: 'livro-1',
    texto: 'A terra e a fala são a mesma disputa.',
    spoiler: false,
    criadoEm: '2026-09-12T12:00:00Z',
    atualizadoEm: '2026-09-12T12:00:00Z',
    livro: { id: 'livro-1', tipo: 'oficial', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null },
    nota: 4.5,
    curtidas: 0,
    descurtidas: 0,
    minhaReacao: null,
    ...extras,
  }
}

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
    leitura.listarResenhasPerfil.mockReset().mockResolvedValue({ itens: [], paginacao: { page: 1, limite: 5, totalItens: 0, totalPaginas: 0 } })
    localStorage.clear()
    servico.obterPerfil.mockReset().mockResolvedValue(PUBLICO)
    listas.listarDoPerfil.mockReset().mockResolvedValue({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
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

  it('conteúdo visível: Estante e Resenhas vazias com texto neutro, sem o CTA do dono', async () => {
    leitura.listarEstantePerfil.mockResolvedValue(paginaEstante([]))
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()

    expect(wrapper.text()).toContain('Rafael ainda não adicionou livros à estante.')
    expect(wrapper.text()).toContain('Rafael ainda não escreveu resenhas.')
    expect(wrapper.findAll('[role="tab"]').map((aba) => aba.text())).toEqual(['Estante', 'Resenhas', 'Listas'])
    expect(wrapper.text()).toContain('Rafael ainda não criou listas.')
    expect(listas.listarDoPerfil).toHaveBeenCalledWith('u2', 0)
    expect(wrapper.text()).not.toContain('Buscar livros')
    expect(wrapper.text()).not.toContain('livros lidos')
  })

  it('resenhas do perfil: card com livro, estrelas e trecho, e o livro abre na aba Perfil', async () => {
    leitura.listarResenhasPerfil.mockResolvedValue({
      itens: [resenhaDoPerfil()],
      paginacao: { page: 1, limite: 5, totalItens: 1, totalPaginas: 1 },
    })
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()

    expect(leitura.listarResenhasPerfil).toHaveBeenCalledWith('u2', 1, 5)
    expect(wrapper.text()).toContain('Torto Arado')
    expect(wrapper.text()).toContain('A terra e a fala são a mesma disputa.')
    expect(wrapper.find('[aria-label="4,5 de 5"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/livros/livro-1?origem=perfil"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Rafael ainda não escreveu resenhas.')
  })

  it('resenha com spoiler de outro leitor fica fora do DOM até a ação', async () => {
    leitura.listarResenhasPerfil.mockResolvedValue({
      itens: [resenhaDoPerfil({ spoiler: true, texto: 'O final revela tudo.' })],
      paginacao: { page: 1, limite: 5, totalItens: 1, totalPaginas: 1 },
    })
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()

    expect(wrapper.html()).not.toContain('O final revela tudo.')
    await wrapper.findAll('button').find((b) => b.text() === 'Mostrar mesmo assim')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('O final revela tudo.')
    // O botão sai do DOM; o foco vai para o texto, para o leitor de tela continuar dali.
    expect(document.activeElement?.textContent).toContain('O final revela tudo.')
  })

  it('"Ver mais resenhas" traz a página seguinte', async () => {
    leitura.listarResenhasPerfil
      .mockResolvedValueOnce({
        itens: [resenhaDoPerfil()],
        paginacao: { page: 1, limite: 5, totalItens: 2, totalPaginas: 2 },
      })
      .mockResolvedValueOnce({
        itens: [resenhaDoPerfil({ id: 'r2', texto: 'Segunda resenha.' })],
        paginacao: { page: 2, limite: 5, totalItens: 2, totalPaginas: 2 },
      })
    const { wrapper } = await montarNaRota('/leitores/rafaokamoto')
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Ver mais resenhas')!.trigger('click')
    await flushPromises()

    expect(leitura.listarResenhasPerfil).toHaveBeenLastCalledWith('u2', 2, 5)
    expect(wrapper.text()).toContain('Segunda resenha.')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Ver mais resenhas')).toBe(false)
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
    expect(wrapper.text()).toContain('Envie uma solicitação para ver a estante, as resenhas e as listas de Beatriz.')
    // RN-08: nada das listas de um perfil restrito, nem a chamada.
    expect(listas.listarDoPerfil).not.toHaveBeenCalled()
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
    const secao = wrapper.get('section[id$="-painel-estante"]')
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
