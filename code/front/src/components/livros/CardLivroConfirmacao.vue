<script setup lang="ts">
import { computed } from 'vue'

import { formatarPaginas } from '../../livros/formatos'
import type { LivroImportadoResumo } from '../../services/acervo'
import CapaLivro from './CapaLivro.vue'

/**
 * Card do livro em variante de confirmação (cadastro-por-isbn.md §4.4 e §5.3): capa pequena e
 * ficha reduzida com título, autor, editora e ano, e páginas. O resumo vem da importação
 * concluída ou do `409`; sem ele (servidor antigo), o card cai para o ISBN.
 */
const props = defineProps<{ livro: LivroImportadoResumo | null; isbn: string | null }>()

const editoraEAno = computed(() =>
  [props.livro?.editora, props.livro?.anoPublicacao].filter((parte) => parte !== null && parte !== undefined).join(' · '),
)
</script>

<template>
  <div class="flex items-start gap-space-4 rounded-md bg-papel-elevado p-space-5">
    <CapaLivro
      class="h-[90px] w-[60px] md:h-[120px] md:w-[80px]"
      :url="livro?.capaUrl"
      :rotulo="livro ? `Capa de ${livro.titulo}` : ''"
      :icone="false"
    />
    <div
      v-if="livro"
      class="flex min-w-0 flex-col"
    >
      <p class="line-clamp-2 text-title-sm text-tinta">
        {{ livro.titulo }}
      </p>
      <p
        v-if="livro.autores"
        class="mt-space-1 text-body text-grafite"
      >
        {{ livro.autores }}
      </p>
      <p
        v-if="editoraEAno"
        class="mt-space-1 text-caption text-grafite-suave"
      >
        {{ editoraEAno }}
      </p>
      <p class="mt-space-1 text-caption text-grafite-suave">
        {{ formatarPaginas(livro.paginas) }}
      </p>
    </div>
    <div
      v-else
      class="flex min-w-0 flex-col gap-space-1"
    >
      <p class="text-caption text-grafite">
        ISBN
      </p>
      <p class="font-mono text-num-inline tabular-nums text-tinta">
        {{ isbn ?? '' }}
      </p>
    </div>
  </div>
</template>
