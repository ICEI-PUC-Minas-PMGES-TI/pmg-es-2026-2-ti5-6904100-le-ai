<script setup lang="ts" generic="T extends ItemDoCard">
import { PhArrowsClockwise, PhCheck, PhHeart } from '@phosphor-icons/vue'
import { computed } from 'vue'

import CapaLivro from '../livros/CapaLivro.vue'
import type { ItemDoCard } from '../../estante/itemDoCard'
import {
  TEXTOS_DA_ESTANTE,
  TEXTOS_DO_FAVORITO,
  TEXTOS_DO_FILTRO_FAVORITOS,
  textoParouNaPagina,
  textoVezesLido,
} from '../../estante/textos'
import type { StatusEstante } from '../../services/leitura'
import StatusPill from './StatusPill.vue'

const props = withDefaults(defineProps<{ item: T; acionavel?: boolean }>(), { acionavel: true })
const emit = defineEmits<{ abrir: [item: T] }>()

const EM_ANDAMENTO: readonly StatusEstante[] = ['LENDO', 'RELENDO']

const percentual = computed(() => {
  const { status, percentualConcluido: valor } = props.item
  return status && EM_ANDAMENTO.includes(status) && valor != null ? Math.round(valor) : null
})

const paradaNaPagina = computed(() => {
  const { status, paginaAtual, totalPaginas } = props.item
  return status === 'ABANDONADO' && paginaAtual != null && totalPaginas != null
    ? textoParouNaPagina(paginaAtual, totalPaginas)
    : null
})

const tag = computed(() => (props.acionavel ? 'button' : 'div'))

function abrir(): void {
  if (props.acionavel) {
    emit('abrir', props.item)
  }
}
</script>

<template>
  <component
    :is="tag"
    :type="acionavel ? 'button' : undefined"
    class="group flex w-full min-w-0 flex-col text-left"
    :class="acionavel ? 'cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo' : ''"
    @click="abrir"
  >
    <div class="relative w-full">
      <CapaLivro
        :url="item.livro.capaUrl"
        class="aspect-[2/3] w-full transition-shadow duration-dur-fast motion-reduce:transition-none"
        :class="acionavel ? 'group-hover:shadow-2' : ''"
      />
      <span
        v-if="item.favorito"
        class="absolute left-space-2 top-space-2 flex size-7 items-center justify-center rounded-full bg-papel shadow-1"
        data-favorito
      >
        <PhHeart
          :size="16"
          weight="fill"
          class="text-musgo"
          aria-hidden="true"
        />
        <span class="sr-only">{{ TEXTOS_DO_FAVORITO.marca }}</span>
      </span>
      <span
        v-if="item.status === 'LIDO' || item.status === 'RELENDO'"
        class="absolute right-space-2 top-space-2 flex size-7 items-center justify-center rounded-full bg-papel shadow-1"
        aria-hidden="true"
      >
        <PhCheck
          v-if="item.status === 'LIDO'"
          :size="20"
          weight="bold"
          class="text-musgo"
        />
        <PhArrowsClockwise
          v-else
          :size="20"
          weight="regular"
          class="text-broto"
        />
      </span>
    </div>

    <div
      v-if="percentual !== null"
      class="mt-space-2 flex items-center gap-space-2"
    >
      <div
        class="h-1.5 flex-1 overflow-hidden rounded-full bg-musgo-fundo"
        role="progressbar"
        :aria-valuenow="percentual"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`Progresso de ${item.livro.titulo}`"
      >
        <div
          class="h-full rounded-full bg-musgo"
          :style="{ width: `${percentual}%` }"
        />
      </div>
      <span class="font-mono text-caption tabular-nums text-grafite">
        {{ percentual === 0 ? TEXTOS_DA_ESTANTE.progressoIniciado : `${percentual}%` }}
      </span>
    </div>

    <p
      class="mt-space-2 line-clamp-2 text-title-sm text-tinta transition-colors duration-dur-fast motion-reduce:transition-none"
      :class="acionavel ? 'group-hover:text-musgo' : ''"
    >
      {{ item.livro.titulo }}
    </p>
    <p
      v-if="item.livro.autor"
      class="truncate text-caption text-grafite"
    >
      {{ item.livro.autor }}
    </p>

    <StatusPill
      v-if="item.status"
      class="mt-space-2 self-start"
      :status="item.status"
    />
    <p
      v-else
      class="mt-space-2 text-caption text-grafite"
    >
      {{ TEXTOS_DO_FILTRO_FAVORITOS.foraDaEstante }}
    </p>

    <p
      v-if="paradaNaPagina"
      class="mt-space-1 text-caption text-grafite"
    >
      {{ paradaNaPagina }}
    </p>
    <p
      v-if="item.vezesLido"
      class="mt-space-1 text-caption text-grafite"
    >
      {{ textoVezesLido(item.vezesLido) }}
    </p>
  </component>
</template>
