import { describe, expect, it } from 'vitest'

// The config is JavaScript because Tailwind loads it directly at build time.
// @ts-expect-error No declaration file is needed for this runtime-only config.
import config from '../tailwind.config.js'

describe('Tailwind design tokens', () => {
  it('mapeia diretamente os tokens canônicos', () => {
    expect(config.theme.extend.colors.papel).toBe('var(--color-papel)')
    expect(config.theme.extend.spacing['space-5']).toBe('20px')
    expect(config.theme.extend.fontFamily.display).toContain('Space Grotesk')
    expect(config.theme.extend.borderRadius.full).toBe('999px')
  })
})
