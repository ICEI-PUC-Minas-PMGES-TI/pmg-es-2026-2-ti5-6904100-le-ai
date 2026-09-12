import { beforeEach, describe, expect, it, vi } from 'vitest'

import { initializeTheme, resolveTheme, setThemePreference } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.style.colorScheme = ''
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('resolve a preferência do sistema', () => {
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('inicializa pelo sistema quando não existe preferência salva', () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList)

    initializeTheme()

    expect(document.documentElement.classList).toContain('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('persiste a alternância manual', () => {
    initializeTheme()
    setThemePreference('dark')

    expect(localStorage.getItem('le-ai-theme')).toBe('dark')
    expect(document.documentElement.classList).toContain('dark')
  })
})
