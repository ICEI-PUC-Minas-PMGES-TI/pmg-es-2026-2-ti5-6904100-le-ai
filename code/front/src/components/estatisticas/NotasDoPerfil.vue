<script setup lang="ts">
import { useId } from 'vue'

import { rotuloNotas, TEXTOS_DAS_NOTAS, TEXTOS_DAS_NOTAS_DO_PERFIL as P } from '../../estatisticas/textos'
import type { DistribuicaoNotas } from '../../services/leitura'
import ColunasDeNotas from './ColunasDeNotas.vue'

defineProps<{
  distribuicao: DistribuicaoNotas | null
  nome: string
  ano: number
}>()

const idDoTitulo = useId()
</script>

<template>
  <section
    class="mt-space-4 rounded-base bg-papel-elevado p-space-4 md:mt-space-5 md:rounded-none md:bg-transparent md:p-0"
    :aria-labelledby="idDoTitulo"
  >
    <div class="flex items-baseline justify-between gap-space-3">
      <h3
        :id="idDoTitulo"
        class="text-body-strong text-tinta"
      >
        {{ P.titulo(ano) }}
      </h3>
      <span
        v-if="distribuicao"
        class="text-caption text-grafite"
      >{{ rotuloNotas(distribuicao.total) }}</span>
    </div>

    <p
      v-if="!distribuicao"
      class="mt-space-3 text-body text-grafite"
    >
      {{ P.semNotas(nome, ano) }}
    </p>

    <template v-else>
      <div
        class="mt-space-3 pt-space-5"
        role="group"
        :aria-label="P.resumo(nome, ano, distribuicao)"
      >
        <ColunasDeNotas
          :faixas="distribuicao.faixas"
          compacto
        />
      </div>
      <p class="mt-space-2 text-caption text-grafite">
        {{ TEXTOS_DAS_NOTAS.legenda }}
      </p>
    </template>
  </section>
</template>
