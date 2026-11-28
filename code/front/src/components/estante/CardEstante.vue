<script setup lang="ts" generic="T extends ItemDoCard">
import { PhArrowsClockwise, PhCheck, PhDotsThree, PhHeart } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import CapaLivro from '../livros/CapaLivro.vue'
import type { ItemDoCard } from '../../estante/itemDoCard'
import { rotaDoLivroDoCard, type OrigemDoCard } from '../../estante/rotaDoLivroDoCard'
import {
  TEXTOS_DA_ESTANTE,
  TEXTOS_DO_FAVORITO,
  TEXTOS_DO_FILTRO_FAVORITOS,
  rotuloDasAcoesDoLivro,
  textoParouNaPagina,
  textoVezesLido,
} from '../../estante/textos'
import type { StatusEstante } from '../../services/leitura'
import StatusPill from './StatusPill.vue'

/**
 * Capa e título levam à página do livro; o resto do card e o botão de mais ações abrem o painel de
 * ações (`acionavel`). Sem rota (livro pessoal no perfil de outro leitor), capa e título ficam sem link.
 */
const props = withDefaults(defineProps<{ item: T; acionavel?: boolean; origem?: OrigemDoCard }>(), {
  acionavel: true,
  origem: 'estante',
})
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

const rota = computed(() => rotaDoLivroDoCard(props.item, props.origem))

function abrir(): void {
  if (props.acionavel) {
    emit('abrir', props.item)
  }
}
</script>

<template>
  <div class="flex w-full min-w-0 flex-col text-left">
    <div class="group/capa relative w-full">
      <!-- A capa repete o link do título: fora da ordem de tabulação e do leitor de tela. -->
      <RouterLink
        v-if="rota"
        :to="rota"
        tabindex="-1"
        aria-hidden="true"
        class="block rounded-sm"
        data-link-capa
      >
        <CapaLivro
          :url="item.livro.capaUrl"
          class="aspect-[2/3] w-full transition-shadow duration-dur-fast group-hover/capa:shadow-2 motion-reduce:transition-none"
        />
      </RouterLink>
      <CapaLivro
        v-else
        :url="item.livro.capaUrl"
        class="aspect-[2/3] w-full"
      />
      <span
        v-if="item.favorito"
        class="pointer-events-none absolute left-space-2 top-space-2 flex size-7 items-center justify-center rounded-full bg-papel shadow-1"
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
        class="pointer-events-none absolute right-space-2 top-space-2 flex size-7 items-center justify-center rounded-full bg-papel shadow-1"
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
      <button
        v-if="acionavel"
        type="button"
        :aria-label="rotuloDasAcoesDoLivro(item.livro.titulo)"
        class="absolute bottom-space-2 right-space-2 flex size-10 cursor-pointer items-center justify-center rounded-full bg-papel text-tinta shadow-1 transition-colors duration-dur-fast hover:text-musgo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo motion-reduce:transition-none md:size-8"
        data-acoes
        @click="abrir"
      >
        <PhDotsThree
          :size="20"
          weight="bold"
          aria-hidden="true"
        />
      </button>
    </div>

    <div
      v-if="percentual !== null"
      class="mt-space-2 flex items-center gap-space-2"
      :class="acionavel ? 'cursor-pointer' : ''"
      @click="abrir"
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

    <RouterLink
      v-if="rota"
      :to="rota"
      class="mt-space-2 line-clamp-2 self-start rounded-sm text-title-sm text-tinta transition-colors duration-dur-fast hover:text-musgo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo motion-reduce:transition-none"
      data-link-titulo
    >
      {{ item.livro.titulo }}
    </RouterLink>
    <p
      v-else
      class="mt-space-2 line-clamp-2 text-title-sm text-tinta"
    >
      {{ item.livro.titulo }}
    </p>

    <!-- Toque no resto do card abre as ações, como antes; o botão acima é o caminho acessível. -->
    <div
      class="flex flex-1 flex-col"
      :class="acionavel ? 'cursor-pointer' : ''"
      data-resto-do-card
      @click="abrir"
    >
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
    </div>
  </div>
</template>
