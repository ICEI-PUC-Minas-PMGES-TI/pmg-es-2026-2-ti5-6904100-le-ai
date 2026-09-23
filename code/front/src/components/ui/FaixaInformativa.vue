<script setup lang="ts">
import { PhInfo } from '@phosphor-icons/vue'

/**
 * Faixa informativa neutra em `musgo-fundo` (cadastro-por-isbn.md §4.5): para a informação que
 * não é erro nem alerta, como o ISBN já cadastrado. Usar `ambar` ali passaria a ideia errada.
 * Nasceu no prompt e está pendente de incorporação ao documento-de-design.
 */
</script>

<template>
  <div class="flex items-start gap-space-3 rounded-base bg-musgo-fundo p-space-4">
    <PhInfo
      :size="20"
      weight="regular"
      class="mt-0.5 shrink-0 text-musgo"
      aria-hidden="true"
    />
    <p class="text-body text-tinta">
      <slot />
    </p>
  </div>
</template>
