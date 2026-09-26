import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

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
})
