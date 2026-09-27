<script setup lang="ts">
import { PhEyeSlash } from '@phosphor-icons/vue'

import BotaoTextual from '../ui/BotaoTextual.vue'

/**
 * Resenha com spoiler (pagina-do-livro.md §4.6, RF-AVA-03): no lugar do texto, que **não está no
 * DOM** até a ação de revelar. Quem usa troca o bloco pelo texto no evento `revelar`.
 */
const emit = defineEmits<{ revelar: [] }>()
</script>

<template>
  <div class="flex min-h-24 flex-col items-center justify-center gap-space-2 rounded-base border border-linha bg-papel-elevado p-space-4 text-center">
    <PhEyeSlash
      :size="20"
      weight="regular"
      class="text-grafite"
      aria-hidden="true"
    />
    <p class="text-caption text-grafite">
      Esta resenha contém spoiler
    </p>
    <BotaoTextual
      class="min-h-12 md:min-h-10"
      @click="emit('revelar')"
    >
      Mostrar mesmo assim
    </BotaoTextual>
  </div>
</template>
