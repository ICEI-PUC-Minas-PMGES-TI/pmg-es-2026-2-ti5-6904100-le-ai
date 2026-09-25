<script setup lang="ts">
import { PhGlobe, PhLock } from '@phosphor-icons/vue'

import type { Privacidade } from '../../services/perfil'

/**
 * Chip de privacidade (meu-perfil.md §4, perfil-de-outro-leitor.md §4). Distinguível sem cor:
 * ícone e palavra.
 */
defineProps<{ privacidade: Privacidade }>()
</script>

<template>
  <p
    v-if="privacidade === 'publico'"
    class="inline-flex items-center gap-space-1 rounded-full bg-musgo-fundo px-space-3 py-space-1 text-caption font-semibold text-musgo"
  >
    <PhGlobe
      :size="16"
      weight="regular"
      aria-hidden="true"
    />
    Perfil público
  </p>
  <p
    v-else
    class="inline-flex items-center gap-space-1 rounded-full border border-linha bg-papel-elevado px-space-3 py-space-1 text-caption font-semibold text-grafite"
  >
    <PhLock
      :size="16"
      weight="regular"
      aria-hidden="true"
    />
    Perfil privado
  </p>
</template>
