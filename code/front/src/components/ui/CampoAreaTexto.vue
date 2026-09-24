<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Área de texto com label acima, helper e contador (documento-de-design §4.2,
 * cadastro-pessoal.md §4.1 item 7): 120px de altura mínima, cresce até 240px. O contador só muda
 * de cor perto do limite, em `ambar`, porque antes disso ele é metadado e não aviso.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    id?: string
    helper?: string
    erro?: string
    placeholder?: string
    disabled?: boolean
    limite: number
    /** A partir de quantos caracteres o contador vira alerta. */
    aviso: number
  }>(),
  { id: undefined, helper: undefined, erro: undefined, placeholder: undefined, disabled: false },
)

defineEmits<{ 'update:modelValue': [valor: string] }>()

const idGerado = useId()
const idCampo = computed(() => props.id ?? idGerado)
const idDescricao = computed(
  () => [props.helper ? `${idCampo.value}-helper` : null, props.erro ? `${idCampo.value}-erro` : null, `${idCampo.value}-contador`]
    .filter(Boolean)
    .join(' '),
)
const perto = computed(() => props.modelValue.length > props.aviso)
</script>

<template>
  <div class="flex flex-col gap-space-2">
    <label
      :for="idCampo"
      class="text-label text-grafite"
    >{{ label }}</label>
    <textarea
      :id="idCampo"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="erro ? 'true' : undefined"
      :aria-describedby="idDescricao"
      class="field-sizing-content min-h-[120px] max-h-[240px] w-full resize-y rounded-base bg-papel-elevado px-space-4 py-space-3 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave disabled:cursor-not-allowed disabled:bg-linha disabled:text-grafite-suave"
      :class="erro ? 'border-[1.5px] border-rubi' : 'border border-linha focus:border-[1.5px] focus:border-musgo'"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div class="flex items-start justify-between gap-space-4">
      <div class="flex flex-col gap-space-2">
        <p
          v-if="helper"
          :id="`${idCampo}-helper`"
          class="text-caption text-grafite"
        >
          {{ helper }}
        </p>
        <p
          v-if="erro"
          :id="`${idCampo}-erro`"
          class="text-caption text-rubi"
        >
          {{ erro }}
        </p>
      </div>
      <p
        :id="`${idCampo}-contador`"
        class="shrink-0 text-caption tabular-nums"
        :class="perto ? 'text-ambar' : 'text-grafite-suave'"
      >
        {{ modelValue.length }}/{{ limite }}
      </p>
    </div>
  </div>
</template>
