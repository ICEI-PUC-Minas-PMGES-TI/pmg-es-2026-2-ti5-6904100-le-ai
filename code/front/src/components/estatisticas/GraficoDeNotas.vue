<script setup lang="ts">
import { PhChartBar, PhTable } from '@phosphor-icons/vue'
import { computed, ref, useId, watch } from 'vue'

import {
  leituraDaNota,
  quantidadeDeLivros,
  resumoDasNotas,
  rotuloEstrelas,
  rotuloLivros,
  semNotasNoPeriodo,
  subtituloDasNotas,
  TEXTOS_DAS_ESTATISTICAS,
  TEXTOS_DAS_NOTAS as T,
  tituloDoBalaoDaNota,
} from '../../estatisticas/textos'
import type { DistribuicaoNotas, PeriodoEstatisticas } from '../../services/leitura'
import BotaoTextual from '../ui/BotaoTextual.vue'
import ColunasDeNotas from './ColunasDeNotas.vue'

const props = defineProps<{
  distribuicao: DistribuicaoNotas | null
  periodo: PeriodoEstatisticas
  primeiroRegistro: string | null
}>()

const BORDA_ESQUERDA = 1
const BORDA_DIREITA = 9

const idDoTitulo = useId()
const modo = ref<'grafico' | 'tabela'>('grafico')
const ativo = ref<number | null>(null)
const porTeclado = ref(false)
const anuncio = ref('')

const faixas = computed(() => props.distribuicao?.faixas ?? [])
const faixaAtiva = computed(() => (ativo.value === null ? null : (faixas.value[ativo.value] ?? null)))
const posicaoDoBalao = computed(() => {
  const indice = ativo.value ?? 0
  const centro = ((indice + 0.5) / Math.max(1, faixas.value.length)) * 100
  if (indice <= BORDA_ESQUERDA) return { left: '0' }
  if (indice >= BORDA_DIREITA) return { right: '0' }
  return { left: `${centro}%`, transform: 'translateX(-50%)' }
})

watch(
  () => props.distribuicao,
  () => {
    ativo.value = null
    anuncio.value = ''
  },
)

function fechar(): void {
  ativo.value = null
  porTeclado.value = false
}

function sairComOMouse(): void {
  if (!porTeclado.value) fechar()
}

function ativarComOMouse(indice: number): void {
  porTeclado.value = false
  ativo.value = indice
}

function teclar(evento: KeyboardEvent): void {
  const total = faixas.value.length
  const destinos: Record<string, () => number> = {
    ArrowRight: () => Math.min(total - 1, (ativo.value ?? -1) + 1),
    ArrowLeft: () => Math.max(0, (ativo.value ?? total) - 1),
    Home: () => 0,
    End: () => total - 1,
  }
  const destino = destinos[evento.key]
  if (destino) {
    evento.preventDefault()
    porTeclado.value = true
    ativo.value = destino()
    anuncio.value = leituraDaNota(faixas.value[ativo.value]!)
  } else if (evento.key === 'Escape' && ativo.value !== null) {
    evento.preventDefault()
    fechar()
  }
}
</script>

<template>
  <section
    class="rounded-md bg-papel-elevado p-space-5"
    :aria-labelledby="idDoTitulo"
  >
    <h3
      :id="idDoTitulo"
      class="text-title-sm text-tinta"
    >
      {{ T.titulo }}
    </h3>

    <p
      v-if="!distribuicao"
      class="mt-space-4 text-body text-grafite"
    >
      {{ semNotasNoPeriodo(periodo) }}
    </p>

    <template v-else>
      <p class="mt-space-1 text-caption text-grafite">
        {{ subtituloDasNotas(periodo, distribuicao.total, primeiroRegistro) }}
      </p>

      <div
        v-if="modo === 'grafico'"
        class="relative mt-space-4 rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        tabindex="0"
        role="group"
        :aria-label="resumoDasNotas(periodo, distribuicao)"
        @keydown="teclar"
        @blur="fechar"
        @mouseleave="sairComOMouse"
      >
        <ColunasDeNotas
          class="pt-space-10"
          :faixas="faixas"
          :ativo="ativo"
          interativo
          @ativar="ativarComOMouse"
        />

        <div
          v-if="faixaAtiva"
          class="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-base border border-transparent bg-papel px-space-3 py-space-2 shadow-2 dark:border-linha"
          :style="posicaoDoBalao"
          aria-hidden="true"
          data-balao
        >
          <span class="block text-caption text-grafite">{{ tituloDoBalaoDaNota(faixaAtiva) }}</span>
          <span class="block text-body-strong text-tinta">{{ quantidadeDeLivros(faixaAtiva.quantidade) }}</span>
        </div>

        <p
          class="sr-only"
          aria-live="polite"
        >
          {{ anuncio }}
        </p>
      </div>

      <table
        v-else
        class="mt-space-4 w-full border-collapse"
      >
        <caption class="sr-only">
          {{ T.titulo }}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="pb-space-2 text-left text-label text-grafite"
            >
              {{ T.colunaNota }}
            </th>
            <th
              scope="col"
              class="pb-space-2 text-right text-label text-grafite"
            >
              {{ T.colunaLivros }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="faixa in faixas"
            :key="faixa.valor"
            class="h-11 border-t border-linha"
          >
            <th
              scope="row"
              class="text-left text-body font-normal text-tinta"
            >
              {{ rotuloEstrelas(faixa.valor) }}
            </th>
            <td class="whitespace-nowrap text-right font-mono text-num-inline tabular-nums text-tinta">
              {{ rotuloLivros(faixa.quantidade) }}
            </td>
          </tr>
          <tr class="h-11 border-t border-linha">
            <th
              scope="row"
              class="text-left text-body-strong text-tinta"
            >
              {{ T.total }}
            </th>
            <td class="whitespace-nowrap text-right font-mono text-num-inline font-semibold tabular-nums text-tinta">
              {{ rotuloLivros(distribuicao.total) }}
            </td>
          </tr>
        </tbody>
      </table>

      <p
        v-if="modo === 'grafico'"
        class="mt-space-2 text-caption text-grafite"
      >
        {{ T.legenda }}
      </p>
      <p class="mt-space-3 text-caption text-grafite">
        {{ T.ajuda }}
      </p>

      <BotaoTextual
        class="mt-space-3 min-h-12 gap-space-2"
        @click="modo = modo === 'grafico' ? 'tabela' : 'grafico'"
      >
        <PhTable
          v-if="modo === 'grafico'"
          :size="20"
          aria-hidden="true"
        />
        <PhChartBar
          v-else
          :size="20"
          aria-hidden="true"
        />
        {{ modo === 'grafico' ? TEXTOS_DAS_ESTATISTICAS.verComoTabela : TEXTOS_DAS_ESTATISTICAS.verComoGrafico }}
      </BotaoTextual>
    </template>
  </section>
</template>
