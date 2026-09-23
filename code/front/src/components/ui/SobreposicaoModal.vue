<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Base de modal (documento-de-design §5.4): bottom sheet abaixo de 768px e, a partir dali,
 * dialog centrado de 480px, a menos que `somenteFolha` fixe a folha (menu que só existe no
 * mobile). Scrim `tinta` a 40%. Enquanto aberta, o foco fica preso dentro dela, `Esc` fecha e,
 * ao fechar, o foco volta para quem a abriu (cadastro-pessoal.md §9).
 */
const props = withDefaults(
  defineProps<{
    aberta: boolean
    rotulo: string
    /** Seletor, dentro da sobreposição, do elemento que recebe o foco ao abrir. */
    focoInicial?: string
    somenteFolha?: boolean
  }>(),
  { focoInicial: undefined, somenteFolha: false },
)

const emit = defineEmits<{ fechar: [] }>()

const painel = ref<HTMLElement | null>(null)
let quemAbriu: HTMLElement | null = null

const FOCAVEIS = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focaveis(): HTMLElement[] {
  return painel.value ? [...painel.value.querySelectorAll<HTMLElement>(FOCAVEIS)] : []
}

watch(
  () => props.aberta,
  async (aberta) => {
    if (aberta) {
      quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      const alvo = props.focoInicial ? painel.value?.querySelector<HTMLElement>(props.focoInicial) : focaveis()[0]
      alvo?.focus()
    } else {
      quemAbriu?.focus()
      quemAbriu = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => quemAbriu?.focus())

function aoTeclar(evento: KeyboardEvent): void {
  if (evento.key === 'Escape') {
    evento.preventDefault()
    emit('fechar')
    return
  }
  if (evento.key !== 'Tab') {
    return
  }
  const lista = focaveis()
  if (lista.length === 0) {
    return
  }
  const primeiro = lista[0]!
  const ultimo = lista[lista.length - 1]!
  if (evento.shiftKey && document.activeElement === primeiro) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault()
    primeiro.focus()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="aberta"
      class="fixed inset-0 z-30 flex items-end justify-center bg-tinta/40"
      :class="somenteFolha ? '' : 'md:items-center md:p-space-8'"
      @click.self="emit('fechar')"
    >
      <div
        ref="painel"
        role="dialog"
        aria-modal="true"
        :aria-label="rotulo"
        class="w-full rounded-t-lg bg-papel p-space-6 shadow-3 motion-safe:animate-[entrar_var(--duration-base)_var(--easing-out)]"
        :class="somenteFolha ? 'pb-[calc(var(--spacing-space-6)+env(safe-area-inset-bottom))]' : 'md:w-[480px] md:max-w-full md:rounded-lg'"
        @keydown="aoTeclar"
      >
        <div
          class="mx-auto mb-space-5 h-1 w-8 rounded-full bg-linha"
          :class="somenteFolha ? '' : 'md:hidden'"
          aria-hidden="true"
        />
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes entrar {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
