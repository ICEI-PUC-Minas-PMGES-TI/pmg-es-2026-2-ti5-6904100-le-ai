<script setup lang="ts">
import { PhArrowsClockwise, PhInfo } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { TEXTOS_DO_HISTORICO, dataPorExtenso, duracaoEmDias, textoDuracao } from '../../historico/textos'
import { formatarData } from '../../livros/formatos'
import { percentual } from '../../progresso/regras'
import { TEXTOS_DAS_ATUALIZACOES, rotuloPaginaDeTotal, rotuloPaginas, rotuloRegistros, rotuloTempo } from '../../progresso/textos'
import type { LivroDaEstante, ResumoProgresso } from '../../services/leitura'
import CapaLivro from '../livros/CapaLivro.vue'

export interface Conclusao {
  releitura: boolean
  dataInicio: string
  dataFim: string
}

const PERCENTUAL_CHEIO = 100

const props = withDefaults(
  defineProps<{
    livro: LivroDaEstante | null
    resumo: ResumoProgresso
    dataInicio: string | null
    registros: number
    conclusao?: Conclusao | null
  }>(),
  { conclusao: null },
)

const valor = computed(() =>
  props.conclusao ? PERCENTUAL_CHEIO : Math.round(percentual(props.resumo.paginaAtual, props.resumo.totalPaginas)),
)
const iniciada = computed(() => props.resumo.paginaAtual === 0)
const linhaDaPagina = computed(() =>
  iniciada.value && props.dataInicio
    ? TEXTOS_DAS_ATUALIZACOES.iniciadaEm(formatarData(`${props.dataInicio}T00:00:00`))
    : rotuloPaginaDeTotal(props.resumo.paginaAtual, props.resumo.totalPaginas),
)
const rotuloDaBarra = computed(() => {
  if (props.conclusao) return TEXTOS_DAS_ATUALIZACOES.concluida
  return iniciada.value ? TEXTOS_DAS_ATUALIZACOES.iniciada : `${valor.value}%`
})
const linhasDaConclusao = computed(() => {
  const conclusao = props.conclusao
  if (!conclusao) return null
  const duracao = textoDuracao(duracaoEmDias(conclusao.dataInicio, conclusao.dataFim))
  return [
    TEXTOS_DAS_ATUALIZACOES.concluidaEm(dataPorExtenso(conclusao.dataFim)),
    TEXTOS_DAS_ATUALIZACOES.inicioEm(dataPorExtenso(conclusao.dataInicio), duracao),
  ]
})
const mostraValores = computed(() => !props.conclusao || props.registros > 0)
const valores = computed(() => [
  { rotulo: TEXTOS_DAS_ATUALIZACOES.rotuloLidas, texto: rotuloPaginas(props.resumo.paginaAtual) },
  { rotulo: TEXTOS_DAS_ATUALIZACOES.rotuloTempo, texto: rotuloTempo(props.resumo.minutosTotais) },
  { rotulo: TEXTOS_DAS_ATUALIZACOES.rotuloRegistros, texto: rotuloRegistros(props.registros) },
])
</script>

<template>
  <section
    class="border-b border-linha pb-space-6 md:border-b-0 md:pb-0"
    aria-live="polite"
    data-resumo
  >
    <div class="flex items-center gap-space-4 md:flex-col md:items-start">
      <CapaLivro
        :url="livro?.capaUrl"
        :rotulo="livro ? `Capa de ${livro.titulo}` : ''"
        class="h-[90px] w-[60px] md:h-[300px] md:w-[200px]"
      />
      <div
        v-if="livro"
        class="min-w-0"
      >
        <p class="text-title-sm text-tinta">
          {{ livro.titulo }}
        </p>
        <p
          v-if="livro.autor"
          class="text-caption text-grafite"
        >
          {{ livro.autor }}
        </p>
        <p
          v-if="conclusao"
          class="mt-space-1 flex items-center gap-space-1 text-caption font-semibold text-grafite"
          data-tipo-ocorrencia
        >
          <PhArrowsClockwise
            v-if="conclusao.releitura"
            :size="16"
            weight="regular"
            class="text-broto"
            aria-hidden="true"
          />
          {{ conclusao.releitura ? TEXTOS_DO_HISTORICO.releitura : TEXTOS_DO_HISTORICO.leitura }}
        </p>
      </div>
    </div>

    <div class="mt-space-4 flex items-center gap-space-2">
      <div
        class="h-1.5 flex-1 overflow-hidden rounded-full bg-musgo-fundo"
        role="progressbar"
        :aria-valuenow="valor"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="livro ? `Progresso de ${livro.titulo}` : TEXTOS_DAS_ATUALIZACOES.titulo"
      >
        <div
          class="h-full rounded-full bg-musgo"
          :style="{ width: `${valor}%` }"
        />
      </div>
      <span
        class="font-mono text-caption tabular-nums text-grafite"
        data-percentual
      >
        {{ rotuloDaBarra }}
      </span>
    </div>
    <template v-if="linhasDaConclusao">
      <p
        v-for="linha in linhasDaConclusao"
        :key="linha"
        class="mt-space-1 text-caption text-grafite"
        data-linha-conclusao
      >
        {{ linha }}
      </p>
    </template>
    <p
      v-else
      class="mt-space-1 text-caption text-grafite"
      data-linha-pagina
    >
      {{ linhaDaPagina }}
    </p>

    <dl
      v-if="mostraValores"
      class="mt-space-4 grid grid-cols-3 divide-x divide-linha md:grid-cols-1 md:divide-x-0 md:divide-y"
    >
      <div
        v-for="item in valores"
        :key="item.rotulo"
        class="flex flex-col-reverse items-center text-center md:flex-row md:justify-between md:py-space-3"
      >
        <dt class="text-caption text-grafite">
          {{ item.rotulo }}
        </dt>
        <dd class="text-num-inline text-tinta">
          {{ item.texto }}
        </dd>
      </div>
    </dl>

    <p
      v-if="conclusao"
      class="mt-space-4 flex items-center gap-space-2 text-caption text-grafite"
      data-somente-consulta
    >
      <PhInfo
        :size="16"
        weight="regular"
        aria-hidden="true"
      />
      {{ TEXTOS_DAS_ATUALIZACOES.somenteConsulta }}
    </p>
  </section>
</template>
