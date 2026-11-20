<script setup lang="ts">
import { PhWarning } from '@phosphor-icons/vue'

import TrilhoInterruptor from '../ui/TrilhoInterruptor.vue'

/**
 * Linha `Usar minhas leituras em sugestões` (F-REC-ALG, configuracoes.md do Período 3 §4). A
 * linha inteira é o `switch`. `usar` nulo é o carregamento: no lugar do trilho, o retângulo de
 * 52 x 32px em `capa-placeholder`, e a linha não responde. No mobile o rótulo é `body`; no painel
 * da web, `body-strong` e sem padding lateral.
 */
withDefaults(
  defineProps<{
    usar: boolean | null
    salvando: boolean
    erro: boolean
    descricao: string
    desabilitada?: boolean
    variante?: 'mobile' | 'web'
  }>(),
  { desabilitada: false, variante: 'mobile' },
)
defineEmits<{ alternar: [] }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="usar === true"
    :aria-disabled="usar === null || desabilitada || salvando"
    :aria-busy="salvando"
    class="flex min-h-[72px] w-full items-center gap-space-4 py-space-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
    :class="[
      variante === 'web' ? 'border-y border-linha' : 'border-b border-linha',
      desabilitada ? 'opacity-40' : '',
    ]"
    @click="usar !== null && !desabilitada && $emit('alternar')"
  >
    <span class="flex min-w-0 flex-1 flex-col">
      <span
        class="text-tinta"
        :class="variante === 'web' ? 'text-body-strong' : 'text-body'"
      >Usar minhas leituras em sugestões</span>
      <span class="mt-space-1 text-caption text-grafite">{{ descricao }}</span>
      <span
        v-if="erro"
        class="mt-space-2 flex items-start gap-space-1 text-caption text-rubi"
        role="alert"
      >
        <PhWarning
          :size="16"
          weight="regular"
          class="mt-0.5 shrink-0"
          aria-hidden="true"
        />
        Não foi possível salvar. Verifique sua conexão e tente de novo.
      </span>
    </span>
    <span
      v-if="usar === null"
      class="esqueleto h-8 w-[52px] shrink-0 rounded-full bg-capa-placeholder"
      aria-hidden="true"
    />
    <TrilhoInterruptor
      v-else
      :ligado="usar"
    />
  </button>
</template>

<style scoped>
.esqueleto {
  animation: surgir var(--duration-base) var(--easing-out);
}

@keyframes surgir {
  from {
    opacity: 0;
  }
}
</style>
