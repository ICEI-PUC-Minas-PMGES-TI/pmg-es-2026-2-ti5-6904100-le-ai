<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'
import { onMounted, ref } from 'vue'

import PoliticaDePrivacidade from './PoliticaDePrivacidade.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'

/**
 * A política vista por quem ainda não tem conta (cadastro.md §5): sem shell, coluna de 720px
 * centralizada, retorno ao cadastro no topo. O conteúdo é o mesmo componente das configurações,
 * para os dois lugares não divergirem. O foco vai ao título ao abrir (§9).
 */
const emit = defineEmits<{ voltar: [] }>()

const titulo = ref<HTMLHeadingElement | null>(null)

onMounted(() => {
  window.scrollTo?.(0, 0)
  titulo.value?.focus()
})
</script>

<template>
  <div class="min-h-screen w-full bg-papel">
    <div class="mx-auto max-w-[720px] px-space-5 pb-space-16 pt-space-6 md:px-space-8">
      <BotaoTextual
        class="-ml-space-3 min-h-12 gap-space-2 md:ml-0 md:min-h-0"
        aria-label="Voltar para o cadastro"
        @click="emit('voltar')"
      >
        <PhArrowLeft
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        <span class="hidden md:inline">Voltar para o cadastro</span>
      </BotaoTextual>
      <h1
        ref="titulo"
        tabindex="-1"
        class="mt-space-6 text-display text-tinta outline-none"
      >
        <span class="md:hidden">Privacidade</span>
        <span class="hidden md:inline">Política de privacidade</span>
      </h1>
      <PoliticaDePrivacidade class="mt-space-2" />
    </div>
  </div>
</template>
