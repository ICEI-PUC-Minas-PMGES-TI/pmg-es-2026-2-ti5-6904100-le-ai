<script setup lang="ts">
import { PhStar, PhStarHalf } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { formatarNota } from '../../livros/formatos'

/**
 * Estrelas em variante de exibição, com meia estrela (documento-de-design §4.3): `sm` em listas,
 * `md` na página do livro. A nota é anunciada por um texto só, `4,5 de 5`, e não por cinco imagens
 * soltas (livro-pessoal.md §9).
 */
const props = withDefaults(defineProps<{ valor: number; tamanho?: 'sm' | 'md' }>(), {
  tamanho: 'md',
})

const TAMANHO_EM_PX = { sm: 16, md: 24 } as const

const estrelas = computed(() =>
  [1, 2, 3, 4, 5].map((posicao) =>
    props.valor >= posicao ? 'cheia' : props.valor >= posicao - 0.5 ? 'meia' : 'vazia',
  ),
)
</script>

<template>
  <div
    :class="['flex items-center', tamanho === 'sm' ? 'gap-space-2' : 'gap-space-3']"
    role="img"
    :aria-label="`${formatarNota(valor)} de 5`"
  >
    <div class="flex gap-space-1">
      <template
        v-for="(estrela, indice) in estrelas"
        :key="indice"
      >
        <PhStarHalf
          v-if="estrela === 'meia'"
          :size="TAMANHO_EM_PX[tamanho]"
          weight="fill"
          class="text-musgo"
          aria-hidden="true"
        />
        <PhStar
          v-else
          :size="TAMANHO_EM_PX[tamanho]"
          :weight="estrela === 'cheia' ? 'fill' : 'regular'"
          :class="estrela === 'cheia' ? 'text-musgo' : 'text-grafite-suave'"
          aria-hidden="true"
        />
      </template>
    </div>
    <span
      :class="[
        'font-mono tabular-nums',
        tamanho === 'sm' ? 'text-caption text-grafite' : 'text-num-inline text-tinta',
      ]"
      aria-hidden="true"
    >{{ formatarNota(valor) }}</span>
  </div>
</template>
