<script setup lang="ts">
import { PhStar, PhStarHalf } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { formatarNota } from '../../livros/formatos'

/**
 * Estrelas em variante de exibição, com meia estrela (documento-de-design §4.3): `sm` em listas,
 * `md` na página do livro. A nota é anunciada por um texto só, `4,5 de 5`, e não por cinco imagens
 * soltas (livro-pessoal.md §9).
 *
 * `valor` nulo é "sem nota": as cinco estrelas vazias e o texto `Sem nota`, nunca `0,0`. Nota `0`
 * tem as mesmas estrelas e só o texto distingue (RN-06).
 */
const props = withDefaults(defineProps<{ valor: number | null; tamanho?: 'sm' | 'md' }>(), {
  tamanho: 'md',
})

const TAMANHO_EM_PX = { sm: 16, md: 24 } as const

const estrelas = computed(() => {
  const valor = props.valor ?? -1
  return [1, 2, 3, 4, 5].map((posicao) =>
    valor >= posicao ? 'cheia' : valor >= posicao - 0.5 ? 'meia' : 'vazia',
  )
})

const texto = computed(() => (props.valor === null ? 'Sem nota' : formatarNota(props.valor)))
</script>

<template>
  <div
    :class="['flex items-center', tamanho === 'sm' ? 'gap-space-2' : 'gap-space-3']"
    role="img"
    :aria-label="valor === null ? 'Sem nota' : `${texto} de 5`"
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
      v-if="valor === null"
      class="text-caption text-grafite-suave"
      aria-hidden="true"
    >Sem nota</span>
    <span
      v-else
      :class="[
        'font-mono tabular-nums',
        tamanho === 'sm' ? 'text-caption text-grafite' : 'text-num-inline text-tinta',
      ]"
      aria-hidden="true"
    >{{ texto }}</span>
  </div>
</template>
