<script setup lang="ts">
import { TEXTOS_DAS_ESTATISTICAS } from '../../estatisticas/textos'

/**
 * Skeleton estático do painel (4.8 e 5.5), com a forma final para o conteúdo
 * não saltar: no celular, os containers de linhas; na web, seis cards e os dois
 * cards de gráfico. Um único fade de entrada (`.entrada`), sem shimmer. É
 * também o estado do cold start do serviço e de cada troca de período.
 */
</script>

<template>
  <div
    class="entrada"
    aria-busy="true"
    :aria-label="TEXTOS_DAS_ESTATISTICAS.carregando"
  >
    <template
      v-for="secao in [TEXTOS_DAS_ESTATISTICAS.totais, TEXTOS_DAS_ESTATISTICAS.medias]"
      :key="secao"
    >
      <h2 class="mt-space-6 text-title-lg text-tinta md:sr-only">
        {{ secao }}
      </h2>
      <div
        class="mt-space-3 grid divide-y divide-linha rounded-md bg-papel-elevado md:grid-cols-3 md:gap-space-4 md:divide-y-0 md:bg-transparent"
        :class="secao === TEXTOS_DAS_ESTATISTICAS.totais ? 'md:mt-space-4' : 'md:mt-space-6'"
      >
        <div
          v-for="i in 3"
          :key="i"
          class="flex gap-space-2 px-space-5 py-space-4 md:flex-col md:rounded-md md:bg-papel-elevado md:p-space-5"
          :class="secao === TEXTOS_DAS_ESTATISTICAS.totais ? 'flex-col' : 'items-start justify-between'"
        >
          <div
            class="rounded-sm bg-capa-placeholder"
            :class="secao === TEXTOS_DAS_ESTATISTICAS.totais ? 'h-[13px] w-[30%]' : 'h-[15px] w-[40%] md:h-[13px] md:w-[50%]'"
          />
          <div
            class="rounded-sm bg-capa-placeholder"
            :class="secao === TEXTOS_DAS_ESTATISTICAS.totais ? 'h-9 w-[45%]' : 'h-5 w-[18%] md:h-7 md:w-[40%]'"
          />
        </div>
      </div>
    </template>
    <div class="mt-space-6 grid gap-space-4 xl:grid-cols-2 xl:items-start xl:gap-space-6">
      <div
        v-for="i in 2"
        :key="i"
        class="rounded-md bg-papel-elevado p-space-5"
      >
        <div class="h-[17px] w-1/2 rounded-sm bg-capa-placeholder" />
        <div class="mt-space-4 h-[180px] rounded-sm bg-capa-placeholder md:h-[220px]" />
      </div>
    </div>
  </div>
</template>
