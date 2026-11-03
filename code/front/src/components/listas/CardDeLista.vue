<script setup lang="ts">
import { PhCaretRight } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import { contagemDeLivros } from '../../listas/textos'
import type { ListaResumo } from '../../services/listas'
import MosaicoDeCapas from './MosaicoDeCapas.vue'

/**
 * Card de lista (listas-do-leitor.md): `linha` é o desenho mobile, mosaico pequeno à esquerda e
 * `CaretRight`; `grade` é o card da aba `Listas` na web, mosaico grande em cima. O card inteiro é
 * um link, anunciado com o conteúdo completo (§9); o mosaico é decorativo.
 */
const props = defineProps<{ lista: ListaResumo; para: RouteLocationRaw; forma: 'linha' | 'grade' }>()

const rotulo = computed(() =>
  [`${props.lista.titulo}, ${contagemDeLivros(props.lista.quantidadeLivros)}.`, props.lista.descricao, 'Abrir lista.']
    .filter(Boolean)
    .join(' '),
)
</script>

<template>
  <RouterLink
    :to="para"
    :aria-label="rotulo"
    class="group flex rounded-base transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
    :class="forma === 'grade' ? 'flex-col p-space-4 hover:bg-papel-elevado' : 'items-center gap-space-4 py-space-4'"
  >
    <MosaicoDeCapas
      :capas="lista.capas"
      :tamanho="forma === 'grade' ? 'grande' : 'pequeno'"
    />
    <span
      class="flex min-w-0 flex-1 flex-col"
      :class="forma === 'grade' ? 'mt-space-4' : ''"
    >
      <!-- Texto de usuário com escape do Vue (RNF-SEC-14). -->
      <span
        class="line-clamp-2 text-title-sm text-tinta transition-colors duration-dur-fast"
        :class="forma === 'grade' ? 'group-hover:text-musgo' : ''"
      >{{ lista.titulo }}</span>
      <span
        v-if="lista.descricao"
        class="mt-space-1 line-clamp-2 text-caption text-grafite"
      >{{ lista.descricao }}</span>
      <span class="mt-space-1 text-caption text-grafite">{{ contagemDeLivros(lista.quantidadeLivros) }}</span>
    </span>
    <PhCaretRight
      v-if="forma === 'linha'"
      :size="20"
      weight="regular"
      class="shrink-0 text-grafite"
      aria-hidden="true"
    />
  </RouterLink>
</template>
