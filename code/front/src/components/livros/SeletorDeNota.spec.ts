import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SeletorDeNota from './SeletorDeNota.vue'

function montar(modelValue: number | null, desabilitado = false) {
  return mount(SeletorDeNota, { props: { modelValue, desabilitado } })
}

function emitidos(wrapper: ReturnType<typeof montar>): number[] {
  return (wrapper.emitted('update:modelValue') ?? []).map(([valor]) => valor as number)
}

describe('SeletorDeNota', () => {
  it('é um slider com o valor anunciado em texto', () => {
    const slider = montar(4.5).get('[role="slider"]')

    expect(slider.attributes('aria-valuemin')).toBe('0')
    expect(slider.attributes('aria-valuemax')).toBe('5')
    expect(slider.attributes('aria-valuenow')).toBe('4.5')
    expect(slider.attributes('aria-valuetext')).toBe('4,5 de 5')
  })

  it('sem nota anuncia "Sem nota", nunca 0', () => {
    const slider = montar(null).get('[role="slider"]')

    expect(slider.attributes('aria-valuetext')).toBe('Sem nota')
    expect(slider.attributes('aria-valuenow')).toBeUndefined()
  })

  it('setas mudam em passos de 0,5; Home é 0 e End é 5', async () => {
    const wrapper = montar(4)
    const slider = wrapper.get('[role="slider"]')

    await slider.trigger('keydown', { key: 'ArrowRight' })
    await slider.trigger('keydown', { key: 'ArrowLeft' })
    await slider.trigger('keydown', { key: 'Home' })
    await slider.trigger('keydown', { key: 'End' })

    expect(emitidos(wrapper)).toEqual([4.5, 3.5, 0, 5])
  })

  it('não passa de 5 nem desce de 0', async () => {
    const noTopo = montar(5)
    await noTopo.get('[role="slider"]').trigger('keydown', { key: 'ArrowRight' })
    expect(emitidos(noTopo)).toEqual([])

    const noZero = montar(0)
    await noZero.get('[role="slider"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(emitidos(noZero)).toEqual([])
  })

  it('sem nota, a primeira seta para a direita dá 0,5', async () => {
    const wrapper = montar(null)
    await wrapper.get('[role="slider"]').trigger('keydown', { key: 'ArrowRight' })
    expect(emitidos(wrapper)).toEqual([0.5])
  })

  it('desabilitado não muda e sai da ordem de tabulação', async () => {
    const wrapper = montar(3, true)
    const slider = wrapper.get('[role="slider"]')

    await slider.trigger('keydown', { key: 'ArrowRight' })

    expect(emitidos(wrapper)).toEqual([])
    expect(slider.attributes('tabindex')).toBe('-1')
  })
})
