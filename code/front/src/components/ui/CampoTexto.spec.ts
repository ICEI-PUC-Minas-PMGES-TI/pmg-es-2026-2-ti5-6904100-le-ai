import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CampoTexto from './CampoTexto.vue'

describe('CampoTexto', () => {
  it('associa o label ao campo e emite o valor digitado', async () => {
    const wrapper = mount(CampoTexto, {
      props: { modelValue: '', label: 'E-mail ou nome de usuário' },
    })

    const label = wrapper.get('label')
    const input = wrapper.get('input')
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(label.text()).toBe('E-mail ou nome de usuário')

    await input.setValue('marinableu')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['marinableu'])
  })

  it('mostra o helper permanente quando não há erro', () => {
    const wrapper = mount(CampoTexto, {
      props: { modelValue: '', label: 'Senha', helper: 'Mínimo de 8 caracteres.' },
    })

    expect(wrapper.text()).toContain('Mínimo de 8 caracteres.')
    expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined()
  })

  it('erro marca aria-invalid, muda a borda e coexiste com o helper (cadastro.md §4.3)', () => {
    const wrapper = mount(CampoTexto, {
      props: {
        modelValue: '',
        label: 'Senha',
        helper: 'Mínimo de 8 caracteres.',
        erro: 'Use pelo menos 8 caracteres.',
      },
    })

    const input = wrapper.get('input')
    // O helper não some: a regra continua valendo, só a senha digitada é que está errada.
    expect(wrapper.text()).toContain('Mínimo de 8 caracteres.')
    expect(wrapper.text()).toContain('Use pelo menos 8 caracteres.')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(
      `${input.attributes('id')}-helper ${input.attributes('id')}-erro`,
    )
    expect(input.classes()).toContain('border-rubi')
  })

  it('bordaDeErro aplica a borda rubi sem legenda própria (login.md §4.2)', () => {
    const wrapper = mount(CampoTexto, {
      props: { modelValue: 'marinableu', label: 'E-mail ou nome de usuário', bordaDeErro: true },
    })

    const input = wrapper.get('input')
    expect(input.classes()).toContain('border-rubi')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.findAll('p')).toHaveLength(0)
  })

  it('repassa disabled para o input nativo', () => {
    const wrapper = mount(CampoTexto, {
      props: { modelValue: '', label: 'Senha', disabled: true },
    })

    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
  })

  it('reserva espaço para o slot trailing e não quebra sem ele', () => {
    const semTrailing = mount(CampoTexto, { props: { modelValue: '', label: 'Nome' } })
    expect(semTrailing.get('input').classes()).not.toContain('pr-space-10')

    const comTrailing = mount(CampoTexto, {
      props: { modelValue: '', label: 'Senha' },
      slots: { trailing: '<button type="button">olho</button>' },
    })
    expect(comTrailing.get('input').classes()).toContain('pr-space-10')
    expect(comTrailing.text()).toContain('olho')
  })
})
