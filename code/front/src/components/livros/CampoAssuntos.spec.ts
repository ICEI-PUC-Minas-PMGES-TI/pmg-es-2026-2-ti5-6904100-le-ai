import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AssuntoResumo } from '../../services/acervo'
import CampoAssuntos from './CampoAssuntos.vue'

const SEIS: AssuntoResumo[] = [
  { id: 'sociologia', nome: 'Sociologia' },
  { id: 'biografia', nome: 'Biografia' },
  { id: 'cronica', nome: 'Crônica' },
  { id: 'historia', nome: 'História' },
  { id: 'memorias', nome: 'Memórias' },
  { id: 'politica', nome: 'Política' },
]

const HELPER = 'Opcional. Escolha da lista do Lê Ai, de preferência até 5.'

/** Monta com `v-model` de verdade: o que o campo emite volta como prop. */
function montar(inicial: AssuntoResumo[], props: Record<string, unknown> = {}) {
  const listarAssuntos = vi.fn().mockResolvedValue(SEIS)
  const wrapper = mount(CampoAssuntos, {
    props: {
      modelValue: inicial,
      servico: { listarAssuntos },
      'onUpdate:modelValue': (valor: AssuntoResumo[]) => wrapper.setProps({ modelValue: valor }),
      ...props,
    },
    attachTo: document.body,
  })
  return wrapper
}

describe('CampoAssuntos', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('sem assunto: gatilho Escolher assuntos com o rótulo do estado e o helper', () => {
    const wrapper = montar([])

    const gatilho = wrapper.get('[data-gatilho]')
    expect(gatilho.text()).toBe('Escolher assuntos')
    expect(gatilho.attributes('aria-label')).toBe('Assuntos, nenhum escolhido, escolher')
    expect(wrapper.text()).toContain(HELPER)
  })

  it('com assuntos: chips em ordem alfabética, X com rótulo e Alterar assuntos', () => {
    const wrapper = montar([SEIS[4]!, SEIS[3]!])

    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['História', 'Memórias'])
    expect(wrapper.get('[data-remover="memorias"]').attributes('aria-label')).toBe('Remover Memórias')
    expect(wrapper.get('[data-alterar]').text()).toBe('Alterar assuntos')
    expect(wrapper.get('[data-alterar]').attributes('aria-label')).toBe('Assuntos, 2 escolhidos: História e Memórias, alterar')
    expect(wrapper.find('[data-gatilho]').exists()).toBe(false)
  })

  it('a partir do 6º, o helper vira um aviso que não é erro, anunciado uma vez', async () => {
    const wrapper = montar(SEIS.slice(0, 5))
    expect(wrapper.text()).toContain(HELPER)

    await wrapper.setProps({ modelValue: SEIS })

    const aviso = 'Você escolheu 6 assuntos. Até 5 ajuda a encontrar o livro com mais precisão.'
    expect(wrapper.text()).not.toContain(HELPER)
    expect(wrapper.findAll('p').filter((p) => p.text() === aviso)).toHaveLength(2)
    expect(wrapper.get('[aria-live="polite"]').text()).toBe(aviso)
    expect(wrapper.find('.text-rubi').exists()).toBe(false)
  })

  it('X remove o assunto e o foco vai ao chip seguinte; no último, a Alterar; sem nenhum, ao gatilho', async () => {
    const wrapper = montar([SEIS[3]!, SEIS[4]!])

    await wrapper.get('[data-remover="historia"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([[SEIS[4]]])
    expect(document.activeElement).toBe(wrapper.get('[data-remover="memorias"]').element)

    await wrapper.get('[data-remover="memorias"]').trigger('click')
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('[data-gatilho]').element)
  })

  it('remover o último chip da fileira leva o foco a Alterar assuntos', async () => {
    const wrapper = montar([SEIS[3]!, SEIS[4]!])

    await wrapper.get('[data-remover="memorias"]').trigger('click')
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.get('[data-alterar]').element)
  })

  it('erro do servidor entra no lugar do helper, mantém os chips e leva o foco a Alterar assuntos', async () => {
    const wrapper = montar([SEIS[3]!])
    const mensagem = 'Um dos assuntos escolhidos não está mais na lista do Lê Ai. Revise e salve de novo.'

    await wrapper.setProps({ erro: mensagem })
    await flushPromises()

    expect(wrapper.get('.text-rubi').text()).toBe(mensagem)
    expect(wrapper.text()).not.toContain(HELPER)
    expect(wrapper.findAll('li')).toHaveLength(1)
    expect(document.activeElement).toBe(wrapper.get('[data-alterar]').element)
  })

  it('salvando: chips sem X e Alterar assuntos sem ação', async () => {
    const wrapper = montar([SEIS[3]!], { desabilitado: true })

    expect(wrapper.find('[data-remover]').exists()).toBe(false)
    expect(wrapper.get('[data-alterar]').attributes('disabled')).toBeDefined()
  })

  it('o seletor aberto por Alterar assuntos aplica no Concluir', async () => {
    const wrapper = montar([SEIS[3]!])

    await wrapper.get('[data-alterar]').trigger('click')
    await flushPromises()
    const dialogo = document.body.querySelector('[role="dialog"]')!
    ;[...dialogo.querySelectorAll<HTMLElement>('[role="checkbox"]')].find((c) => c.textContent?.trim() === 'Biografia')!.click()
    await flushPromises()
    ;[...dialogo.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Concluir')!.click()
    await flushPromises()

    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Biografia', 'História'])
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(wrapper.get('[data-alterar]').element)
  })
})
