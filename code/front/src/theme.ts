import { computed, onBeforeUnmount, ref } from 'vue'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'le-ai-theme'
const preference = ref<ThemePreference>('system')
const resolvedTheme = ref<ResolvedTheme>('light')
let mediaQuery: MediaQueryList | undefined

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function resolveTheme(value: ThemePreference, prefersDark = false): ResolvedTheme {
  if (value === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return value
}

function getSystemPreference(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(value: ThemePreference): void {
  const nextTheme = resolveTheme(value, getSystemPreference())

  resolvedTheme.value = nextTheme
  document.documentElement.classList.toggle('dark', nextTheme === 'dark')
  document.documentElement.style.colorScheme = nextTheme
}

function onSystemThemeChange(): void {
  if (preference.value === 'system') {
    applyTheme('system')
  }
}

export function initializeTheme(): void {
  if (typeof window === 'undefined') {
    return
  }

  const savedPreference = window.localStorage.getItem(STORAGE_KEY)
  preference.value = isThemePreference(savedPreference) ? savedPreference : 'system'
  applyTheme(preference.value)

  mediaQuery?.removeEventListener('change', onSystemThemeChange)
  if (typeof window.matchMedia === 'function') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', onSystemThemeChange)
  }
}

export function setThemePreference(value: ThemePreference): void {
  preference.value = value
  window.localStorage.setItem(STORAGE_KEY, value)
  applyTheme(value)
}

export function useTheme() {
  const toggleTheme = (): void => {
    setThemePreference(resolvedTheme.value === 'dark' ? 'light' : 'dark')
  }

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', onSystemThemeChange)
  })

  return {
    preference: computed(() => preference.value),
    resolvedTheme: computed(() => resolvedTheme.value),
    setThemePreference,
    toggleTheme,
  }
}
