<script setup lang="ts">
import { PhMoon, PhSun } from '@phosphor-icons/vue'

import { useTheme } from '../theme'

const { resolvedTheme, toggleTheme } = useTheme()
</script>

<template>
  <main
    class="relative grid min-h-screen place-items-center bg-papel px-space-5 text-tinta transition-colors duration-dur-fast dark:bg-noite dark:text-papel-suave"
    aria-labelledby="page-title"
  >
    <button
      class="absolute right-space-5 top-space-5 inline-flex size-space-12 items-center justify-center rounded-full border border-linha bg-papel-elevado text-musgo transition-colors duration-dur-fast hover:bg-musgo-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo active:scale-[0.98] dark:border-linha-noite dark:bg-noite-elevada dark:text-musgo-claro dark:hover:bg-musgo-fundo-escuro"
      type="button"
      :aria-label="resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'"
      :title="resolvedTheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'"
      @click="toggleTheme"
    >
      <PhSun
        v-if="resolvedTheme === 'dark'"
        :size="24"
        weight="regular"
        aria-hidden="true"
      />
      <PhMoon
        v-else
        :size="24"
        weight="regular"
        aria-hidden="true"
      />
    </button>

    <h1
      id="page-title"
      class="font-display text-display font-semibold tracking-tight text-musgo dark:text-musgo-claro"
    >
      Lê Ai
    </h1>
  </main>
</template>
