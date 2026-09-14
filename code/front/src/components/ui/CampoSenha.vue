<script setup lang="ts">
import { PhEye, PhEyeSlash } from '@phosphor-icons/vue'
import { ref } from 'vue'

import CampoTexto from './CampoTexto.vue'

/**
 * CampoTexto especializado em senha: alterna entre `Eye` e `EyeSlash` (Phosphor, `regular`,
 * login.md §9) para mostrar/ocultar o valor digitado. Reaproveita CampoTexto por composição —
 * label, foco e erro são o mesmo componente; só o tipo do input e o botão trailing mudam.
 */
defineProps<{
  modelValue: string
  label: string
  id?: string
  erro?: string
  helper?: string
  placeholder?: string
  disabled?: boolean
  autocomplete?: string
  required?: boolean
}>()

defineEmits<{
  'update:modelValue': [valor: string]
}>()

const mostrando = ref(false)

function alternarVisibilidade(): void {
  mostrando.value = !mostrando.value
}
</script>

<template>
  <CampoTexto
    :id="id"
    :model-value="modelValue"
    :label="label"
    :type="mostrando ? 'text' : 'password'"
    :erro="erro"
    :helper="helper"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :required="required"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #trailing>
      <button
        type="button"
        class="flex h-full w-space-10 items-center justify-center text-grafite transition-colors duration-dur-fast hover:text-tinta disabled:cursor-not-allowed"
        :disabled="disabled"
        :aria-label="mostrando ? 'Ocultar senha' : 'Mostrar senha'"
        :aria-pressed="mostrando"
        @click="alternarVisibilidade"
      >
        <PhEyeSlash
          v-if="mostrando"
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        <PhEye
          v-else
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
      </button>
    </template>
  </CampoTexto>
</template>
