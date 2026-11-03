<script setup lang="ts">
import { PhChartBar } from '@phosphor-icons/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import EsqueletoEstatisticas from '../../components/estatisticas/EsqueletoEstatisticas.vue'
import GraficoDeColunas from '../../components/estatisticas/GraficoDeColunas.vue'
import MetricaMedia from '../../components/estatisticas/MetricaMedia.vue'
import MetricaTotal from '../../components/estatisticas/MetricaTotal.vue'
import SeletorDePeriodo from '../../components/estatisticas/SeletorDePeriodo.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import {
  formatarDecimal,
  formatarInteiro,
  formatarNotaMedia,
  hojeEmSaoPaulo,
  partesDoTempo,
  rotuloDoTempo,
} from '../../estatisticas/formatos'
import {
  ajudaDaNota,
  anuncioDoPeriodo,
  linhaDoPeriodo,
  MEDIA_AUSENTE,
  rotuloLivros,
  rotuloPaginas,
  TEXTOS_DAS_ESTATISTICAS as T,
} from '../../estatisticas/textos'
import { lerPeriodoDaRota, useEstatisticas } from '../../estatisticas/useEstatisticas'
import type { PeriodoEstatisticas } from '../../services/leitura'

/**
 * Painel de estatísticas (F-STA, RF-STA-01/02/03), a partir do protótipo
 * `F-STA/prototipos/estatisticas.html`: na web larga (5.1 a 5.5, a partir de
 * 1280px), a lista de períodos na coluna da esquerda e, à direita, totais e
 * médias em cards de três e os dois gráficos lado a lado; entre 768 e 1280px,
 * as pills no topo, os cards de três e os gráficos empilhados; abaixo de 768px
 * (4.1 a 4.9), as pills e os containers de linhas empilhadas. O período fica na
 * rota (`?periodo=`).
 */
const route = useRoute()
const router = useRouter()
const hoje = hojeEmSaoPaulo()

const periodo = computed(() => lerPeriodoDaRota(route.query.periodo, hoje.ano))
const { carregando, falhou, dados, graficos, primeiroRegistro, vazio, seletor, recarregar } = useEstatisticas(
  () => periodo.value,
  hoje.ano,
)

const linha = computed(() => linhaDoPeriodo(periodo.value, hoje, primeiroRegistro.value))

// A troca de período muda todos os números de uma vez: o leitor de tela ouve o novo intervalo (§9).
const anuncio = ref('')
let trocouPeriodo = false
watch(dados, (atual) => {
  if (atual && trocouPeriodo) anuncio.value = anuncioDoPeriodo(periodo.value, linha.value)
  trocouPeriodo = false
})

function escolher(novo: PeriodoEstatisticas): void {
  if (novo === periodo.value) return
  trocouPeriodo = true
  void router.replace({ query: { ...route.query, periodo: novo === hoje.ano ? undefined : String(novo) } })
}

const totais = computed(() => {
  const t = dados.value?.totais
  if (!t) return []
  return [
    {
      rotulo: T.livrosConcluidos,
      partes: [{ numero: formatarInteiro(t.livrosConcluidos), unidade: t.livrosConcluidos === 1 ? 'livro' : 'livros' }],
      leitura: `${T.livrosConcluidos}: ${rotuloLivros(t.livrosConcluidos)}`,
    },
    {
      rotulo: T.paginasLidas,
      partes: [{ numero: formatarInteiro(t.paginasLidas), unidade: t.paginasLidas === 1 ? 'página' : 'páginas' }],
      leitura: `${T.paginasLidas}: ${rotuloPaginas(t.paginasLidas)}`,
    },
    {
      rotulo: T.tempoDeLeitura,
      partes: partesDoTempo(t.minutosLidos),
      leitura: `${T.tempoDeLeitura}: ${rotuloDoTempo(t.minutosLidos)}`,
    },
  ]
})

const medias = computed(() => {
  const m = dados.value?.medias
  if (!m) return []
  const p = periodo.value
  return [
    {
      rotulo: T.paginasPorDia,
      ajuda: T.ajudaPaginasPorDia,
      valor: m.paginasPorDia.valor === null ? null : formatarDecimal(m.paginasPorDia.valor),
      unidade: T.unidadePaginasPorDia,
      ausente: MEDIA_AUSENTE.paginasPorDia(p),
    },
    {
      rotulo: T.diasPorLivro,
      ajuda: T.ajudaDiasPorLivro,
      valor: m.diasPorLivro.valor === null ? null : formatarDecimal(m.diasPorLivro.valor),
      unidade: T.unidadeDiasPorLivro,
      ausente: MEDIA_AUSENTE.diasPorLivro(p),
    },
    {
      rotulo: T.notaMedia,
      ajuda: ajudaDaNota(p, m.notaMedia.quantidade),
      valor: m.notaMedia.valor === null ? null : formatarNotaMedia(m.notaMedia.valor),
      unidade: T.unidadeNotaMedia,
      ausente: MEDIA_AUSENTE.notaMedia(p),
    },
  ]
})

/** Mobile: container único de linhas com divisor; web: grid de três cards (5.1). */
const GRADE_DE_METRICAS =
  'mt-space-3 grid divide-y divide-linha rounded-md bg-papel-elevado md:grid-cols-3 md:gap-space-4 md:divide-y-0 md:bg-transparent'
const METRICA = 'px-space-5 py-space-4 md:rounded-md md:bg-papel-elevado md:p-space-5'
</script>

<template>
  <div class="max-w-[1120px] pb-space-10">
    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ anuncio }}
    </p>

    <!-- Leitor sem registro (4.7): sem coluna de períodos, bloco centralizado. -->
    <div
      v-if="vazio"
      class="flex min-h-[60vh] flex-col items-center justify-center"
    >
      <EstadoVazio
        :icone="PhChartBar"
        solto
        :titulo="T.vazioTitulo"
        class="max-w-[320px]"
      >
        <p class="mx-auto mt-space-6 max-w-[280px] text-body text-grafite">
          {{ T.vazioTexto }}
        </p>
        <RouterLink
          to="/estante"
          class="mt-space-6 flex h-12 items-center justify-center rounded-full bg-musgo px-space-6 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        >
          {{ T.vazioAcao }}
        </RouterLink>
      </EstadoVazio>
    </div>

    <div
      v-else
      class="xl:grid xl:grid-cols-[240px_minmax(0,1fr)] xl:items-start xl:gap-space-8"
    >
      <SeletorDePeriodo
        class="pt-space-4 xl:sticky xl:top-0 xl:pt-0"
        :itens="seletor"
        :ativo="periodo"
        @escolher="escolher"
      />

      <div class="min-w-0">
        <BannerAviso
          v-if="falhou"
          class="mt-space-4 md:max-w-[640px] xl:mt-0"
          variante="erro"
        >
          {{ T.erro }}
          <BotaoTextual
            class="mt-space-2"
            @click="recarregar()"
          >
            {{ T.tentarDeNovo }}
          </BotaoTextual>
        </BannerAviso>

        <EsqueletoEstatisticas v-else-if="carregando || !dados || !graficos" />

        <template v-else>
          <p class="mt-space-1 text-caption text-grafite xl:mt-0">
            {{ linha }}
          </p>

          <section aria-labelledby="titulo-totais">
            <h2
              id="titulo-totais"
              class="mt-space-6 text-title-lg text-tinta"
            >
              {{ T.totais }}
            </h2>
            <div :class="GRADE_DE_METRICAS">
              <MetricaTotal
                v-for="metrica in totais"
                :key="metrica.rotulo"
                :class="METRICA"
                v-bind="metrica"
              />
            </div>
            <p class="mt-space-3 text-caption text-grafite">
              {{ T.ajudaDosTotais }}
            </p>
          </section>

          <section aria-labelledby="titulo-medias">
            <h2
              id="titulo-medias"
              class="mt-space-6 text-title-lg text-tinta"
            >
              {{ T.medias }}
            </h2>
            <div :class="GRADE_DE_METRICAS">
              <MetricaMedia
                v-for="media in medias"
                :key="media.rotulo"
                :class="METRICA"
                v-bind="media"
              />
            </div>
          </section>

          <!-- Lado a lado a partir de 1280px; o card mais baixo não estica (5.4). -->
          <div class="mt-space-6 grid gap-space-4 xl:grid-cols-2 xl:items-start xl:gap-space-6">
            <GraficoDeColunas
              medida="paginas"
              :pontos="graficos.pontos"
              :periodo="periodo"
              :hoje="hoje"
            />
            <GraficoDeColunas
              medida="livros"
              :pontos="graficos.pontos"
              :periodo="periodo"
              :hoje="hoje"
            />
          </div>

          <p class="mt-space-6 text-center text-caption text-grafite md:text-left">
            {{ T.rodape }}
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
