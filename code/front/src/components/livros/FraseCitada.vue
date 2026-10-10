<script setup lang="ts">
import { PhTrash } from '@phosphor-icons/vue'

import { referenciaDaFrase } from '../../livros/frases'
import type { Frase } from '../../services/leitura'

/**
 * Uma frase (frases-do-livro.md, "Item de frase"): o texto em Newsreader italic num blockquote
 * com borda esquerda de 2px `musgo-fundo`, sem aspas decorativas, e a referência abaixo
 * (`Página 57 · @marina.antunes`, ou `você`). O texto vai por interpolação, com escape: frase é
 * texto puro.
 *
 * `comExcluir` mostra o `Trash` só na frase de quem olha; a página do livro não tem ação.
 * `compacta` é a versão de `body` da confirmação de exclusão.
 */
const props = withDefaults(defineProps<{ frase: Frase; comExcluir?: boolean; compacta?: boolean }>(), {
  comExcluir: false,
  compacta: false,
})
const emit = defineEmits<{ excluir: [] }>()
</script>

<template>
  <figure class="flex flex-col">
    <blockquote
      class="whitespace-pre-line border-l-2 border-musgo-fundo pl-space-4 font-editorial italic text-tinta"
      :class="props.compacta ? 'text-body' : 'text-body-lg'"
    >
      {{ props.frase.texto }}
    </blockquote>
    <figcaption
      class="mt-space-2 flex items-center justify-between gap-space-3 pl-space-4"
      :class="props.comExcluir && props.frase.minha ? 'min-h-12 md:min-h-10' : ''"
    >
      <span class="text-caption text-grafite">{{ referenciaDaFrase(props.frase) }}</span>
      <button
        v-if="props.comExcluir && props.frase.minha"
        type="button"
        class="flex size-12 shrink-0 items-center justify-center rounded-base text-grafite transition-colors duration-dur-fast hover:bg-linha hover:text-rubi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:size-10"
        :aria-label="`Excluir frase da página ${props.frase.pagina}`"
        @click="emit('excluir')"
      >
        <PhTrash
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
      </button>
    </figcaption>
  </figure>
</template>
