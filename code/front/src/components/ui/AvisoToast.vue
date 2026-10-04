<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'

import { aviso, fecharAviso } from '../../avisos'
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="pointer-events-none absolute inset-x-space-4 bottom-[calc(64px_+_env(safe-area-inset-bottom)_+_var(--spacing-space-4))] z-20 md:bottom-space-8 md:left-space-8 md:right-auto md:w-[400px]"
  >
    <Transition name="aviso">
      <div
        v-if="aviso"
        :key="aviso.id"
        class="pointer-events-auto flex items-center gap-space-3 overflow-hidden rounded-base border-l-4 bg-papel-elevado py-space-2 pl-space-4 pr-space-1 shadow-2"
        :class="aviso.tom === 'erro' ? 'border-rubi' : 'border-musgo'"
      >
        <component
          :is="aviso.icone"
          v-if="aviso.icone"
          :size="20"
          weight="regular"
          class="shrink-0 text-musgo"
          aria-hidden="true"
        />
        <div class="flex-1 py-space-2">
          <p class="text-body text-tinta">
            {{ aviso.texto }}
          </p>
          <button
            v-if="aviso.acao"
            type="button"
            class="mt-space-1 min-h-10 cursor-pointer text-body-strong text-musgo hover:underline focus-visible:underline"
            @click="aviso.acao.executar"
          >
            {{ aviso.acao.rotulo }}
          </button>
        </div>
        <button
          type="button"
          class="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-grafite hover:bg-linha"
          aria-label="Fechar aviso"
          @click="fecharAviso"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
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
