<script setup lang="ts">
import { PhChartBar, PhTable } from '@phosphor-icons/vue'
import { computed, nextTick, ref, useId, watch } from 'vue'

import { escalaDoEixo } from '../../estatisticas/escala'
import { type DataLocal, formatarInteiro } from '../../estatisticas/formatos'
import {
  graficoSemDados,
  leituraDoPonto,
  marcaDoEixoX,
  type Medida,
  nomeNaTabela,
  pontoDeMaiorValor,
  pontoEmAndamento,
  resumoDoGrafico,
  rotuloDaMedida,
  somaDaMedida,
  subtituloDoGrafico,
  TEXTOS_DAS_ESTATISTICAS,
  tituloDoBalao,
  tituloDoGrafico,
  valorDoBalao,
  valorDoPonto,
} from '../../estatisticas/textos'
import type { PeriodoEstatisticas, PontoEstatistica } from '../../services/leitura'
import BotaoTextual from '../ui/BotaoTextual.vue'

/**
 * Gráfico de colunas de uma série (F-STA, RF-STA-03), feito à mão: grade de
 * 1px, eixo Y só com marcas, um único rótulo direto no maior valor e o balão
 * do mês no hover, no toque e nas setas do teclado. Todo valor também está na
 * tabela (`Ver como tabela`), e a escolha vale só para este card.
 */
const props = defineProps<{
  medida: Medida
  pontos: PontoEstatistica[]
  periodo: PeriodoEstatisticas
  hoje: DataLocal
}>()

/** Folga entre a ponta da coluna e o balão, e entre a ponta e o rótulo direto. */
const FOLGA_DO_BALAO = 8

const idDoTitulo = useId()
const modo = ref<'grafico' | 'tabela'>('grafico')
const ativo = ref<number | null>(null)
const anuncio = ref('')
const caixa = ref<HTMLElement | null>(null)
const area = ref<HTMLElement | null>(null)
const balao = ref<HTMLElement | null>(null)
const posicaoDoBalao = ref({ left: 0, top: 0 })

const granularidade = computed(() => (props.pontos[0]?.mes === null ? 'ano' : 'mes'))
const titulo = computed(() => tituloDoGrafico(props.medida, granularidade.value))
const subtitulo = computed(() => subtituloDoGrafico(props.medida, props.pontos, props.periodo))
const semDados = computed(() => somaDaMedida(props.medida, props.pontos) === 0)
const valores = computed(() => props.pontos.map((p) => valorDoPonto(props.medida, p)))
const escala = computed(() => escalaDoEixo(Math.max(0, ...valores.value)))
const indiceDoMaior = computed(() => {
  const maior = pontoDeMaiorValor(props.medida, props.pontos)
  return maior ? props.pontos.indexOf(maior) : -1
})
/** Com doze meses a coluna afina para sobrar ar entre elas (4.4). */
const larguraDaColuna = computed(() => (props.pontos.length >= 12 ? 'w-5' : 'w-6'))
/** Páginas têm mais altura que livros no celular (4.2); na web, os dois têm 220px. */
const altura = computed(() => (props.medida === 'paginas' ? 'h-[180px] md:h-[220px]' : 'h-[140px] md:h-[220px]'))

const proporcao = (valor: number) => `${(valor / escala.value.dominio) * 100}%`

watch(
  () => props.pontos,
  () => {
    ativo.value = null
    anuncio.value = ''
  },
)

/**
 * O balão fica acima da coluna, centralizado nela, sem sair da caixa do
 * gráfico: encosta na borda no primeiro e no último mês e no topo quando a
 * coluna é alta (5.1).
 */
async function posicionarBalao(): Promise<void> {
  await nextTick()
  const indice = ativo.value
  if (indice === null || !caixa.value || !area.value || !balao.value) return
  const larguraDoMes = area.value.clientWidth / props.pontos.length
  const centro = area.value.offsetLeft + larguraDoMes * (indice + 0.5)
  const pontaDaColuna =
    area.value.offsetTop + area.value.clientHeight * (1 - valores.value[indice]! / escala.value.dominio)
  const { offsetWidth: largura, offsetHeight: alturaDoBalao } = balao.value
  posicaoDoBalao.value = {
    left: Math.min(Math.max(0, centro - largura / 2), Math.max(0, caixa.value.clientWidth - largura)),
    top: Math.max(0, pontaDaColuna - FOLGA_DO_BALAO - alturaDoBalao),
  }
}

watch(ativo, () => void posicionarBalao())

function ativar(indice: number): void {
  ativo.value = indice
}

function fechar(): void {
  ativo.value = null
}

/** Setas movem entre os meses e mostram o balão; `Esc` fecha (5.4). */
function teclar(evento: KeyboardEvent): void {
  const total = props.pontos.length
  if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
    evento.preventDefault()
    const passo = evento.key === 'ArrowRight' ? 1 : -1
    const atual = ativo.value ?? (passo === 1 ? -1 : total)
    ativo.value = Math.min(total - 1, Math.max(0, atual + passo))
    anuncio.value = leituraDoPonto(props.medida, props.pontos[ativo.value]!, props.hoje)
  } else if (evento.key === 'Escape' && ativo.value !== null) {
    evento.preventDefault()
    fechar()
  }
}

function unidadeNaTabela(valor: number): string {
  if (props.medida === 'paginas') return valor === 1 ? 'página' : 'páginas'
  return valor === 1 ? 'livro' : 'livros'
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
      {{ titulo }}
    </h3>
    <p class="mt-space-1 text-caption text-grafite">
      {{ subtitulo }}
    </p>

    <p
      v-if="semDados"
      class="mt-space-4 text-body text-grafite"
    >
      {{ graficoSemDados(medida, periodo) }}
    </p>

    <template v-else>
      <div
        v-if="modo === 'grafico'"
        ref="caixa"
        class="relative mt-space-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-space-2 rounded-base pt-space-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        tabindex="0"
        role="group"
        :aria-label="resumoDoGrafico(medida, pontos, periodo)"
        @keydown="teclar"
        @blur="fechar"
        @mouseleave="fechar"
      >
        <!-- Eixo Y: só as marcas, sem linha de eixo. -->
        <div
          class="relative min-w-6"
          :class="altura"
          aria-hidden="true"
        >
          <span
            v-for="marca in escala.marcas"
            :key="marca"
            class="absolute right-0 translate-y-1/2 text-caption tabular-nums text-grafite"
            :style="{ bottom: proporcao(marca) }"
          >{{ formatarInteiro(marca) }}</span>
        </div>

        <div
          ref="area"
          class="relative cursor-pointer"
          :class="altura"
        >
          <div
            v-for="marca in escala.marcas"
            :key="marca"
            class="absolute inset-x-0 border-t border-linha"
            :style="{ bottom: proporcao(marca) }"
            aria-hidden="true"
          />
          <div
            class="absolute inset-0 flex"
            aria-hidden="true"
          >
            <div
              v-for="(ponto, indice) in pontos"
              :key="`${ponto.ano}-${ponto.mes}`"
              class="relative flex h-full min-w-0 flex-1 justify-center"
              data-mes
              @mouseenter="ativar(indice)"
              @click="ativar(indice)"
            >
              <div
                v-if="ativo === indice"
                class="absolute inset-y-0 w-8 rounded-sm bg-musgo-fundo"
                data-faixa
              />
              <div
                v-if="valores[indice]! > 0"
                class="absolute bottom-0 rounded-t-[4px] bg-musgo"
                :class="larguraDaColuna"
                :style="{ height: proporcao(valores[indice]!) }"
                data-coluna
              />
              <span
                v-if="indice === indiceDoMaior && ativo !== indice"
                class="absolute whitespace-nowrap text-caption font-semibold text-tinta"
                :style="{ bottom: `calc(${proporcao(valores[indice]!)} + 4px)` }"
                data-rotulo-direto
              >{{ rotuloDaMedida(medida, valores[indice]!) }}</span>
            </div>
          </div>
        </div>

        <!-- Eixo X: mês abreviado (ou ano no acumulado) sob cada coluna. -->
        <div
          class="col-start-2 flex pt-space-2"
          aria-hidden="true"
        >
          <span
            v-for="ponto in pontos"
            :key="`${ponto.ano}-${ponto.mes}`"
            class="min-w-0 flex-1 text-center text-caption text-grafite"
          >{{ marcaDoEixoX(ponto) }}</span>
        </div>

        <div
          v-if="ativo !== null"
          ref="balao"
          class="pointer-events-none absolute z-10 whitespace-nowrap rounded-base border border-transparent bg-papel px-space-3 py-space-2 shadow-2 dark:border-linha"
          :style="{ left: `${posicaoDoBalao.left}px`, top: `${posicaoDoBalao.top}px` }"
          aria-hidden="true"
          data-balao
        >
          <span class="block text-caption text-grafite">{{ tituloDoBalao(pontos[ativo]!, hoje) }}</span>
          <span class="block text-body-strong text-tinta">{{ valorDoBalao(medida, pontos[ativo]!) }}</span>
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
          {{ titulo }}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="pb-space-2 text-left text-label text-grafite"
            >
              {{ granularidade === 'mes' ? 'Mês' : 'Ano' }}
            </th>
            <th
              scope="col"
              class="pb-space-2 text-right text-label text-grafite"
            >
              {{ medida === 'paginas' ? 'Páginas' : 'Livros' }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ponto in pontos"
            :key="`${ponto.ano}-${ponto.mes}`"
            class="h-11 border-t border-linha"
          >
            <th
              scope="row"
              class="text-left text-body font-normal text-tinta"
            >
              {{ nomeNaTabela(ponto) }}
              <span
                v-if="pontoEmAndamento(ponto, hoje)"
                class="ml-space-2 text-caption text-grafite"
              >{{ TEXTOS_DAS_ESTATISTICAS.ateHoje }}</span>
            </th>
            <td class="whitespace-nowrap text-right font-mono text-num-inline tabular-nums text-tinta">
              {{ formatarInteiro(valorDoPonto(medida, ponto)) }} {{ unidadeNaTabela(valorDoPonto(medida, ponto)) }}
            </td>
          </tr>
        </tbody>
      </table>

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
