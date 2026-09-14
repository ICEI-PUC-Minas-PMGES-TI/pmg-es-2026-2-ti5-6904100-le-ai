import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CampoSenha from './CampoSenha.vue'

describe('CampoSenha', () => {
  it('começa oculta, com o botão Mostrar senha', () => {
    const wrapper = mount(CampoSenha, {
      props: { modelValue: '', label: 'Senha' },
    })

    const input = wrapper.get('input')
    const botao = wrapper.get('button')
    expect(input.attributes('type')).toBe('password')
    expect(botao.attributes('aria-label')).toBe('Mostrar senha')
    expect(botao.attributes('aria-pressed')).toBe('false')
  })

  it('alterna para texto visível ao clicar no olho, e volta ao clicar de novo', async () => {
    const wrapper = mount(CampoSenha, {
      props: { modelValue: '', label: 'Senha' },
    })
    const botao = wrapper.get('button')

    await botao.trigger('click')

    expect(wrapper.get('input').attributes('type')).toBe('text')
    expect(botao.attributes('aria-label')).toBe('Ocultar senha')
    expect(botao.attributes('aria-pressed')).toBe('true')

    await botao.trigger('click')

    expect(wrapper.get('input').attributes('type')).toBe('password')
    expect(botao.attributes('aria-label')).toBe('Mostrar senha')
  })

  it('emite o valor digitado como o CampoTexto', async () => {
    const wrapper = mount(CampoSenha, {
      props: { modelValue: '', label: 'Senha' },
    })

    await wrapper.get('input').setValue('senha-bem-comprida')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['senha-bem-comprida'])
  })

  it('repassa o erro para o CampoTexto interno', () => {
    const wrapper = mount(CampoSenha, {
      props: { modelValue: '', label: 'Senha', erro: 'Use pelo menos 8 caracteres.' },
    })

    expect(wrapper.text()).toContain('Use pelo menos 8 caracteres.')
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
  })
})
