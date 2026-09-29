import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PoliticaPublica from './PoliticaPublica.vue'

describe('PoliticaPublica', () => {
  it('o h1 traz "Privacidade" abaixo de 768px e "Política de privacidade" a partir dele', () => {
    const wrapper = mount(PoliticaPublica)

    const [curto, inteiro] = wrapper.findAll('h1 span')
    expect(curto!.text()).toBe('Privacidade')
    expect(curto!.classes()).toEqual(['md:hidden'])
    expect(inteiro!.text()).toBe('Política de privacidade')
    expect(inteiro!.classes()).toEqual(['hidden', 'md:inline'])
  })
})
