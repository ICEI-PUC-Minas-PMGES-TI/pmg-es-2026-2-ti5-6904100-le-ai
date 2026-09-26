<script setup lang="ts">
import { PhBookOpen } from '@phosphor-icons/vue'
import { ref, watch } from 'vue'

/**
 * Capa de livro com o placeholder do sistema (documento-de-design §4.5, RN-14.4): retângulo
 * `capa-placeholder` de **canto vivo**, com `BookOpen`, enquanto a imagem não carrega ou quando
 * ela não existe. A medida vem de quem usa, pela classe no elemento raiz.
 *
 * Com `titulo`, o placeholder é **textual** (descobrir.md §4.1): o título centralizado e o autor
 * abaixo, nunca um ícone de livro genérico. O texto corta dentro da capa em vez de estourar.
 */
const props = withDefaults(
  defineProps<{ url?: string | null; rotulo?: string; icone?: boolean; titulo?: string | null; autor?: string | null }>(),
  {
    url: null,
    rotulo: '',
    icone: true,
    titulo: null,
    autor: null,
  },
)

const falhou = ref(false)
watch(
  () => props.url,
  () => {
    falhou.value = false
  },
)
</script>

<template>
  <div class="flex shrink-0 items-center justify-center overflow-hidden bg-capa-placeholder">
    <img
      v-if="url && !falhou"
      :src="url"
      :alt="rotulo"
      class="size-full object-cover"
      @error="falhou = true"
    >
    <span
      v-else-if="titulo"
      class="flex max-h-full flex-col items-center gap-space-1 overflow-hidden p-space-2 text-center"
      aria-hidden="true"
    >
      <span class="line-clamp-4 text-body-strong text-tinta">{{ titulo }}</span>
      <span
        v-if="autor"
        class="line-clamp-2 text-caption text-grafite"
      >{{ autor }}</span>
    </span>
    <PhBookOpen
      v-else-if="icone"
      :size="32"
      weight="regular"
      class="text-grafite-suave"
      aria-hidden="true"
    />
  </div>
</template>
