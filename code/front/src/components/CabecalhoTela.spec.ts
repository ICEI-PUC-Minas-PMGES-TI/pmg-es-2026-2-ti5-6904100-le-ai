import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import CabecalhoTela from './CabecalhoTela.vue'

function montar(props: Record<string, unknown>) {
  const router = createRouter({ history: createMemoryHistory(), routes: [] })
  return mount(CabecalhoTela, {
    props: { titulo: 'Política de privacidade', ...props },
    global: { plugins: [router] },
  })
}

describe('CabecalhoTela', () => {
  it('sem título curto, o h1 traz só o título, sem spans', () => {
    const wrapper = montar({})

    expect(wrapper.get('h1').text()).toBe('Política de privacidade')
    expect(wrapper.find('h1 span').exists()).toBe(false)
  })

  it('com título curto, abaixo de 768px vale o curto e a partir dele o título inteiro', () => {
    const wrapper = montar({ tituloCurto: 'Privacidade' })

    const [curto, inteiro] = wrapper.findAll('h1 span')
    expect(curto!.text()).toBe('Privacidade')
    expect(curto!.classes()).toEqual(['md:hidden'])
    expect(inteiro!.text()).toBe('Política de privacidade')
    expect(inteiro!.classes()).toEqual(['hidden', 'md:inline'])
  })
})
