import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import FimDaLista from './FimDaLista.vue'

/** `IntersectionObserver` de mentira: avisa a cada `observe`, como o do navegador. */
class ObservadorFalso {
  static visivel = true
  static instancias: ObservadorFalso[] = []
  readonly observe = vi.fn((alvo: Element) => {
    queueMicrotask(() => this.aviso([{ isIntersecting: ObservadorFalso.visivel, target: alvo }]))
  })
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()
  constructor(private readonly aviso: (entradas: Partial<IntersectionObserverEntry>[]) => void) {
    ObservadorFalso.instancias.push(this)
  }
}

describe('FimDaLista', () => {
  beforeEach(() => {
    ObservadorFalso.visivel = true
    ObservadorFalso.instancias = []
    vi.stubGlobal('IntersectionObserver', ObservadorFalso)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('pede a próxima página quando a marca aparece, sem botão', async () => {
    const wrapper = mount(FimDaLista, { props: { falhou: false } })
    await nextTick()

    expect(wrapper.emitted('carregar')).toHaveLength(1)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('com a marca ainda visível no fim da carga, pede a seguinte de novo', async () => {
    const wrapper = mount(FimDaLista, { props: { falhou: false, carregando: false } })
    await nextTick()
    await wrapper.setProps({ carregando: true })
    await wrapper.setProps({ carregando: false })
    await nextTick()

    expect(ObservadorFalso.instancias[0]!.unobserve).toHaveBeenCalledOnce()
    expect(wrapper.emitted('carregar')).toHaveLength(2)
  })

  it('se a página nova empurrou a marca para fora, não pede nada', async () => {
    const wrapper = mount(FimDaLista, { props: { falhou: false, carregando: false } })
    await nextTick()
    ObservadorFalso.visivel = false
    await wrapper.setProps({ carregando: true })
    await wrapper.setProps({ carregando: false })
    await nextTick()

    expect(wrapper.emitted('carregar')).toHaveLength(1)
  })

  it('depois de uma falha, só o botão tenta de novo', async () => {
    const wrapper = mount(FimDaLista, { props: { falhou: true, carregando: false } })
    await nextTick()
    expect(wrapper.emitted('carregar')).toBeUndefined()

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('carregar')).toHaveLength(1)
  })
})
