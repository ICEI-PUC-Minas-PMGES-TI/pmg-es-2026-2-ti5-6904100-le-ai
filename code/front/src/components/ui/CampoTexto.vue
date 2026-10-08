<script setup lang="ts">
import { PhCalendarBlank } from '@phosphor-icons/vue'
import { type Component, computed, useId } from 'vue'

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
    /**
     * Reescreve o valor a cada digitação e diz onde o cursor fica (ex.: máscara de ISBN). Recebe
     * o texto novo, a posição do cursor nele e o valor anterior.
     */
    mascara?: (bruto: string, cursor: number, anterior: string) => { valor: string; cursor: number }
    /**
     * Ícone Phosphor à esquerda, dentro do campo (protótipos de F-AUT/login e cadastro: 20px,
     * `grafite-suave`). Decorativo: o label já diz o que o campo é.
     */
    icone?: Component
    /**
     * Mensagem de erro logo abaixo do campo e o helper depois dela (alterar-senha.md §4.3 e os
     * protótipos de recuperar e redefinir senha). O padrão é o do cadastro.md §4.3: helper, erro.
     */
    erroAntesDoHelper?: boolean
    /**
     * Unidade dentro do campo, à direita, em `caption` `grafite-suave` (descobrir.md do Período 2:
     * `págs` na faixa dos filtros). Decorativa: o label já diz a unidade. O campo reserva à direita
     * o espaço do texto, para os dígitos não passarem por baixo dele.
     */
    sufixo?: string
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
    mascara: undefined,
    icone: undefined,
    erroAntesDoHelper: false,
    sufixo: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [valor: string]
  // Explícito: `blur` não borbulha, então o listener passado ao componente cairia no <div> raiz
  // e nunca dispararia.
  blur: []
}>()

function aoDigitar(evento: Event): void {
  const campo = evento.target as HTMLInputElement
  if (!props.mascara) {
    emit('update:modelValue', campo.value)
    return
  }
  const { valor, cursor } = props.mascara(campo.value, campo.selectionStart ?? campo.value.length, props.modelValue)
  // Escreve direto no elemento: se o valor mascarado for igual ao anterior (ex.: letra
  // descartada), o Vue não re-renderiza e o caractere recusado ficaria na tela.
  campo.value = valor
  campo.setSelectionRange(cursor, cursor)
  emit('update:modelValue', valor)
}

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
      <component
        :is="icone"
        v-if="icone"
        :size="20"
        weight="regular"
        aria-hidden="true"
        class="pointer-events-none absolute left-space-4 top-1/2 -translate-y-1/2 text-grafite-suave"
      />
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
          sufixo ? '' : $slots.trailing || type === 'date' ? 'pr-space-10' : '',
          type === 'date' ? 'campo-data' : '',
          icone ? 'pl-11' : '',
          mono ? 'font-mono tabular-nums' : '',
          somenteLeitura ? 'text-grafite' : 'text-tinta',
        ]"
        :style="sufixo ? { paddingRight: `calc(1rem + ${sufixo.length + 2}ch)` } : undefined"
        @input="aoDigitar"
        @blur="emit('blur')"
      >
      <!-- Data: o ícone do protótipo (`CalendarBlank`, `grafite-suave`) por cima do indicador nativo,
           que fica transparente mas continua abrindo o seletor ao clique. -->
      <PhCalendarBlank
        v-if="type === 'date'"
        :size="20"
        weight="regular"
        aria-hidden="true"
        class="pointer-events-none absolute right-space-4 top-1/2 -translate-y-1/2 text-grafite-suave"
      />
      <span
        v-if="sufixo"
        aria-hidden="true"
        class="pointer-events-none absolute right-space-4 top-1/2 -translate-y-1/2 text-caption text-grafite-suave"
      >{{ sufixo }}</span>
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
      :class="erroAntesDoHelper ? 'order-2' : ''"
    >
      {{ helper }}
    </p>
    <p
      v-if="erro"
      :id="idErro"
      class="text-caption text-rubi"
      :class="erroAntesDoHelper ? 'order-1' : ''"
    >
      {{ erro }}
    </p>
  </div>
</template>

<style scoped>
/* O indicador nativo do input de data some, mas continua clicável sob o ícone Phosphor. */
.campo-data::-webkit-calendar-picker-indicator {
  opacity: 0;
  cursor: pointer;
}
</style>
