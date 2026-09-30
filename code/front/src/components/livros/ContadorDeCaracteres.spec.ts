import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ContadorDeCaracteres from './ContadorDeCaracteres.vue'

describe('ContadorDeCaracteres', () => {
  it.each([
    [412, '412 de 5.000 caracteres', 'text-grafite'],
    [4750, '4.750 de 5.000 caracteres', 'text-ambar'],
    [5000, '5.000 de 5.000 caracteres', 'text-ambar'],
    [5126, '5.126 de 5.000 caracteres', 'text-rubi'],
  ])('%i caracteres: "%s" em %s', (total, texto, cor) => {
    const wrapper = mount(ContadorDeCaracteres, { props: { total } })

    expect(wrapper.text()).toContain(texto)
    expect(wrapper.get('p').classes()).toContain(cor)
  })

  it('anuncia só quando a faixa muda', async () => {
    const wrapper = mount(ContadorDeCaracteres, { props: { total: 100 } })
    const anuncio = () => wrapper.get('[aria-live]').text()

    expect(anuncio()).toBe('')
    await wrapper.setProps({ total: 200 })
    expect(anuncio()).toBe('')
    await wrapper.setProps({ total: 5001 })
    expect(anuncio()).toBe('Passou do limite de 5.000 caracteres.')
  })
})
