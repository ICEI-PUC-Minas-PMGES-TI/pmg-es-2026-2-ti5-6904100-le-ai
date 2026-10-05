<script setup lang="ts">
import { computed } from 'vue'

import type { CapaDaLista } from '../../services/listas'

/**
 * Mosaico do card de lista (listas-do-leitor.md §4 "Card de lista" e §5): as três primeiras
 * capas em leque horizontal, a primeira na frente, cada uma com contorno de 1px `papel`. Sem
 * capa, `capa-placeholder` **sem texto** (em 48px atrás de outra capa o título não se lê). Lista
 * com menos de três livros completa com retângulos vazios.
 *
 * O leque sai de margem negativa no fluxo, não de posicionamento absoluto: `pequeno` é 48 por
 * 72px deslocadas 20px (88px de largura); `grande`, a medida da web, 80 por 120px deslocadas 32px
 * (144px). Decorativo para leitor de tela.
 */
const props = withDefaults(defineProps<{ capas: CapaDaLista[]; tamanho?: 'pequeno' | 'grande' }>(), {
  tamanho: 'pequeno',
})

const posicoes = computed(() => [0, 1, 2].map((indice) => props.capas[indice] ?? null))
const medida = computed(() => (props.tamanho === 'grande' ? 'h-[120px] w-20' : 'h-[72px] w-12'))
const sobreposicao = computed(() => (props.tamanho === 'grande' ? '-ml-12' : '-ml-7'))
</script>

<template>
  <div
    class="flex shrink-0"
    aria-hidden="true"
  >
    <div
      v-for="(capa, indice) in posicoes"
      :key="indice"
      class="relative overflow-hidden"
      :class="[
        medida,
        indice > 0 ? sobreposicao : '',
        indice === 0 ? 'z-[3]' : indice === 1 ? 'z-[2]' : 'z-[1]',
        capa
          ? 'border border-papel bg-capa-placeholder'
          : 'border border-linha bg-papel-elevado',
      ]"
    >
      <img
        v-if="capa?.capaUrl"
        :src="capa.capaUrl"
        alt=""
        class="size-full object-cover"
      >
    </div>
  </div>
</template>
