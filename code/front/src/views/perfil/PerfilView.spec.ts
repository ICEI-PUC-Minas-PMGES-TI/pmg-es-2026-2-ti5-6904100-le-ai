import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import { leituraService } from '../../services/leitura'
import { perfilService, type Perfil } from '../../services/perfil'
import { itemEstante, paginaEstante } from '../../testes/estante'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/perfil', () => ({ perfilService: { obterMeuPerfil: vi.fn(), listarSolicitacoes: vi.fn() } }))

vi.mock('../../services/leitura', () => ({
  leituraService: { listarEstantePerfil: vi.fn(), listarResenhasPerfil: vi.fn() },
}))

const servico = vi.mocked(perfilService)
const leitura = vi.mocked(leituraService)

const PERFIL: Perfil = {
  id: 'u1',
  username: 'marinableu',
  displayName: 'Marina Beltrão',
  avatarUrl: null,
  privacidade: 'publico',
  conteudoRestrito: false,
  relacao: 'proprio',
  biografia: 'Leio ficção brasileira contemporânea.',
  contadores: { seguidores: 84, seguidos: 1 },
}

describe('PerfilView', () => {
  // O dono vê o próprio texto mesmo com spoiler.
  it('as próprias resenhas aparecem com o texto, mesmo com spoiler', async () => {
    leitura.listarResenhasPerfil.mockResolvedValue({
      itens: [
        {
          id: 'r1',
          usuarioId: 'u1',
          livroId: 'livro-1',
          texto: 'Minha leitura com spoiler.',
          spoiler: true,
          criadoEm: '2026-09-12T12:00:00Z',
          atualizadoEm: '2026-09-12T12:00:00Z',
          livro: { id: 'livro-1', tipo: 'oficial', titulo: 'Torto Arado', autor: null, capaUrl: null },
          nota: null,
          curtidas: 3,
          descurtidas: 0,
          minhaReacao: null,
        },
      ],
      paginacao: { page: 1, limite: 5, totalItens: 1, totalPaginas: 1 },
    })
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(leitura.listarResenhasPerfil).toHaveBeenCalledWith('u1', 1, 5)
    expect(wrapper.text()).toContain('Minha leitura com spoiler.')
    expect(wrapper.text()).not.toContain('Esta resenha contém spoiler')
  })

  beforeEach(() => {
    localStorage.clear()
    servico.obterMeuPerfil.mockReset().mockResolvedValue(PERFIL)
    leitura.listarResenhasPerfil.mockReset().mockResolvedValue({ itens: [], paginacao: { page: 1, limite: 5, totalItens: 0, totalPaginas: 0 } })
    leitura.listarEstantePerfil.mockReset().mockResolvedValue(paginaEstante([]))
    servico.listarSolicitacoes
      .mockReset()
      .mockResolvedValue({ items: [], page: 0, size: 1, totalElements: 0, totalPages: 0 })
  })

  it('contadores levam às listas, a lupa à busca, e pedidos pendentes têm linha própria', async () => {
    servico.listarSolicitacoes.mockResolvedValue({ items: [], page: 0, size: 1, totalElements: 3, totalPages: 3 })
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(servico.listarSolicitacoes).toHaveBeenCalledWith(0, 1)
    expect(wrapper.get('a[href="/perfil/conexoes?aba=seguidores"]').attributes('aria-label')).toBe('84 seguidores')
    expect(wrapper.get('a[href="/perfil/conexoes?aba=seguidos"]').attributes('aria-label')).toBe('1 seguindo')
    expect(wrapper.get('a[href="/perfil/solicitacoes"]').text()).toBe('3 solicitações para seguir você')
    expect(wrapper.find('a[aria-label="Buscar leitor"]').exists()).toBe(true)
  })

  it('sem pedidos, ou se a contagem falhar, a linha não aparece', async () => {
    servico.listarSolicitacoes.mockRejectedValue(new Error('rede'))
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(wrapper.find('a[href="/perfil/solicitacoes"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Marina Beltrão')
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mostra identidade, chip público, biografia e os contadores com unidade', async () => {
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Perfil')
    expect(wrapper.text()).toContain('Marina Beltrão')
    expect(wrapper.text()).toContain('@marinableu')
    expect(wrapper.text()).toContain('Perfil público')
    expect(wrapper.text()).toContain('Leio ficção brasileira contemporânea.')
    expect(wrapper.find('[aria-label="84 seguidores"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="1 seguindo"]').exists()).toBe(true)
    expect(wrapper.get('a[href="/perfil/editar"]').text()).toBe('Editar perfil')
    // Sem o dado de `leitura` ainda: nada de contador de livros lidos.
    expect(wrapper.text()).not.toContain('livros lidos')
  })

  it('Estante e Resenhas aparecem no estado vazio, com o CTA para Descobrir e as abas na web', async () => {
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(wrapper.text()).toContain('Os livros que você adicionar aparecem aqui.')
    expect(wrapper.findAll('a[href="/descobrir"]').some((link) => link.text() === 'Buscar livros')).toBe(true)
    expect(wrapper.text()).toContain('Suas resenhas aparecem aqui depois que você escrever a primeira.')

    const [estante, resenhas] = wrapper.findAll('[role="tab"]')
    expect(estante.text()).toBe('Estante')
    expect(estante.attributes('aria-selected')).toBe('true')
    expect(resenhas.attributes('aria-selected')).toBe('false')
    const [painelDaEstante, painelDasResenhas] = wrapper.findAll('[role="tabpanel"]')
    expect(painelDasResenhas.classes()).toContain('md:hidden')

    await resenhas.trigger('click')

    expect(resenhas.attributes('aria-selected')).toBe('true')
    expect(painelDaEstante.classes()).toContain('md:hidden')
    expect(painelDasResenhas.classes()).not.toContain('md:hidden')
  })

  it('a própria estante aparece em cards só leitura, paginada, no lugar do vazio', async () => {
    leitura.listarEstantePerfil
      .mockResolvedValueOnce(paginaEstante([itemEstante('l1', 'Dom Casmurro', { status: 'LENDO' })], { totalPaginas: 2, totalItens: 2 }))
      .mockResolvedValueOnce(paginaEstante([itemEstante('l2', 'O Cortiço')], { page: 2, totalPaginas: 2, totalItens: 2 }))
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(leitura.listarEstantePerfil).toHaveBeenCalledWith('u1', { page: 1 })
    const secao = wrapper.get('section[id$="-painel-estante"]')
    expect(secao.text()).toContain('Dom Casmurro')
    expect(secao.text()).not.toContain('Os livros que você adicionar aparecem aqui.')
    expect(secao.findAll('li button')).toHaveLength(0)

    await secao.findAll('button').find((b) => b.text() === 'Carregar mais')!.trigger('click')
    await flushPromises()
    expect(leitura.listarEstantePerfil).toHaveBeenLastCalledWith('u1', { page: 2 })
    expect(secao.findAll('li')).toHaveLength(2)
  })

  it('falha da estante mostra erro com Tentar de novo; 404 fica no vazio com o CTA', async () => {
    leitura.listarEstantePerfil.mockRejectedValueOnce(new ApiError('Falha.', 0, 'SERVICO_INDISPONIVEL'))
    leitura.listarEstantePerfil.mockResolvedValueOnce(paginaEstante([itemEstante('l1', 'Dom Casmurro')]))
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar a estante. Verifique sua conexão e tente de novo.')
    const secao = wrapper.get('section[id$="-painel-estante"]')
    await secao.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Dom Casmurro')

    document.body.innerHTML = ''
    leitura.listarEstantePerfil.mockRejectedValueOnce(new ApiError('Não encontrado.', 404, 'NAO_ENCONTRADO'))
    const outra = await montarNaRota('/perfil')
    await flushPromises()
    expect(outra.wrapper.text()).toContain('Os livros que você adicionar aparecem aqui.')
    expect(outra.wrapper.text()).not.toContain('Não foi possível carregar a estante')
  })

  it('perfil privado troca o chip e explica quem vê o conteúdo', async () => {
    servico.obterMeuPerfil.mockResolvedValue({ ...PERFIL, privacidade: 'privado' })
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(wrapper.text()).toContain('Perfil privado')
    expect(wrapper.text()).toContain('Só quem você aceita vê sua estante e suas resenhas.')
    expect(wrapper.text()).not.toContain('Perfil público')
  })

  it('falha de carga mostra o banner e tenta de novo', async () => {
    servico.obterMeuPerfil.mockRejectedValueOnce(new Error('rede'))
    const { wrapper } = await montarNaRota('/perfil')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível carregar seu perfil.')
    const tentar = wrapper.findAll('button').find((botao) => botao.text() === 'Tentar de novo')!
    await tentar.trigger('click')
    await flushPromises()

    expect(servico.obterMeuPerfil).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Marina Beltrão')
  })
})
