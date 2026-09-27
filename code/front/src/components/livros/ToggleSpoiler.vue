<script setup lang="ts">
import { PhEyeSlash } from '@phosphor-icons/vue'

/**
 * Toggle "Contém spoiler" do editor de resenha (escrever-resenha.md §4 e §5). Desligado: ícone e
 * rótulo em `grafite`, sem fundo. Ligado: pill em `ambar-fundo`, ícone e rótulo em `ambar` e o
 * rótulo em peso 600 — o estado não depende só da cor (`aria-pressed` para o leitor de tela).
 *
 * O texto `ambar` sobre `ambar-fundo` fica abaixo do contraste AA; o peso e o ícone reforçam o
 * estado, e a pendência de design está registrada em F-AVA.
 */
const props = withDefaults(defineProps<{ modelValue: boolean; desabilitado?: boolean }>(), {
  desabilitado: false,
})

const emit = defineEmits<{ 'update:modelValue': [valor: boolean] }>()
</script>

<template>
  <button
    type="button"
    :aria-pressed="props.modelValue"
    :disabled="desabilitado"
    class="inline-flex min-h-12 cursor-pointer items-center gap-space-2 rounded-full px-space-3 text-caption transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:cursor-not-allowed disabled:opacity-60 md:min-h-10"
    :class="modelValue ? 'bg-ambar-fundo font-semibold text-ambar md:hover:bg-ambar md:hover:text-papel' : 'text-grafite md:hover:bg-linha'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <PhEyeSlash
      :size="20"
      weight="regular"
      aria-hidden="true"
    />
    Contém spoiler
  </button>
</template>
