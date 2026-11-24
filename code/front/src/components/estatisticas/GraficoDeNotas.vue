<script setup lang="ts">
import { PhChartBar, PhTable } from '@phosphor-icons/vue'
import { computed, nextTick, ref, useId, watch } from 'vue'

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

const FOLGA_DO_BALAO = 8

const idDoTitulo = useId()
const modo = ref<'grafico' | 'tabela'>('grafico')
const ativo = ref<number | null>(null)
const porTeclado = ref(false)
const anuncio = ref('')
const caixa = ref<HTMLElement | null>(null)
const balao = ref<HTMLElement | null>(null)
const posicaoDoBalao = ref({ left: 0, top: 0 })

const faixas = computed(() => props.distribuicao?.faixas ?? [])
const faixaAtiva = computed(() => (ativo.value === null ? null : (faixas.value[ativo.value] ?? null)))
async function posicionarBalao(): Promise<void> {
  await nextTick()
  const indice = ativo.value
  if (indice === null || !caixa.value || !balao.value) return
  const nota = caixa.value.querySelectorAll('[data-nota]')[indice]
  if (!nota) return
  const moldura = caixa.value.getBoundingClientRect()
  const faixa = nota.getBoundingClientRect()
  const ponta = (nota.querySelector('[data-coluna]') ?? nota).getBoundingClientRect()
  const pontaDaColuna = (nota.querySelector('[data-coluna]') ? ponta.top : faixa.bottom) - moldura.top
  const centro = faixa.left - moldura.left + faixa.width / 2
  const { offsetWidth: largura, offsetHeight: alturaDoBalao } = balao.value
  posicaoDoBalao.value = {
    left: Math.min(Math.max(0, centro - largura / 2), Math.max(0, caixa.value.clientWidth - largura)),
    top: Math.max(0, pontaDaColuna - FOLGA_DO_BALAO - alturaDoBalao),
  }
}

watch(ativo, () => void posicionarBalao())

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
        ref="caixa"
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
          ref="balao"
          class="pointer-events-none absolute z-10 whitespace-nowrap rounded-base border border-transparent bg-papel px-space-3 py-space-2 shadow-2 dark:border-linha"
          :style="{ left: `${posicaoDoBalao.left}px`, top: `${posicaoDoBalao.top}px` }"
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
