import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { resenha } from '../../testes/massaDoLivro'
import CardResenha from './CardResenha.vue'

describe('CardResenha', () => {
  it('mostra autor, texto e data', () => {
    const wrapper = mount(CardResenha, { props: { resenha: resenha('r1', 'Marina Antunes', 'A terra e a fala.') } })

    expect(wrapper.text()).toContain('Marina Antunes')
    expect(wrapper.text()).toContain('A terra e a fala.')
    expect(wrapper.text()).toContain('3 de agosto de 2026')
  })

  it('com spoiler, o texto não está no DOM até o toque', async () => {
    const wrapper = mount(CardResenha, {
      props: { resenha: resenha('r1', 'Rafael', 'O final revela tudo.', true) },
    })

    expect(wrapper.html()).not.toContain('O final revela tudo.')
    expect(wrapper.text()).toContain('Esta resenha contém spoiler')

    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain('O final revela tudo.')
    expect(wrapper.text()).not.toContain('Esta resenha contém spoiler')
  })

  it('texto com marcação aparece como texto, com escape', () => {
    const wrapper = mount(CardResenha, {
      props: { resenha: resenha('r1', 'Marina', '<img src=x onerror=alert(1)>') },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
  })

  it('o texto sai em Markdown, só com o subconjunto do RN-13 (F-AVA-2)', () => {
    const wrapper = mount(CardResenha, {
      props: { resenha: resenha('r1', 'Marina', '**forte** e *leve*\n\n- um\n- dois\n\n[link](javascript:alert(1))') },
    })

    expect(wrapper.get('strong').text()).toBe('forte')
    expect(wrapper.get('em').text()).toBe('leve')
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual(['um', 'dois'])
    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.text()).toContain('[link](javascript:alert(1))')
  })

  it('resenha antiga com quebras de linha continua com as quebras', () => {
    const wrapper = mount(CardResenha, { props: { resenha: resenha('r1', 'Marina', 'Primeira linha\nsegunda linha') } })

    expect(wrapper.findAll('br')).toHaveLength(1)
  })

  it('sem o campo spoiler, o texto fica fechado por segurança', () => {
    const semCampo = { ...resenha('r1', 'Rafael', 'O final revela tudo.'), spoiler: undefined as unknown as boolean }
    const wrapper = mount(CardResenha, { props: { resenha: semCampo } })

    expect(wrapper.html()).not.toContain('O final revela tudo.')
  })

  it('revelar leva o foco para o texto, porque o botão sai do DOM', async () => {
    const wrapper = mount(CardResenha, {
      props: { resenha: resenha('r1', 'Rafael', 'O final revela tudo.', true) },
      attachTo: document.body,
    })

    await wrapper.get('button').trigger('click')
    await nextTick()

    expect(document.activeElement?.textContent?.trim()).toBe('O final revela tudo.')
    wrapper.unmount()
  })
})
