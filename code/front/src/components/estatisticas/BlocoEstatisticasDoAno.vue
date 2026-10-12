<script setup lang="ts">
import { PhChartBar } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { formatarInteiro, partesDoTempo, rotuloDoTempo } from '../../estatisticas/formatos'
import { TEXTOS_DAS_ESTATISTICAS, TEXTOS_DO_BLOCO } from '../../estatisticas/textos'
import type { EstadoDoBloco } from '../../estatisticas/useEstatisticasDoAno'
import type { TotaisEstatistica } from '../../services/leitura'
import BannerAviso from '../ui/BannerAviso.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'

/**
 * Bloco `Estatísticas do ano` dos perfis (F-STA, RF-STA-01): os três totais do
 * ano corrente, os mesmos do painel. No celular, a faixa de cards do Meu perfil
 * (artboard `Sequência, estatísticas e desafios`); na web, as métricas
 * empilhadas no desenho dos contadores da coluna de identidade
 * (`meu-perfil.md` §4.8, `perfil-de-outro-leitor` web). Só o próprio perfil tem
 * `Ver estatísticas`; no de outro leitor os totais não são acionáveis.
 */
const props = defineProps<{
  estado: Exclude<EstadoDoBloco, 'oculto'>
  totais: TotaisEstatistica | null
  ano: number
  proprio: boolean
  textoVazio: string
  textoErro: string
}>()

const emit = defineEmits<{ tentarDeNovo: [] }>()

const DESTINO = '/perfil/estatisticas'

const linhas = computed(() => {
  const totais = props.totais
  if (!totais) return []
  return [
    {
      rotulo: TEXTOS_DAS_ESTATISTICAS.livrosConcluidos,
      partes: [{ numero: formatarInteiro(totais.livrosConcluidos), unidade: totais.livrosConcluidos === 1 ? 'livro' : 'livros' }],
      numero: formatarInteiro(totais.livrosConcluidos),
      legenda: TEXTOS_DO_BLOCO.livrosConcluidos(totais.livrosConcluidos),
    },
    {
      rotulo: TEXTOS_DAS_ESTATISTICAS.paginasLidas,
      partes: [{ numero: formatarInteiro(totais.paginasLidas), unidade: totais.paginasLidas === 1 ? 'página' : 'páginas' }],
      numero: formatarInteiro(totais.paginasLidas),
      legenda: TEXTOS_DO_BLOCO.paginasLidas(totais.paginasLidas),
    },
    {
      rotulo: TEXTOS_DAS_ESTATISTICAS.tempoDeLeitura,
      partes: partesDoTempo(totais.minutosLidos),
      numero: rotuloDoTempo(totais.minutosLidos),
      legenda: TEXTOS_DO_BLOCO.deLeitura,
    },
  ]
})

/** Sem registro ou com erro, o cabeçalho perde a linha do ano e o `Ver estatísticas`. */
const comConteudo = computed(() => props.estado === 'pronto' || props.estado === 'carregando')
</script>

<template>
  <section
    class="mt-space-8 w-full self-stretch text-left md:mt-space-6 md:border-t md:border-linha md:pt-space-6"
    aria-labelledby="titulo-estatisticas-do-ano"
    :aria-busy="estado === 'carregando' || undefined"
  >
    <div class="flex items-baseline justify-between gap-space-3">
      <h2
        id="titulo-estatisticas-do-ano"
        class="text-title-lg text-tinta md:text-title-sm"
      >
        {{ TEXTOS_DO_BLOCO.titulo }}
      </h2>
      <RouterLink
        v-if="proprio && estado === 'pronto'"
        :to="DESTINO"
        class="rounded-sm text-caption font-semibold text-musgo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:hidden"
      >
        {{ TEXTOS_DO_BLOCO.verEstatisticas }}
      </RouterLink>
    </div>
    <p
      v-if="comConteudo"
      class="mt-space-1 text-caption text-grafite"
    >
      {{ TEXTOS_DO_BLOCO.ateHoje(ano) }}
    </p>

    <div
      v-if="estado === 'carregando'"
      class="entrada mt-space-3"
      :aria-label="TEXTOS_DO_BLOCO.carregando"
    >
      <div class="-mr-space-5 flex gap-space-3 md:mr-0 md:flex-col md:gap-0">
        <div
          v-for="i in 3"
          :key="i"
          class="flex h-[88px] w-[136px] shrink-0 flex-col gap-space-2 rounded-base bg-papel-elevado p-space-4 md:h-auto md:w-full md:flex-row md:justify-between md:rounded-none md:bg-transparent md:px-0 md:py-space-3"
          :class="i > 1 ? 'md:border-t md:border-linha' : ''"
        >
          <div class="h-[13px] w-3/5 rounded-sm bg-capa-placeholder md:w-1/5" />
          <div class="h-6 w-2/5 rounded-sm bg-capa-placeholder md:h-[15px]" />
        </div>
      </div>
    </div>

    <template v-else-if="estado === 'pronto'">
      <!-- Celular: faixa de cards que rola sem indicador. -->
      <ul
        class="-mr-space-5 mt-space-3 flex gap-space-3 overflow-x-auto pr-space-5 [scrollbar-width:none] md:hidden"
        role="list"
      >
        <li
          v-for="linha in linhas"
          :key="linha.rotulo"
          class="flex min-w-[136px] shrink-0 flex-col gap-space-1 rounded-base bg-papel-elevado p-space-4"
        >
          <span class="whitespace-nowrap text-caption text-grafite">{{ linha.rotulo }}</span>
          <span class="flex items-baseline gap-x-space-1 whitespace-nowrap">
            <template
              v-for="(parte, i) in linha.partes"
              :key="i"
            >
              <span class="font-mono text-num-display tabular-nums text-tinta">{{ parte.numero }}</span>
              <span class="text-body-strong text-grafite">{{ parte.unidade }}</span>
            </template>
          </span>
        </li>
      </ul>
      <!-- Web: no desenho dos contadores, número à esquerda e rótulo à direita. -->
      <dl class="mt-space-3 hidden md:block">
        <div
          v-for="(linha, i) in linhas"
          :key="linha.rotulo"
          class="flex items-baseline justify-between gap-space-3 py-space-3"
          :class="i > 0 ? 'border-t border-linha' : ''"
        >
          <dt class="order-2 text-body text-grafite">
            {{ linha.legenda }}
          </dt>
          <dd class="order-1 font-mono text-num-inline tabular-nums text-tinta">
            {{ linha.numero }}
          </dd>
        </div>
      </dl>
      <RouterLink
        v-if="proprio"
        :to="DESTINO"
        class="mt-space-3 hidden min-h-12 items-center gap-space-2 rounded-sm text-body-strong text-musgo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:inline-flex"
      >
        <PhChartBar
          :size="20"
          aria-hidden="true"
        />
        {{ TEXTOS_DO_BLOCO.verEstatisticas }}
      </RouterLink>
    </template>

    <p
      v-else-if="estado === 'vazio'"
      class="mt-space-3 text-body text-grafite"
    >
      {{ textoVazio }}
    </p>

    <BannerAviso
      v-else
      class="mt-space-3"
      variante="erro"
    >
      {{ textoErro }}
      <BotaoTextual
        class="mt-space-2"
        @click="emit('tentarDeNovo')"
      >
        {{ TEXTOS_DAS_ESTATISTICAS.tentarDeNovo }}
      </BotaoTextual>
    </BannerAviso>
  </section>
</template>
