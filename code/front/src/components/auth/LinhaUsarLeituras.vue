<script setup lang="ts">
import { PhWarning } from '@phosphor-icons/vue'
import { useId } from 'vue'

import TrilhoInterruptor from '../ui/TrilhoInterruptor.vue'

/**
 * Linha `Usar minhas leituras em sugestões` (F-REC-ALG, configuracoes.md do Período 3 §4). A
 * linha inteira é o `switch`. `usar` nulo é o carregamento: no lugar do trilho, o retângulo de
 * 52 x 32px em `capa-placeholder`, e a linha não responde. No mobile o rótulo é `body`; no painel
 * da web, `body-strong` e sem padding lateral.
 *
 * Para o leitor de tela (configuracoes.md §9): o nome é só o rótulo; a descrição e o erro são a
 * dica (`aria-describedby`), e o erro entra numa região viva educada. Enquanto o estado é
 * desconhecido a linha não é `switch` nem afirma ligado ou desligado: é um botão indisponível.
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

const id = useId()
const idRotulo = `${id}-rotulo`
const idDescricao = `${id}-descricao`
const idErro = `${id}-erro`
</script>

<template>
  <button
    type="button"
    :role="usar === null ? undefined : 'switch'"
    :aria-checked="usar === null ? undefined : usar"
    :aria-labelledby="idRotulo"
    :aria-describedby="`${idDescricao} ${idErro}`"
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
        :id="idRotulo"
        class="text-tinta"
        :class="variante === 'web' ? 'text-body-strong' : 'text-body'"
      >Usar minhas leituras em sugestões</span>
      <span
        :id="idDescricao"
        class="mt-space-1 text-caption text-grafite"
      >{{ descricao }}</span>
      <span
        :id="idErro"
        aria-live="polite"
      >
        <span
          v-if="erro"
          class="mt-space-2 flex items-start gap-space-1 text-caption text-rubi"
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
