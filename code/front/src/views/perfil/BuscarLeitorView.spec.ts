import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../services/api'
import { perfilService, type PerfilResumo } from '../../services/perfil'
import { montarNaRota } from '../../testes/montarNaRota'

vi.mock('../../services/perfil', () => ({ perfilService: { buscarPorUsername: vi.fn() } }))

const servico = vi.mocked(perfilService)

const RAFAEL: PerfilResumo = {
  id: 'u2',
  username: 'rafaokamoto',
  displayName: 'Rafael Okamoto',
  biografia: null,
  avatarUrl: null,
  privacidade: 'publico',
  conteudoRestrito: false,
  relacao: 'nenhuma',
}

type Wrapper = Awaited<ReturnType<typeof montarNaRota>>['wrapper']

async function buscar(wrapper: Wrapper, texto: string) {
  await wrapper.get('input[type="search"]').setValue(texto)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('BuscarLeitorView', () => {
  beforeEach(() => {
    localStorage.clear()
    servico.buscarPorUsername.mockReset().mockResolvedValue([RAFAEL])
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('aterrissagem ensina a regra do exato, sem consultar nada', async () => {
    const { wrapper } = await montarNaRota('/perfil/buscar')

    expect(wrapper.get('h1').text()).toBe('Buscar leitor')
    expect(wrapper.text()).toContain('Busque pelo nome de usuário')
    expect(wrapper.text()).toContain('Não existe lista de leitores para explorar.')
    expect(servico.buscarPorUsername).not.toHaveBeenCalled()
  })

  it('encontrado vira um card que leva ao perfil, sem botão de seguir', async () => {
    const { wrapper } = await montarNaRota('/perfil/buscar')

    await buscar(wrapper, '@rafaokamoto ')

    expect(servico.buscarPorUsername).toHaveBeenCalledWith('rafaokamoto')
    const card = wrapper.get('a[href="/leitores/rafaokamoto"]')
    expect(card.attributes('aria-label')).toBe('Rafael Okamoto, arroba rafaokamoto')
    expect(wrapper.text()).not.toContain('Seguir')
  })

  it('o card traz chip de privacidade, biografia e a ilustração do leitor abaixo', async () => {
    servico.buscarPorUsername.mockResolvedValue([
      { ...RAFAEL, privacidade: 'privado', biografia: 'Professor de história. Anoto tudo na margem.' },
    ])
    const { wrapper } = await montarNaRota('/perfil/buscar')

    await buscar(wrapper, 'rafaokamoto')

    const card = wrapper.get('a[href="/leitores/rafaokamoto"]')
    expect(card.text()).toContain('Perfil privado')
    const bio = card.get('[data-teste="biografia"]')
    expect(bio.text()).toBe('Professor de história. Anoto tudo na margem.')
    expect(bio.classes()).toContain('line-clamp-2')
    expect(wrapper.find('[data-teste="ilustracao-encontrado"]').exists()).toBe(true)
  })

  it('sem biografia o card não deixa linha vazia', async () => {
    const { wrapper } = await montarNaRota('/perfil/buscar')

    await buscar(wrapper, 'rafaokamoto')

    expect(wrapper.text()).toContain('Perfil público')
    expect(wrapper.find('[data-teste="biografia"]').exists()).toBe(false)
  })

  it('sem resultado mostra a ilustração no lugar do ícone', async () => {
    servico.buscarPorUsername.mockResolvedValue([])
    const { wrapper } = await montarNaRota('/perfil/buscar')

    await buscar(wrapper, 'rafaokamoto')

    expect(wrapper.find('img[src*="nenhum-leitor"]').exists()).toBe(true)
    expect(wrapper.find('[data-teste="ilustracao-encontrado"]').exists()).toBe(false)
  })

  it('sem resultado a frase é sobre a busca, não sobre a conta', async () => {
    servico.buscarPorUsername.mockResolvedValue([])
    const { wrapper } = await montarNaRota('/perfil/buscar')

    await buscar(wrapper, 'rafa')

    expect(wrapper.text()).toContain('Nenhum leitor com esse nome de usuário')
    expect(wrapper.text()).toContain('Confira a grafia.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('formato inválido avisa no campo e não gasta busca', async () => {
    const { wrapper } = await montarNaRota('/perfil/buscar')

    await buscar(wrapper, 'ra')

    expect(wrapper.text()).toContain('Digite o nome de usuário completo')
    expect(servico.buscarPorUsername).not.toHaveBeenCalled()
  })

  it('falha é erro com tentar de novo; o limite traz a frase do servidor', async () => {
    servico.buscarPorUsername
      .mockRejectedValueOnce(new TypeError('rede'))
      .mockRejectedValueOnce(new ApiError('Muitas buscas em pouco tempo. Tente de novo em instantes.', 429, 'MUITAS_REQUISICOES'))
    const { wrapper } = await montarNaRota('/perfil/buscar')

    await buscar(wrapper, 'rafaokamoto')
    expect(wrapper.text()).toContain('Não foi possível buscar agora.')

    await wrapper.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Muitas buscas em pouco tempo.')
  })
})
