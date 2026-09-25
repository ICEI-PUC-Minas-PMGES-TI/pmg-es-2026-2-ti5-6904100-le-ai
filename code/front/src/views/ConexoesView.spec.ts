import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { perfilService, type Pagina, type PerfilResumo } from '../services/perfil'
import { montarNaRota } from '../testes/montarNaRota'

vi.mock('../services/perfil', () => ({
  perfilService: {
    listarSeguidores: vi.fn(),
    listarSeguidos: vi.fn(),
    removerSeguidor: vi.fn(),
    deixarDeSeguir: vi.fn(),
  },
}))

const servico = vi.mocked(perfilService)

function leitor(id: string, displayName: string, privacidade: 'publico' | 'privado' = 'publico'): PerfilResumo {
  return { id, username: id, displayName, avatarUrl: null, privacidade, conteudoRestrito: false, relacao: 'nenhuma' }
}

function pagina(items: PerfilResumo[], totalElements = items.length): Pagina<PerfilResumo> {
  return { items, page: 0, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) }
}

/** O modal fica no fim do body: o último botão com o texto é o dele, não o da lista. */
function botaoNoCorpo(texto: string) {
  return [...document.body.querySelectorAll('button')].filter((b) => b.textContent?.trim() === texto).at(-1)!
}

describe('ConexoesView', () => {
  beforeEach(() => {
    localStorage.clear()
    servico.listarSeguidores.mockReset().mockResolvedValue(pagina([leitor('caio', 'Caio Ferraz'), leitor('nadia', 'Nadia Sampaio')], 84))
    servico.listarSeguidos.mockReset().mockResolvedValue(pagina([leitor('dandara', 'Dandara Lima', 'privado')], 97))
    servico.removerSeguidor.mockReset().mockResolvedValue(undefined)
    servico.deixarDeSeguir.mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('abas com as duas contagens; seguidores com Remover e link para o perfil', async () => {
    const { wrapper } = await montarNaRota('/perfil/conexoes')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Conexões')
    const abas = wrapper.findAll('[role="tab"]')
    expect(abas[0]!.text()).toBe('Seguidores 84')
    expect(abas[0]!.attributes('aria-selected')).toBe('true')
    expect(abas[1]!.text()).toBe('Seguindo 97')
    expect(wrapper.get('a[href="/leitores/caio"]').text()).toContain('Caio Ferraz')
    expect(wrapper.findAll('button').filter((b) => b.text() === 'Remover')).toHaveLength(2)
  })

  it('remover pede confirmação com a consequência própria e tira da lista', async () => {
    const { wrapper } = await montarNaRota('/perfil/conexoes')
    await flushPromises()

    await wrapper.get('button[aria-label="Remover Caio Ferraz dos seus seguidores"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('Remover Caio dos seus seguidores?')
    expect(document.body.textContent).toContain('Essa pessoa deixa de seguir você e perde o acesso ao seu conteúdo restrito.')

    botaoNoCorpo('Remover').click()
    await flushPromises()

    expect(servico.removerSeguidor).toHaveBeenCalledWith('caio', expect.any(String))
    expect(wrapper.find('a[href="/leitores/caio"]').exists()).toBe(false)
    expect(wrapper.findAll('[role="tab"]')[0]!.text()).toBe('Seguidores 83')
  })

  it('?aba=seguidos abre Seguindo; deixar de seguir perfil privado avisa da perda de acesso', async () => {
    const { wrapper } = await montarNaRota('/perfil/conexoes?aba=seguidos')
    await flushPromises()

    expect(wrapper.findAll('[role="tab"]')[1]!.attributes('aria-selected')).toBe('true')
    await wrapper.get('button[aria-label="Seguindo Dandara Lima. Deixar de seguir"]').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Deixar de seguir Dandara?')
    expect(document.body.textContent).toContain('você perde o acesso à estante e às resenhas')
    botaoNoCorpo('Deixar de seguir').click()
    await flushPromises()
    expect(servico.deixarDeSeguir).toHaveBeenCalledWith('dandara', expect.any(String))
    expect(wrapper.text()).toContain('Você ainda não segue ninguém')
  })

  it('vazios: seguidores sem botão, seguindo com Buscar leitor', async () => {
    servico.listarSeguidores.mockResolvedValue(pagina([]))
    servico.listarSeguidos.mockResolvedValue(pagina([]))
    const { wrapper, router } = await montarNaRota('/perfil/conexoes')
    await flushPromises()

    expect(wrapper.text()).toContain('Ninguém segue você ainda')
    expect(wrapper.find('a[href="/perfil/buscar"]').exists()).toBe(false)

    await router.replace('/perfil/conexoes?aba=seguidos')
    await flushPromises()
    expect(wrapper.get('a[href="/perfil/buscar"]').text()).toBe('Buscar leitor')
  })

  it('mais de uma página: Carregar mais acrescenta no fim', async () => {
    servico.listarSeguidores
      .mockResolvedValueOnce(pagina([leitor('caio', 'Caio Ferraz')], 21))
      .mockResolvedValueOnce({ ...pagina([leitor('otavio', 'Otávio Brandão')], 21), page: 1 })
    const { wrapper } = await montarNaRota('/perfil/conexoes')
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text() === 'Carregar mais')!.trigger('click')
    await flushPromises()

    expect(servico.listarSeguidores).toHaveBeenLastCalledWith(1)
    expect(wrapper.find('a[href="/leitores/caio"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/leitores/otavio"]').exists()).toBe(true)
  })
})
