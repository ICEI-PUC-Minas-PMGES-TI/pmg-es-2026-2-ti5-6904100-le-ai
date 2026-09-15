import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import BotaoPrimario from './BotaoPrimario.vue'

describe('BotaoPrimario', () => {
  it('renderiza o rótulo do slot e o tipo padrão button', () => {
    const wrapper = mount(BotaoPrimario, { slots: { default: 'Entrar' } })

    const botao = wrapper.get('button')
    expect(botao.text()).toBe('Entrar')
    expect(botao.attributes('type')).toBe('button')
    expect(botao.attributes('disabled')).toBeUndefined()
  })

  it('aceita tipo submit explícito', () => {
    const wrapper = mount(BotaoPrimario, { props: { tipo: 'submit' } })

    expect(wrapper.get('button').attributes('type')).toBe('submit')
  })

  it('carregando desabilita o botão e marca aria-busy, sem trocar o texto sozinho', () => {
    const wrapper = mount(BotaoPrimario, {
      props: { carregando: true },
      slots: { default: 'Entrando' },
    })

    const botao = wrapper.get('button')
    expect(botao.attributes('disabled')).toBeDefined()
    expect(botao.attributes('aria-busy')).toBe('true')
    expect(botao.text()).toBe('Entrando')
  })

  it('disabled desabilita o botão independente de carregando', () => {
    const wrapper = mount(BotaoPrimario, { props: { disabled: true } })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
