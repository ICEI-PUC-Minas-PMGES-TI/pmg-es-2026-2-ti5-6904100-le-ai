<script setup lang="ts">
import { rotuloDoPeriodo, rotuloLivros, TEXTOS_DAS_ESTATISTICAS } from '../../estatisticas/textos'
import type { ItemDoSeletor } from '../../estatisticas/useEstatisticas'
import type { PeriodoEstatisticas } from '../../services/leitura'

/**
 * Seletor de período (F-STA). Faixa de pills da Estante (4.1) até 1280px;
 * dali para cima, a lista vertical `Período` na coluna da esquerda, com o total
 * de livros de cada item e o acumulado separado por um divisor (5.1). Entre
 * 768 e 1280px a coluna de 240px espremeria os cards de três e os gráficos.
 */
defineProps<{
  itens: ItemDoSeletor[]
  ativo: PeriodoEstatisticas
}>()

const emit = defineEmits<{ escolher: [periodo: PeriodoEstatisticas] }>()
</script>

<template>
  <nav aria-labelledby="rotulo-do-periodo">
    <h2
      id="rotulo-do-periodo"
      class="sr-only xl:not-sr-only xl:mb-space-2 xl:text-label xl:text-grafite"
    >
      {{ TEXTOS_DAS_ESTATISTICAS.periodo }}
    </h2>
    <ul
      class="-mx-space-5 flex gap-space-2 overflow-x-auto px-space-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 xl:flex-col xl:flex-nowrap xl:gap-space-1"
      role="list"
    >
      <li
        v-for="item in itens"
        :key="item.periodo"
        class="shrink-0"
        :class="item.periodo === 'acumulado' ? 'xl:mt-space-2 xl:border-t xl:border-linha xl:pt-space-3' : ''"
      >
        <button
          type="button"
          class="group flex min-h-12 w-full items-center focus-visible:outline-none xl:min-h-0"
          :aria-pressed="item.periodo === ativo"
          :aria-label="`${rotuloDoPeriodo(item.periodo)}, ${rotuloLivros(item.livrosConcluidos)}`"
          @click="emit('escolher', item.periodo)"
        >
          <span
            class="inline-flex items-center rounded-full px-space-4 py-space-2 text-caption transition-colors duration-dur-fast group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-musgo xl:flex xl:h-11 xl:w-full xl:justify-between xl:rounded-base xl:py-0"
            :class="
              item.periodo === ativo
                ? 'bg-musgo-fundo font-semibold text-musgo'
                : 'border border-linha text-grafite md:group-hover:bg-linha xl:border-0'
            "
          >
            <span
              :class="item.periodo === 'acumulado' ? 'xl:text-body-strong' : 'font-mono tabular-nums xl:text-num-inline'"
            >{{ rotuloDoPeriodo(item.periodo) }}</span>
            <span class="hidden xl:inline xl:text-caption">{{ rotuloLivros(item.livrosConcluidos) }}</span>
          </span>
        </button>
      </li>
    </ul>
  </nav>
</template>
