<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'

import type { ChaveDoFiltro, ChipDeFiltro } from '../../livros/filtrosDaBusca'
import BotaoTextual from '../ui/BotaoTextual.vue'

/**
 * Filtros aplicados (descobrir.md do Período 2): chips no estilo de chip ativo, que quebram em
 * linhas em vez de rolar, cada um com `X`; no fim, `Limpar filtros`. Abaixo da faixa de assuntos no
 * mobile e no topo da coluna de resultados na web. O assunto não vira chip: já aparece ativo na faixa.
 */
defineProps<{ chips: ChipDeFiltro[] }>()
const emit = defineEmits<{ remover: [chave: ChaveDoFiltro]; limpar: [] }>()
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-space-2"
    aria-label="Filtros aplicados"
    role="group"
  >
    <button
      v-for="chip in chips"
      :key="chip.chave"
      type="button"
      class="flex min-h-12 items-center md:min-h-10"
      :aria-label="`Remover filtro ${chip.rotulo}`"
      @click="emit('remover', chip.chave)"
    >
      <span class="inline-flex items-center gap-space-2 rounded-full bg-musgo-fundo px-space-4 py-space-2 text-caption font-semibold text-musgo">
        {{ chip.rotulo }}
        <PhX
          :size="16"
          weight="regular"
          aria-hidden="true"
        />
      </span>
    </button>
    <BotaoTextual
      class="min-h-12 md:min-h-10"
      @click="emit('limpar')"
    >
      Limpar filtros
    </BotaoTextual>
  </div>
</template>
