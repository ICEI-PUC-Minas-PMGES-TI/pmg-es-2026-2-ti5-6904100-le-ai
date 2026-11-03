<script setup lang="ts">
/**
 * Linha de média com a regra da conta (F-STA). No celular, label e ajuda à
 * esquerda e o valor à direita, com a unidade embaixo (4.1); na web, label,
 * valor com a unidade ao lado e a ajuda embaixo (5.1). Sem denominador, uma
 * frase no lugar do número: nunca `0`, nunca traço.
 */
defineProps<{
  rotulo: string
  ajuda: string
  /** Número já formatado (`20,4`); nulo quando a média está ausente. */
  valor: string | null
  unidade: string
  ausente: string
}>()
</script>

<template>
  <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-space-4 gap-y-space-1 md:grid-cols-1 md:gap-y-space-2">
    <span class="col-start-1 row-start-1 text-body-strong text-tinta">{{ rotulo }}</span>
    <span
      class="col-start-2 row-span-2 row-start-1 flex flex-col items-end md:col-start-1 md:row-span-1 md:row-start-2 md:flex-row md:items-baseline md:gap-space-2"
    >
      <template v-if="valor !== null">
        <span class="font-mono text-title font-medium tabular-nums text-tinta">{{ valor }}</span>
        <span class="text-caption text-grafite">{{ unidade }}</span>
      </template>
      <span
        v-else
        class="max-w-[140px] text-right text-caption text-grafite md:max-w-none md:text-left"
      >{{ ausente }}</span>
    </span>
    <span class="col-start-1 row-start-2 text-caption text-grafite md:row-start-3">{{ ajuda }}</span>
  </div>
</template>
