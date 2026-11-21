import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ApiError } from '../../services/api'
import { listasService, type ListaResumo } from '../../services/listas'
import type { Pagina } from '../../services/perfil'
import ListasDoPerfil from './ListasDoPerfil.vue'

/**
 * Aba `Listas` do perfil na web e seção do celular (L-28, E6-02). As duas versões vão no DOM; o
 * CSS escolhe uma pela largura. A versão da web fica em `div.md\:block`.
 */

vi.mock('../../services/listas', async (original) => ({
  ...(await original<typeof import('../../services/listas')>()),
  listasService: { listarDoPerfil: vi.fn(), criar: vi.fn(), editar: vi.fn(), excluir: vi.fn() },
}))
vi.mock('../../services/perfil', async (original) => ({
  ...(await original<typeof import('../../services/perfil')>()),
  perfilService: { obterMeuPerfil: vi.fn().mockResolvedValue({ privacidade: 'publico' }) },
}))

const listas = vi.mocked(listasService)

function resumo(id: string, titulo: string): ListaResumo {
  return { id, titulo, descricao: null, quantidadeLivros: 2, capas: [], atualizadaEm: '2026-09-12T12:00:00Z' }
}

function pagina(itens: ListaResumo[]): Pagina<ListaResumo> {
  return { items: itens, page: 0, size: 20, totalElements: itens.length, totalPages: itens.length === 0 ? 0 : 1 }
}

const QUATRO = [resumo('l1', 'Primeira'), resumo('l2', 'Segunda'), resumo('l3', 'Terceira'), resumo('l4', 'Quarta')]

function montar(props: InstanceType<typeof ListasDoPerfil>['$props'] & { usuarioId: string; proprio: boolean }) {
  document.body.innerHTML = '<div id="avisos-flutuantes"></div>'
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/perfil', component: { template: '<div />' } },
      { path: '/perfil/listas', name: 'minhas-listas', component: { template: '<div />' } },
      { path: '/perfil/listas/:id', name: 'lista-propria', component: { template: '<div />' } },
      { path: '/leitores/:username', name: 'perfil-de-outro', component: { template: '<div />' } },
      { path: '/leitores/:username/listas', name: 'listas-de-outro', component: { template: '<div />' } },
      { path: '/leitores/:username/listas/:id', name: 'lista-de-outro', component: { template: '<div />' } },
    ],
  })
  return mount(ListasDoPerfil, { props, global: { plugins: [router] }, attachTo: document.body })
}

function web(): HTMLElement {
  return document.body.querySelector<HTMLElement>('div.md\\:block')!
}

function celular(): HTMLElement {
  return document.body.querySelector<HTMLElement>('section[aria-labelledby="secao-listas-titulo"]')!
}

describe('ListasDoPerfil', () => {
  beforeEach(() => {
    listas.listarDoPerfil.mockReset().mockResolvedValue(pagina(QUATRO))
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('aba Listas do próprio perfil na web: contagem, Nova lista, visibilidade e a grade inteira', async () => {
    montar({ usuarioId: 'u1', proprio: true, privacidade: 'publico' })
    await flushPromises()

    expect(listas.listarDoPerfil).toHaveBeenCalledWith('u1', 0)
    expect(web().textContent).toContain('4')
    expect(web().textContent).toContain('listas')
    expect(web().textContent).toContain('Seu perfil é público: qualquer leitor pode ver suas listas.')
    expect([...web().querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Nova lista')).toBe(true)
    expect([...web().querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/perfil/listas/l1',
      '/perfil/listas/l2',
      '/perfil/listas/l3',
      '/perfil/listas/l4',
    ])
    // No celular, só as três mais recentes e o `Ver todas` para o índice.
    const doCelular = [...celular().querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(doCelular).toEqual(['/perfil/listas', '/perfil/listas/l1', '/perfil/listas/l2', '/perfil/listas/l3'])
  })

  it('aba Listas de outro leitor: sem Nova lista nem visibilidade, links sob o username', async () => {
    montar({ usuarioId: 'u2', proprio: false, nome: 'Rafael', username: 'rafaokamoto' })
    await flushPromises()

    expect(listas.listarDoPerfil).toHaveBeenCalledWith('u2', 0)
    expect(document.body.textContent).not.toContain('Nova lista')
    expect(document.body.textContent).not.toContain('Seu perfil é')
    expect(web().querySelector('a')!.getAttribute('href')).toBe('/leitores/rafaokamoto/listas/l1')
    expect(celular().querySelector('a')!.getAttribute('href')).toBe('/leitores/rafaokamoto/listas')
  })

  it('outro leitor sem listas: frase com o primeiro nome, sem convite de criação', async () => {
    listas.listarDoPerfil.mockResolvedValue(pagina([]))
    montar({ usuarioId: 'u2', proprio: false, nome: 'Rafael', username: 'rafaokamoto' })
    await flushPromises()

    expect(document.body.textContent).toContain('Rafael ainda não criou listas.')
    expect(document.body.textContent).not.toContain('Você ainda não tem listas')
  })

  it('tempo esgotado: banner com Tentar de novo na aba, e tentar de novo carrega (L-14)', async () => {
    listas.listarDoPerfil.mockRejectedValueOnce(
      new ApiError('O servidor demorou para responder. Tente novamente.', 0, 'TEMPO_LIMITE_EXCEDIDO'),
    )
    montar({ usuarioId: 'u1', proprio: true, privacidade: 'publico' })
    await flushPromises()

    expect(web().textContent).toContain('Não foi possível carregar as listas. Verifique sua conexão e tente de novo.')
    ;[...web().querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Tentar de novo')!.click()
    await flushPromises()

    expect(listas.listarDoPerfil).toHaveBeenCalledTimes(2)
    expect(web().querySelectorAll('a')).toHaveLength(4)
  })
})
