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
    /**
     * Presença ativa a borda `rubi` e uma legenda com esta mensagem abaixo do campo. Coexiste
     * com `helper` (cadastro.md §4.3: o helper da senha continua visível acima do erro — a
     * regra não deixou de existir só porque o usuário errou outra coisa).
     */
    erro?: string
    /**
     * Borda `rubi` sem legenda própria — para quando um banner acima do formulário já explica
     * o erro (login.md §4.2: repetir o texto do banner em cada campo diria a mesma coisa duas
     * vezes). Ignorado se `erro` também estiver presente.
     */
    bordaDeErro?: boolean
    /** Texto permanente abaixo do campo, visível mesmo sem erro (nunca só depois de errar). */
    helper?: string
    placeholder?: string
    disabled?: boolean
    autocomplete?: string
    required?: boolean
    /** Teclado virtual sugerido (`numeric` no ISBN e nas páginas). */
    inputmode?: 'text' | 'numeric'
    /** Numeral tabular da JetBrains Mono, para conferir dígito a dígito (ISBN). */
    mono?: boolean
    /**
     * Largura só do campo, não do helper (cadastro-pessoal.md §4.1: o campo de páginas é
     * estreito para comunicar o tamanho da entrada, e o helper segue a largura da coluna).
     */
    larguraDoCampo?: string
    /**
     * Travado sem virar cinza ilegível: mantém o fundo e troca o texto para `grafite`
     * (cadastro-por-isbn.md §4.3, o ISBN continua legível enquanto a busca corre).
     */
    somenteLeitura?: boolean
  }>(),
  {
    id: undefined,
    type: 'text',
    erro: undefined,
    bordaDeErro: false,
    helper: undefined,
    placeholder: undefined,
    disabled: false,
    autocomplete: undefined,
    required: false,
    inputmode: undefined,
    mono: false,
    larguraDoCampo: undefined,
    somenteLeitura: false,
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
// Helper e erro podem coexistir (cadastro.md §4.3): aria-describedby aceita lista separada
// por espaço, então os dois ids entram juntos quando os dois textos estão visíveis.
const idDescricao = computed(() => {
  const ids = [props.helper ? idHelper.value : null, props.erro ? idErro.value : null].filter(
    (valor): valor is string => valor !== null,
  )
  return ids.length > 0 ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="flex flex-col gap-space-2">
    <label
      :for="idCampo"
      class="text-label text-grafite"
    >{{ label }}</label>
    <div
      class="relative"
      :class="larguraDoCampo"
    >
      <input
        :id="idCampo"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="somenteLeitura"
        :autocomplete="autocomplete"
        :required="required"
        :aria-required="required ? 'true' : undefined"
        :inputmode="inputmode"
        :aria-invalid="erro || bordaDeErro ? 'true' : undefined"
        :aria-describedby="idDescricao"
        class="h-11 w-full rounded-base bg-papel-elevado px-space-4 text-body outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave disabled:cursor-not-allowed disabled:bg-linha disabled:text-grafite-suave"
        :class="[
          erro || bordaDeErro
            ? 'border-[1.5px] border-rubi'
            : 'border border-linha focus:border-[1.5px] focus:border-musgo',
          $slots.trailing ? 'pr-space-10' : '',
          mono ? 'font-mono tabular-nums' : '',
          somenteLeitura ? 'text-grafite' : 'text-tinta',
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
      v-if="helper"
      :id="idHelper"
      class="text-caption text-grafite"
    >
      {{ helper }}
    </p>
    <p
      v-if="erro"
      :id="idErro"
      class="text-caption text-rubi"
    >
      {{ erro }}
    </p>
  </div>
</template>
