<script setup lang="ts">
import { RouterLink } from 'vue-router'

/**
 * Placeholder (P0-NAV): conteúdo real entra com F-EST no Período 1. Até lá, a tela já
 * oferece o cadastro por ISBN, que é o destino do estado vazio dela (cadastro-por-isbn.md §1).
 */
</script>

<template>
  <div class="py-space-8">
    <p class="text-body text-grafite">
      Sua estante aparece aqui.
    </p>
    <RouterLink
      to="/estante/adicionar"
      class="mt-space-3 inline-flex min-h-12 items-center text-body-strong text-musgo underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none md:min-h-10"
    >
      Cadastrar por ISBN
    </RouterLink>
  </div>
</template>
