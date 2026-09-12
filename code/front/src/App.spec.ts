import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App.vue'
import HomeView from './views/HomeView.vue'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

describe('App', () => {
  it('renderiza a rota inicial', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: HomeView }],
    })

    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: { plugins: [router] },
    })

    expect(wrapper.get('h1').text()).toBe('Lê Ai')
    expect(wrapper.get('h1').classes()).toContain('text-display')
  })

  it('oferece alternância de tema acessível', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: HomeView }],
    })

    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: { plugins: [router] },
    })
    const toggle = wrapper.get('button')

    expect(toggle.attributes('aria-label')).toBe('Usar tema escuro')
    await toggle.trigger('click')

    expect(toggle.attributes('aria-label')).toBe('Usar tema claro')
    expect(localStorage.getItem('le-ai-theme')).toBe('dark')
  })
})
