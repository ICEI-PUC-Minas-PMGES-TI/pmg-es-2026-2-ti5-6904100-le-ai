import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import plugin from 'tailwindcss/plugin'

const tokensPath = resolve(process.cwd(), '../../docs/design-system/tokens.json')
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'))

const colorTokens = Object.fromEntries(
  Object.entries(tokens.color).map(([name]) => [name, `var(--color-${name})`]),
)

const spacingTokens = Object.fromEntries(
  Object.entries(tokens.spacing).map(([name, token]) => [`space-${name}`, token.value]),
)

const radiusTokens = Object.fromEntries(
  Object.entries(tokens.radius).map(([name, token]) => [name, token.value]),
)

const fontFamilyTokens = Object.fromEntries(
  Object.entries(tokens.fontFamily).map(([name, token]) => [name, token.value]),
)

const fontSizeTokens = Object.fromEntries(
  Object.entries(tokens.typography)
    .filter(([, token]) => token.value.fontSize)
    .map(([name, token]) => [
      name,
      [token.value.fontSize, {
        fontFamily: token.value.fontFamily,
        fontWeight: token.value.fontWeight,
        lineHeight: token.value.lineHeight,
        letterSpacing: token.value.letterSpacing,
      }],
    ]),
)

const shadowTokens = Object.fromEntries(
  Object.entries(tokens.elevation).map(([name, token]) => [name, token.value]),
)

const durationTokens = Object.fromEntries(
  Object.entries(tokens.duration).map(([name, token]) => [`dur-${name}`, token.value]),
)

const easingTokens = Object.fromEntries(
  Object.entries(tokens.easing).map(([name, token]) => [`ease-${name}`, token.value]),
)

const fontVariables = Object.fromEntries(
  Object.entries(tokens.fontFamily).map(([name, token]) => [`--font-${name}`, token.value.join(', ')]),
)

const durationVariables = Object.fromEntries(
  Object.entries(tokens.duration).map(([name, token]) => [`--duration-${name}`, token.value]),
)

const easingVariables = Object.fromEntries(
  Object.entries(tokens.easing).map(([name, token]) => [`--easing-${name}`, token.value]),
)

const darkColorAliases = {
  papel: 'noite',
  'papel-elevado': 'noite-elevada',
  linha: 'linha-noite',
  tinta: 'papel-suave',
  grafite: 'grafite-claro',
  'grafite-suave': 'grafite-fundo-escuro',
  musgo: 'musgo-claro',
  'musgo-vivo': 'musgo-claro',
  'musgo-fundo': 'musgo-fundo-escuro',
  broto: 'broto-vivo',
  rubi: 'rubi-claro',
  'rubi-fundo': 'rubi-fundo-escuro',
  ambar: 'ambar-claro',
  'ambar-fundo': 'ambar-fundo-escuro',
  'capa-placeholder': 'capa-placeholder-noite',
}

const lightVariables = Object.fromEntries(
  Object.entries(tokens.color).map(([name, token]) => [`--color-${name}`, token.value]),
)

const darkVariables = Object.fromEntries(
  Object.entries(darkColorAliases).map(([name, alias]) => [
    `--color-${name}`,
    tokens.color[alias].value,
  ]),
)

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: colorTokens,
      spacing: spacingTokens,
      borderRadius: radiusTokens,
      fontFamily: fontFamilyTokens,
      fontSize: fontSizeTokens,
      boxShadow: shadowTokens,
      transitionDuration: durationTokens,
      transitionTimingFunction: easingTokens,
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': {
          ...lightVariables,
          ...fontVariables,
          ...durationVariables,
          ...easingVariables,
        },
        '.dark': darkVariables,
      })
    }),
  ],
}
