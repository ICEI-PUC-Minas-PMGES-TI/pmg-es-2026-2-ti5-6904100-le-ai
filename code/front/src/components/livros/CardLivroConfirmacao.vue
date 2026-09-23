<script setup lang="ts">
import CapaLivro from './CapaLivro.vue'

/**
 * Card do livro em variante de confirmação (cadastro-por-isbn.md §4.4 e §5.3): capa pequena e
 * ficha reduzida. O contrato de `Importacao` e o `409` trazem só o `livroId`, e a página do livro
 * oficial é de F-ACV-BUSCA; até lá o card mostra o ISBN no lugar de título, autor e editora
 * (divergência registrada no arquivo da feature).
 */
defineProps<{ isbn: string | null }>()
</script>

<template>
  <div class="flex items-start gap-space-4 rounded-md bg-papel-elevado p-space-5">
    <CapaLivro
      class="h-[90px] w-[60px] md:h-[120px] md:w-[80px]"
      :icone="false"
    />
    <div class="flex min-w-0 flex-col gap-space-1">
      <p class="text-caption text-grafite">
        ISBN
      </p>
      <p class="font-mono text-num-inline tabular-nums text-tinta">
        {{ isbn ?? '' }}
      </p>
    </div>
  </div>
</template>
