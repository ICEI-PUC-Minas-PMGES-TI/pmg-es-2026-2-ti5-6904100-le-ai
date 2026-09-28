import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { perfilService, type Pagina, type SolicitacaoSeguir } from '../../services/perfil'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/perfil', () => ({
  perfilService: {
    listarSolicitacoes: vi.fn(),
    obterMeuPerfil: vi.fn(),
    aceitarSolicitacao: vi.fn(),
    recusarSolicitacao: vi.fn(),
  },
}))

const servico = vi.mocked(perfilService)

function pedido(id: string, displayName: string): SolicitacaoSeguir {
  return {
    id,
    criadaEm: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    solicitante: {
      id: `u-${id}`,
      username: id,
      displayName,
      biografia: null,
      avatarUrl: null,
      privacidade: 'publico',
      conteudoRestrito: false,
      relacao: 'solicitacao_recebida',
    },
  }
}

function pagina(items: SolicitacaoSeguir[]): Pagina<SolicitacaoSeguir> {
  return { items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 }
}

const PERFIL = {
  id: 'u1',
  username: 'marinableu',
  displayName: 'Marina Beltrão',
  avatarUrl: null,
  privacidade: 'privado' as const,
  conteudoRestrito: false,
  relacao: 'proprio' as const,
  biografia: null,
  contadores: { seguidores: 0, seguidos: 0 },
}

describe('SolicitacoesView', () => {
  beforeEach(() => {
    localStorage.clear()
    servico.listarSolicitacoes.mockReset().mockResolvedValue(pagina([pedido('caio', 'Caio Ferraz'), pedido('nadia', 'Nadia Sampaio')]))
    servico.obterMeuPerfil.mockReset().mockResolvedValue(PERFIL)
    servico.aceitarSolicitacao.mockReset().mockResolvedValue(undefined)
    servico.recusarSolicitacao.mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('contagem com unidade, efeito da decisão e tempo de espera', async () => {
    const { wrapper } = await montarNaRota('/perfil/solicitacoes')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Solicitações')
    expect(wrapper.text()).toContain('2 solicitações')
    expect(wrapper.text()).toContain('Quem você aceitar passa a ver sua estante, suas notas e suas resenhas.')
    expect(wrapper.text()).toContain('há 2 horas')
    expect(wrapper.get('a[href="/leitores/caio"]').text()).toContain('Caio Ferraz')
  })

  it('aceitar não pede confirmação, mostra Aceito, desconta e depois tira da lista', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { wrapper } = await montarNaRota('/perfil/solicitacoes')
    await flushPromises()

    await wrapper.get('button[aria-label="Aceitar solicitação de Caio Ferraz"]').trigger('click')
    await flushPromises()

    expect(servico.aceitarSolicitacao).toHaveBeenCalledWith('caio', expect.any(String))
    expect(document.body.textContent).not.toContain('Recusar a solicitação')
    expect(wrapper.text()).toContain('Aceito')
    expect(wrapper.text()).toContain('1 solicitação')

    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.find('a[href="/leitores/caio"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('1 solicitação')
  })

  it('recusar passa pelo modal que diz que não há aviso', async () => {
    const { wrapper } = await montarNaRota('/perfil/solicitacoes')
    await flushPromises()

    await wrapper.get('button[aria-label="Recusar solicitação de Nadia Sampaio"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Recusar a solicitação de Nadia?')
    expect(document.body.textContent).toContain('O pedido é descartado e a pessoa não recebe aviso.')
    expect(servico.recusarSolicitacao).not.toHaveBeenCalled()

    const confirmar = [...document.body.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'Recusar').at(-1)!
    confirmar.click()
    await flushPromises()

    expect(servico.recusarSolicitacao).toHaveBeenCalledWith('nadia', expect.any(String))
    expect(wrapper.find('a[href="/leitores/nadia"]').exists()).toBe(false)
  })

  it('vazio com perfil público explica que pedidos só existem em perfil privado', async () => {
    servico.listarSolicitacoes.mockResolvedValue(pagina([]))
    servico.obterMeuPerfil.mockResolvedValue({ ...PERFIL, privacidade: 'publico' })
    const { wrapper } = await montarNaRota('/perfil/solicitacoes')
    await flushPromises()

    expect(wrapper.text()).toContain('Nenhuma solicitação pendente')
    expect(wrapper.text()).toContain('Pedidos só existem em perfil privado.')
    expect(wrapper.get('a[href="/perfil/editar"]').text()).toBe('Editar perfil')
    expect(wrapper.text()).not.toContain('0 solicitações')
  })
})
