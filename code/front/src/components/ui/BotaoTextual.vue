<script setup lang="ts">
import { computed } from 'vue'

/**
 * Ação inline, sem fundo nem borda (documento-de-design §4.1): "Criar conta", "Cancelar".
 * Renderiza `<a>` quando `href` é passado (link de navegação) ou `<button>` caso contrário —
 * o componente não depende do Vue Router, que é assunto de `src/router/` (Etapa 9).
 */
const props = withDefaults(
  defineProps<{
    tipo?: 'button' | 'submit'
    href?: string
    disabled?: boolean
    /** `musgo` é o padrão; `grafite` para Cancelar e `rubi` para Excluir (livro-pessoal.md §5.1). */
    tom?: 'musgo' | 'grafite' | 'rubi'
  }>(),
  {
    tipo: 'button',
    href: undefined,
    disabled: false,
    tom: 'musgo',
  },
)

const COR = { musgo: 'text-musgo', grafite: 'text-grafite', rubi: 'text-rubi' } as const

const atributos = computed(() =>
  props.href ? { href: props.href } : { type: props.tipo, disabled: props.disabled },
)
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    v-bind="atributos"
    :class="COR[tom]"
    class="inline-flex items-center px-space-1 py-space-1 text-body-strong underline-offset-2 transition-colors duration-dur-fast hover:underline focus-visible:underline active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
  >
    <slot />
  </component>
</template>
