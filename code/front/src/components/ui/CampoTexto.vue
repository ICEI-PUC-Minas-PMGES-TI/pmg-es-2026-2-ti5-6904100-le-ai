<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Campo de formulário com label acima (documento-de-design §4.2): nunca placeholder no lugar do
 * label, três estados visuais (padrão, foco, erro) mais `disabled` na web. Alto 44px na web
 * (48px é a medida mobile, deste componente só a web).
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    id?: string
    type?: 'text' | 'email' | 'date' | 'password'
    /** Presença ativa o estado de erro — borda `rubi` e mensagem abaixo, substituindo o helper. */
    erro?: string
    /** Texto permanente abaixo do campo, visível mesmo sem erro (nunca só depois de errar). */
    helper?: string
    placeholder?: string
    disabled?: boolean
    autocomplete?: string
    required?: boolean
  }>(),
  {
    id: undefined,
    type: 'text',
    erro: undefined,
    helper: undefined,
    placeholder: undefined,
    disabled: false,
    autocomplete: undefined,
    required: false,
  },
)

defineEmits<{
  'update:modelValue': [valor: string]
}>()

// useId() (Vue 3.5) em vez de gerar aleatório à mão: estável entre re-renders e seguro para SSR.
const idGerado = useId()
const idCampo = computed(() => props.id ?? idGerado)
const idErro = computed(() => `${idCampo.value}-erro`)
const idHelper = computed(() => `${idCampo.value}-helper`)
const idDescricao = computed(() =>
  props.erro ? idErro.value : props.helper ? idHelper.value : undefined,
)
</script>

<template>
  <div class="flex flex-col gap-space-2">
    <label
      :for="idCampo"
      class="text-label text-grafite"
    >{{ label }}</label>
    <div class="relative">
      <input
        :id="idCampo"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :autocomplete="autocomplete"
        :required="required"
        :aria-invalid="erro ? 'true' : undefined"
        :aria-describedby="idDescricao"
        class="h-11 w-full rounded-base bg-papel-elevado px-space-4 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave disabled:cursor-not-allowed disabled:bg-linha disabled:text-grafite-suave"
        :class="[
          erro
            ? 'border-[1.5px] border-rubi'
            : 'border border-linha focus:border-[1.5px] focus:border-musgo',
          $slots.trailing ? 'pr-space-10' : '',
        ]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <!-- Espaço para um controle dentro do campo (ex.: alternar visibilidade da senha em
           CampoSenha). Ocupa a altura inteira do campo para dar folga de alvo de toque. -->
      <div
        v-if="$slots.trailing"
        class="absolute inset-y-0 right-0 flex items-stretch"
      >
        <slot name="trailing" />
      </div>
    </div>
    <p
      v-if="erro"
      :id="idErro"
      class="text-caption text-rubi"
    >
      {{ erro }}
    </p>
    <p
      v-else-if="helper"
      :id="idHelper"
      class="text-caption text-grafite"
    >
      {{ helper }}
    </p>
  </div>
</template>
