<script setup lang="ts">
import type { Component } from 'vue'

import BotaoTextual from './BotaoTextual.vue'
import SobreposicaoModal from './SobreposicaoModal.vue'

/**
 * Menu de ações em bottom sheet, só no mobile (livro-pessoal.md §4.4): itens de 56px com ícone
 * e rótulo, divisor entre eles, e `Cancelar` no fim. Item destrutivo em `rubi`.
 */
export interface AcaoDaFolha {
  id: string
  rotulo: string
  icone: Component
  destrutiva?: boolean
}

defineProps<{
  aberta: boolean
  rotulo: string
  acoes: AcaoDaFolha[]
}>()

const emit = defineEmits<{ escolher: [id: string]; fechar: [] }>()
</script>

<template>
  <SobreposicaoModal
    :aberta="aberta"
    :rotulo="rotulo"
    somente-folha
    @fechar="emit('fechar')"
  >
    <ul class="divide-y divide-linha">
      <li
        v-for="acao in acoes"
        :key="acao.id"
      >
        <button
          type="button"
          class="flex h-14 w-full items-center gap-space-4 text-left text-body focus-visible:outline-none focus-visible:underline"
          :class="acao.destrutiva ? 'text-rubi' : 'text-tinta'"
          @click="emit('escolher', acao.id)"
        >
          <component
            :is="acao.icone"
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
          {{ acao.rotulo }}
        </button>
      </li>
    </ul>
    <BotaoTextual
      class="mt-space-4 h-12 w-full justify-center"
      tom="grafite"
      @click="emit('fechar')"
    >
      Cancelar
    </BotaoTextual>
  </SobreposicaoModal>
</template>
