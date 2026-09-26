<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'

import type { AssuntoResumo } from '../../services/acervo'

/**
 * Filtro por assunto de Descobrir (descobrir.md "Faixa de assuntos" e §5). Seleção única: escolher
 * o assunto ativo o remove.
 *
 * - **Abaixo de 768px**, faixa horizontal rolável de chips pill, sem seta, fade nem indicador: o
 *   corte do último chip já diz que há mais. O ativo é `musgo` cheio, com o `X` de remover.
 * - **A partir de 768px**, painel vertical de 240px, com o título `Assuntos` e itens de 36px; o
 *   ativo em `musgo-fundo`.
 *
 * O ativo não depende só de cor (§9): ganha peso 600, `aria-pressed` e, na faixa, o `X`.
 */
defineProps<{ assuntos: AssuntoResumo[]; ativo: string | null }>()
const emit = defineEmits<{ alternar: [id: string] }>()
</script>

<template>
  <nav aria-labelledby="titulo-assuntos">
    <h2
      id="titulo-assuntos"
      class="sr-only text-label text-grafite md:not-sr-only md:mb-space-2 md:block md:px-space-3"
    >
      Assuntos
    </h2>
    <ul class="-mx-space-5 flex gap-space-2 overflow-x-auto px-space-5 [scrollbar-width:none] md:mx-0 md:flex-col md:gap-space-1 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
      <li
        v-for="item in assuntos"
        :key="item.id"
        class="shrink-0"
      >
        <button
          type="button"
          class="flex min-h-12 items-center md:min-h-0 md:w-full"
          :aria-pressed="item.id === ativo"
          @click="emit('alternar', item.id)"
        >
          <span
            class="inline-flex items-center gap-space-1 whitespace-nowrap rounded-full px-space-4 py-space-2 text-caption transition-colors duration-dur-fast md:h-9 md:w-full md:rounded-base md:px-space-3 md:py-0 md:text-body"
            :class="item.id === ativo
              ? 'bg-musgo font-semibold text-papel md:bg-musgo-fundo md:text-musgo'
              : 'border border-linha text-tinta hover:bg-linha md:border-0'"
          >
            {{ item.nome }}
            <PhX
              v-if="item.id === ativo"
              :size="16"
              weight="regular"
              class="md:hidden"
              aria-hidden="true"
            />
          </span>
        </button>
      </li>
    </ul>
  </nav>
</template>
