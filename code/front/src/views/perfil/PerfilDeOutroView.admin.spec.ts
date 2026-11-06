import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import { hojeEmSaoPaulo } from '../../estatisticas/formatos'
import { leituraService } from '../../services/leitura'
import { listasService } from '../../services/listas'
import { moderacaoService, type ContaDaModeracao } from '../../services/moderacao'
import { perfilService, type Perfil } from '../../services/perfil'
import { paginaEstante } from '../../testes/estante'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/perfil', () => ({
  perfilService: { obterPerfil: vi.fn(), seguir: vi.fn(), deixarDeSeguir: vi.fn() },
}))
vi.mock('../../services/leitura', () => ({
  leituraService: { listarEstantePerfil: vi.fn(), listarResenhasPerfil: vi.fn(), consultarEstatisticasPerfil: vi.fn() },
}))
vi.mock('../../services/listas', () => ({ listasService: { listarDoPerfil: vi.fn() } }))
vi.mock('../../services/moderacao', () => ({
  moderacaoService: { contaPorUsername: vi.fn(), suspenderConta: vi.fn(), reativarConta: vi.fn() },
}))

const perfis = vi.mocked(perfilService)
const leitura = vi.mocked(leituraService)
const listas = vi.mocked(listasService)
const moderacao = vi.mocked(moderacaoService)

const SERGIO: Perfil = {
  id: 'u9',
  username: 'svaladares',
  displayName: 'Sérgio Valadares',
  avatarUrl: null,
  privacidade: 'publico',
  conteudoRestrito: false,
  relacao: 'nenhuma',
  biografia: 'Engenheiro aposentado.',
  contadores: { seguidores: 3, seguidos: 4 },
}

const SUSPENSA: ContaDaModeracao = {
  id: 'u9',
  username: 'svaladares',
  nomeExibicao: 'Sérgio Valadares',
  avatarUrl: null,
  privacidade: 'publico',
  suspensa: true,
  suspensaEm: '2026-10-11T14:32:00',
  motivo: 'Ataques pessoais repetidos em comentários.',
}

const naoEncontrado = () => new ApiError('Não encontramos esse leitor.', 404, 'RECURSO_NAO_ENCONTRADO')

function botaoNoCorpo(texto: string) {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)
}

/** F-MOD-OPC: o perfil de outro leitor na visão do administrador (perfil-de-outro-leitor.md P3). */
describe('PerfilDeOutroView, administrador', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="avisos-flutuantes"></div>'
    localStorage.clear()
    perfis.obterPerfil.mockReset().mockResolvedValue(SERGIO)
    leitura.listarEstantePerfil.mockReset().mockResolvedValue(paginaEstante([]))
    leitura.listarResenhasPerfil
      .mockReset()
      .mockResolvedValue({ itens: [], paginacao: { page: 1, limite: 5, totalItens: 0, totalPaginas: 0 } })
    leitura.consultarEstatisticasPerfil
      .mockReset()
      .mockResolvedValue({ ano: hojeEmSaoPaulo().ano, livrosConcluidos: 0, paginasLidas: 0, minutosLidos: 0 })
    listas.listarDoPerfil.mockReset().mockResolvedValue({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })
    moderacao.contaPorUsername.mockReset()
    moderacao.suspenderConta.mockReset()
    moderacao.reativarConta.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('leitor não vê o DotsThree de moderação', async () => {
    const { wrapper } = await montarNaRota('/leitores/svaladares')
    await flushPromises()

    expect(wrapper.find('[aria-label="Ações de moderação"]').exists()).toBe(false)
  })

  it('admin suspende pelo DotsThree e a página vira a visão da conta suspensa', async () => {
    moderacao.suspenderConta.mockResolvedValue({
      usuarioId: 'u9', suspensa: true, suspensaEm: '2026-10-11T14:32:00', reativadaEm: null,
    })
    const { wrapper } = await montarNaRota('/leitores/svaladares', { admin: true, largo: true })
    await flushPromises()

    await wrapper.get('[aria-label="Ações de moderação"]').trigger('click')
    await flushPromises()
    await wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Suspender conta')!.trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Suspender a conta de Sérgio Valadares?')

    perfis.obterPerfil.mockRejectedValue(naoEncontrado())
    moderacao.contaPorUsername.mockResolvedValue(SUSPENSA)
    const campo = document.body.querySelector('textarea')!
    campo.value = 'Ataques pessoais repetidos em comentários.'
    campo.dispatchEvent(new Event('input'))
    await flushPromises()
    document.body.querySelector<HTMLButtonElement>('[data-confirmar]')!.click()
    await flushPromises()

    expect(moderacao.suspenderConta).toHaveBeenCalledWith('u9', 'Ataques pessoais repetidos em comentários.', expect.any(String))
    expect(wrapper.text()).toContain('Conta suspensa')
    expect(wrapper.text()).toContain('Motivo registrado')
    expect(document.body.textContent).toContain('Conta de Sérgio Valadares suspensa.')
  })

  it('admin abre conta suspensa: etiqueta, faixa, motivo, Reativar conta e o link do registro', async () => {
    perfis.obterPerfil.mockRejectedValue(naoEncontrado())
    moderacao.contaPorUsername.mockResolvedValue(SUSPENSA)
    const { wrapper } = await montarNaRota('/leitores/svaladares', { admin: true })
    await flushPromises()

    expect(moderacao.contaPorUsername).toHaveBeenCalledWith('svaladares')
    expect(wrapper.text()).toContain('Conta suspensa')
    expect(wrapper.text()).toContain(
      'Conta suspensa em 11 de outubro de 2026, às 14:32. Sérgio não consegue entrar, e o perfil e o conteúdo dele estão ocultos para os leitores. Nada foi apagado.',
    )
    expect(wrapper.text()).toContain('Ataques pessoais repetidos em comentários.')
    expect(wrapper.find('a[href="/moderacao?aba=registro"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Perfil não encontrado')
    expect(wrapper.find('[aria-label="Ações de moderação"]').exists()).toBe(false)

    moderacao.reativarConta.mockResolvedValue({ usuarioId: 'u9', suspensa: false, suspensaEm: null, reativadaEm: '2026-10-12T10:00:00' })
    perfis.obterPerfil.mockResolvedValue(SERGIO)
    botaoNoCorpo('Reativar conta')!.click()
    await flushPromises()
    expect(document.body.textContent).toContain('Reativar a conta de Sérgio Valadares?')
    const campo = document.body.querySelector('textarea')!
    campo.value = 'Revisto.'
    campo.dispatchEvent(new Event('input'))
    await flushPromises()
    document.body.querySelector<HTMLButtonElement>('[data-confirmar]')!.click()
    await flushPromises()

    expect(moderacao.reativarConta).toHaveBeenCalledWith('u9', 'Revisto.', expect.any(String))
    expect(document.body.textContent).toContain('Conta de Sérgio Valadares reativada.')
    expect(wrapper.text()).toContain('Engenheiro aposentado.')
  })

  it('para o leitor, a conta suspensa continua Perfil não encontrado, sem consultar a moderação', async () => {
    perfis.obterPerfil.mockRejectedValue(naoEncontrado())
    const { wrapper } = await montarNaRota('/leitores/svaladares')
    await flushPromises()

    expect(wrapper.text()).toContain('Perfil não encontrado')
    expect(moderacao.contaPorUsername).not.toHaveBeenCalled()
  })

  it('admin com username inexistente também vê Perfil não encontrado', async () => {
    perfis.obterPerfil.mockRejectedValue(naoEncontrado())
    moderacao.contaPorUsername.mockRejectedValue(naoEncontrado())
    const { wrapper } = await montarNaRota('/leitores/ninguem', { admin: true })
    await flushPromises()

    expect(wrapper.text()).toContain('Perfil não encontrado')
  })
})
