<script setup lang="ts">
import { computed } from 'vue'

import { formatarInteiro } from '../../estatisticas/formatos'
import { leituraDaNota } from '../../estatisticas/textos'
import { formatarNota } from '../../livros/formatos'
import type { FaixaDeNota } from '../../services/leitura'

const props = withDefaults(
  defineProps<{
    faixas: FaixaDeNota[]
    compacto?: boolean
    ativo?: number | null
    interativo?: boolean
  }>(),
  { compacto: false, ativo: null, interativo: false },
)

const emit = defineEmits<{ ativar: [indice: number] }>()

const PROPORCAO_DA_MAIOR_COLUNA = 75
const PROPORCAO_DA_MAIOR_COLUNA_COMPACTA = 70

const maior = computed(() => Math.max(1, ...props.faixas.map((f) => f.quantidade)))
const proporcaoMaxima = computed(() =>
  props.compacto ? PROPORCAO_DA_MAIOR_COLUNA_COMPACTA : PROPORCAO_DA_MAIOR_COLUNA,
)

const altura = computed(() => (props.compacto ? 'h-24' : 'h-[160px] md:h-[200px]'))
const larguraDaColuna = computed(() => (props.compacto ? 'w-3' : 'w-4 md:w-5'))

const alturaDaColuna = (quantidade: number) => `${(quantidade / maior.value) * proporcaoMaxima.value}%`
</script>

<template>
  <div class="@container">
    <ul class="sr-only">
      <li
        v-for="faixa in faixas"
        :key="faixa.valor"
      >
        {{ leituraDaNota(faixa) }}
      </li>
    </ul>

    <div
      class="flex border-b border-linha"
      :class="[altura, interativo ? 'cursor-pointer' : '']"
      aria-hidden="true"
    >
      <div
        v-for="(faixa, indice) in faixas"
        :key="faixa.valor"
        class="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
        data-nota
        @mouseenter="interativo && emit('ativar', indice)"
        @click="interativo && emit('ativar', indice)"
      >
        <div
          v-if="ativo === indice"
          class="absolute inset-y-0 w-full max-w-8 rounded-sm bg-musgo-fundo"
          data-faixa
        />
        <span
          v-if="ativo !== indice"
          class="relative mb-space-1 text-caption tabular-nums"
          :class="faixa.quantidade === 0 ? 'text-grafite' : 'font-semibold text-tinta'"
          data-contagem
        >{{ formatarInteiro(faixa.quantidade) }}</span>
        <div
          v-if="faixa.quantidade > 0"
          class="relative rounded-t-[4px] bg-musgo"
          :class="larguraDaColuna"
          :style="{ height: alturaDaColuna(faixa.quantidade) }"
          data-coluna
        />
      </div>
    </div>

    <div
      class="flex pt-space-2"
      aria-hidden="true"
    >
      <span
        v-for="faixa in faixas"
        :key="faixa.valor"
        class="min-w-0 flex-1 text-center text-caption tabular-nums text-grafite"
        :class="Number.isInteger(faixa.valor) ? '' : '@max-3xs:invisible'"
      >{{ formatarNota(faixa.valor) }}</span>
    </div>
  </div>
</template>
