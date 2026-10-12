<script setup lang="ts">
import type { ParteDoTempo } from '../../estatisticas/formatos'

/**
 * Linha de métrica total (F-STA): label em `caption` sobre o número em
 * `num-display` com a unidade em `body-strong`, na mesma linha de base. O
 * tempo chega em partes (`71` `h` `20` `min`) e quebra entre elas se não couber.
 */
defineProps<{
  rotulo: string
  partes: { numero: string; unidade: ParteDoTempo['unidade'] | string }[]
  /** Leitura única para leitor de tela: `9 livros`. */
  leitura: string
}>()
</script>

<template>
  <div class="flex flex-col gap-space-1">
    <span class="text-caption text-grafite">{{ rotulo }}</span>
    <span class="sr-only">{{ leitura }}</span>
    <span
      class="flex flex-wrap items-baseline gap-x-space-2"
      aria-hidden="true"
    >
      <span
        v-for="(parte, i) in partes"
        :key="i"
        class="inline-flex items-baseline gap-space-1"
      >
        <span class="font-mono text-num-display tabular-nums text-tinta">{{ parte.numero }}</span>
        <span class="text-body-strong text-grafite">{{ parte.unidade }}</span>
      </span>
    </span>
  </div>
</template>
