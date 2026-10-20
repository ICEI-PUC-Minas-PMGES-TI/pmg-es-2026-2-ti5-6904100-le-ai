<script setup lang="ts">
import { PhArrowsClockwise, PhCaretRight } from '@phosphor-icons/vue'
import { RouterLink } from 'vue-router'

import { TEXTOS_DO_HISTORICO, dataPorExtenso, textoConcluido, textoDuracao } from '../../historico/textos'
import type { OcorrenciaDaLista } from '../../historico/useHistorico'
import { caminhoDoProgresso } from '../../progresso/caminhos'
import CapaLivro from '../livros/CapaLivro.vue'

withDefaults(defineProps<{ ocorrencia: OcorrenciaDaLista; comLivro?: boolean }>(), { comLivro: true })
</script>

<template>
  <RouterLink
    :to="caminhoDoProgresso(ocorrencia.leituraId)"
    class="group flex items-center gap-space-4 py-space-4 transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo motion-reduce:transition-none md:grid md:py-space-2 md:hover:bg-papel-elevado"
    :class="comLivro ? 'md:grid-cols-[minmax(0,2fr)_120px_1fr_1fr_80px_20px]' : 'min-h-12 md:grid-cols-[120px_1fr_1fr_80px_20px]'"
    data-ocorrencia
  >
    <div
      v-if="comLivro"
      class="flex min-w-0 flex-1 items-center gap-space-4 md:gap-space-3"
    >
      <CapaLivro
        :url="ocorrencia.livro.capaUrl"
        class="h-[72px] w-12 shrink-0 md:h-12 md:w-8"
      />
      <div class="min-w-0">
        <p class="line-clamp-2 text-title-sm text-tinta md:text-body-strong">
          {{ ocorrencia.livro.titulo }}
        </p>
        <p
          v-if="ocorrencia.livro.autor"
          class="truncate text-caption text-grafite"
        >
          {{ ocorrencia.livro.autor }}
        </p>
        <p class="mt-space-1 flex items-center gap-space-1 text-caption text-grafite md:hidden">
          <template v-if="ocorrencia.releitura">
            <PhArrowsClockwise
              :size="16"
              weight="regular"
              class="text-broto"
              aria-hidden="true"
            />
            <span class="font-semibold">{{ TEXTOS_DO_HISTORICO.releitura }}</span>
            <span aria-hidden="true">·</span>
          </template>
          {{ textoConcluido(ocorrencia.dataFim, ocorrencia.duracaoDias) }}
        </p>
      </div>
    </div>

    <div
      v-else
      class="flex min-w-0 flex-1 flex-col md:hidden"
    >
      <p class="flex items-center gap-space-1 text-caption font-semibold text-grafite">
        <PhArrowsClockwise
          v-if="ocorrencia.releitura"
          :size="16"
          weight="regular"
          class="text-broto"
          aria-hidden="true"
        />
        {{ ocorrencia.releitura ? TEXTOS_DO_HISTORICO.releitura : TEXTOS_DO_HISTORICO.leitura }}
      </p>
      <p class="text-caption text-grafite">
        {{ textoConcluido(ocorrencia.dataFim, ocorrencia.duracaoDias) }}
      </p>
    </div>

    <p class="hidden items-center gap-space-1 text-caption text-grafite md:flex">
      <PhArrowsClockwise
        v-if="ocorrencia.releitura"
        :size="16"
        weight="regular"
        class="text-broto"
        aria-hidden="true"
      />
      <span :class="ocorrencia.releitura ? 'font-semibold' : ''">
        {{ ocorrencia.releitura ? TEXTOS_DO_HISTORICO.releitura : TEXTOS_DO_HISTORICO.leitura }}
      </span>
    </p>
    <p class="hidden text-caption text-grafite md:block">
      {{ dataPorExtenso(ocorrencia.dataInicio) }}
    </p>
    <p class="hidden text-caption text-grafite md:block">
      {{ dataPorExtenso(ocorrencia.dataFim) }}
    </p>
    <p class="hidden font-mono text-num-inline tabular-nums text-tinta md:block">
      {{ textoDuracao(ocorrencia.duracaoDias) }}
    </p>
    <PhCaretRight
      :size="20"
      weight="regular"
      class="shrink-0 text-grafite transition-colors duration-dur-fast group-hover:text-musgo motion-reduce:transition-none"
      aria-hidden="true"
    />
  </RouterLink>
</template>
