<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'

import BotaoTextual from './BotaoTextual.vue'

/**
 * Toast do documento-de-design §7.6: `papel-elevado`, `radius` 12, `elev-2`, barra lateral fina
 * de 4px. `musgo` confirma (`Torto Arado entrou na lista...`), `rubi` avisa que algo não foi feito
 * (`Não foi possível salvar a nova ordem.`). Não some sozinho num tempo fixo: o documento não
 * define a duração (adicionar-a-lista.md §7), e o de falha precisa ficar até a pessoa agir
 * (lista.md §4.4).
 *
 * Entra no `#avisos-flutuantes` do shell, que já o põe acima da barra inferior no mobile e no
 * canto da área de conteúdo na web, com no máximo 480px.
 */
withDefaults(
  defineProps<{
    aberto: boolean
    tom?: 'musgo' | 'rubi'
    /** Rótulo da ação à direita (`Ver lista`, `Tentar de novo`); sem ele, só o texto e o `X`. */
    acao?: string
  }>(),
  { tom: 'musgo', acao: undefined },
)
const emit = defineEmits<{ acao: []; fechar: [] }>()
</script>

<template>
  <Teleport
    to="#avisos-flutuantes"
    defer
  >
    <Transition name="aviso">
      <div
        v-if="aberto"
        class="pointer-events-auto flex w-full items-center gap-space-3 overflow-hidden rounded-base border-l-4 bg-papel-elevado py-space-3 pl-space-4 pr-space-2 shadow-2 md:max-w-[480px]"
        :class="tom === 'rubi' ? 'border-rubi' : 'border-musgo'"
        :role="tom === 'rubi' ? 'alert' : 'status'"
      >
        <p class="min-w-0 flex-1 py-space-1 text-body text-tinta">
          <slot />
        </p>
        <BotaoTextual
          v-if="acao"
          class="shrink-0"
          @click="emit('acao')"
        >
          {{ acao }}
        </BotaoTextual>
        <button
          type="button"
          class="flex size-10 shrink-0 items-center justify-center rounded-base text-grafite transition-colors duration-dur-fast hover:bg-linha hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
          aria-label="Fechar aviso"
          @click="emit('fechar')"
        >
          <PhX
            :size="16"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Entra de baixo em `dur-base` com `ease-out`, sai com `ease-in`; parado sob `reduce`. */
.aviso-enter-active {
  transition: transform var(--duration-base) var(--easing-out), opacity var(--duration-base) var(--easing-out);
}

.aviso-leave-active {
  transition: transform var(--duration-base) var(--easing-in), opacity var(--duration-base) var(--easing-in);
}

.aviso-enter-from,
.aviso-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

@media (prefers-reduced-motion: reduce) {
  .aviso-enter-from,
  .aviso-leave-to {
    transform: none;
  }
}
</style>
