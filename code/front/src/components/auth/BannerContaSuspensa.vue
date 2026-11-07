<script setup lang="ts">
import { PhProhibit } from '@phosphor-icons/vue'
import { ref } from 'vue'

/**
 * Banner de conta suspensa (F-MOD-OPC, login.md P3): alerta `ambar-fundo` com `Prohibit`, não o
 * `rubi` da credencial inválida, porque o leitor não errou nada nesta tentativa. Duas partes de
 * texto, sem botão, sem link e sem `X`. `sessaoEncerrada` troca só a primeira linha. O foco vai
 * para o banner quando ele aparece (login.md §9).
 */
defineProps<{ sessaoEncerrada?: boolean }>()

const raiz = ref<HTMLElement | null>(null)

defineExpose({ focar: () => raiz.value?.focus() })
</script>

<template>
  <div
    ref="raiz"
    role="alert"
    tabindex="-1"
    class="flex items-start gap-space-3 rounded-base bg-ambar-fundo p-space-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
  >
    <PhProhibit
      :size="20"
      weight="regular"
      class="mt-0.5 shrink-0 text-ambar"
      aria-hidden="true"
    />
    <div class="flex flex-col gap-space-1">
      <p class="text-body-strong text-tinta">
        {{ sessaoEncerrada ? 'Sua sessão foi encerrada porque esta conta foi suspensa.' : 'Esta conta está suspensa.' }}
      </p>
      <p class="text-body text-tinta">
        A moderação do Lê Ai suspendeu o acesso. Enquanto isso, ninguém consegue entrar nela, e os
        dados continuam guardados.
      </p>
    </div>
  </div>
</template>
