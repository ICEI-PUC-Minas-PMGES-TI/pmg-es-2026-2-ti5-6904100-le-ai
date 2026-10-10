import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { ApiError } from '../../services/api'
import type { Frase, LeituraService, PaginaFrases } from '../../services/leitura'
import SecaoFrases from './SecaoFrases.vue'

const LIVRO = { id: 'livro-1', titulo: 'Torto Arado', autor: 'Itamar Vieira Junior', capaUrl: null, paginas: 264 }

function frase(id: string, pagina: number, minha = false): Frase {
  return {
    id,
    livroId: 'livro-1',
    texto: `Trecho ${id}.`,
    pagina,
    criadoEm: '2026-10-09T12:00:00Z',
    autor: { id: minha ? 'eu' : 'u2', username: minha ? 'eu' : 'marina.antunes', nome: 'Marina', avatarUrl: null },
    minha,
  }
}

function pagina(itens: Frase[], total: number, minhasFrases = 0): PaginaFrases {
  return { itens, paginacao: { page: 1, limite: 3, totalItens: total, totalPaginas: 1 }, minhasFrases, limitePorLivro: 10 }
}

async function montar(listarFrases: LeituraService['listarFrases']) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:caminho(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/livros/livro-1')
  const wrapper = mount(SecaoFrases, {
    props: { livro: LIVRO, rotaDasFrases: '/livros/livro-1/frases', servico: { listarFrases, criarFrase: vi.fn() } },
    global: { plugins: [router] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('SecaoFrases', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mostra a contagem, as três mais recentes e as duas ações, sem excluir', async () => {
    const listarFrases = vi.fn().mockResolvedValue(pagina([frase('a', 57), frase('b', 112, true), frase('c', 203)], 14, 2))
    const wrapper = await montar(listarFrases)

    expect(listarFrases).toHaveBeenCalledWith('livro-1', 1, 3)
    expect(wrapper.text()).toContain('Frases e trechos')
    expect(wrapper.text()).toContain('14 frases')
    expect(wrapper.findAll('blockquote')).toHaveLength(3)
    expect(wrapper.text()).toContain('Página 57 · @marina.antunes')
    expect(wrapper.text()).toContain('Página 112 · você')
    expect(wrapper.find('a').attributes('href')).toBe('/livros/livro-1/frases')
    expect(wrapper.text()).toContain('Adicionar frase')
    expect(wrapper.find('[aria-label^="Excluir frase"]').exists()).toBe(false)
  })

  it('sem frases, o vazio convida a adicionar a primeira', async () => {
    const wrapper = await montar(vi.fn().mockResolvedValue(pagina([], 0)))

    expect(wrapper.text()).toContain('Nenhuma frase ainda')
    expect(wrapper.text()).toContain('Guarde um trecho que marcou você, com a página em que ele está.')
    expect(wrapper.text()).toContain('Adicionar a primeira')
  })

  it('no limite de 10, a seção não oferece Adicionar frase', async () => {
    const wrapper = await montar(vi.fn().mockResolvedValue(pagina([frase('a', 1, true)], 10, 10)))

    expect(wrapper.text()).not.toContain('Adicionar frase')
    expect(wrapper.text()).toContain('Ver todas as frases')
  })

  it.each([
    ['503', new ApiError('Indisponível.', 503, 'SERVICO_INDISPONIVEL')],
    ['timeout', new DOMException('Tempo esgotado.', 'TimeoutError')],
  ])('falha (%s) mostra o erro e Tentar de novo recarrega', async (_, falha) => {
    const listarFrases = vi.fn().mockRejectedValueOnce(falha).mockResolvedValueOnce(pagina([frase('a', 57)], 1))
    const wrapper = await montar(listarFrases)

    expect(wrapper.text()).toContain('Não foi possível carregar as frases deste livro.')
    await wrapper.findAll('button').find((b) => b.text() === 'Tentar de novo')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Página 57 · @marina.antunes')
  })
})
