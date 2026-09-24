<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Estado vazio com desenho intencional (documento-de-design §5.1 e §8): ícone em círculo de
 * 72px, título e texto centralizados, alinhado ao topo e nunca ao meio da tela. O ícone é
 * decorativo; quem carrega o significado é o título.
 */
defineProps<{
  icone: Component
  titulo: string
}>()
</script>

<template>
  <div class="flex flex-col items-center text-center">
    <div class="flex size-[72px] items-center justify-center rounded-full bg-papel-elevado">
      <component
        :is="icone"
        :size="32"
        weight="regular"
        class="text-grafite-suave"
        aria-hidden="true"
      />
    </div>
    <h2 class="mt-space-6 text-title text-tinta">
      {{ titulo }}
    </h2>
    <slot />
  </div>
</template>
