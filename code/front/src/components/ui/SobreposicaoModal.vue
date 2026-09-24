<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Base de modal (documento-de-design §4.11): bottom sheet abaixo de 768px e, a partir dali,
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
    <Transition name="sobreposicao">
      <div
        v-if="aberta"
        class="scrim fixed inset-0 z-30 flex items-end justify-center"
        :class="somenteFolha ? '' : 'md:items-center md:p-space-8'"
        @click.self="emit('fechar')"
      >
        <div
          ref="painel"
          role="dialog"
          aria-modal="true"
          :aria-label="rotulo"
          class="painel w-full rounded-t-lg bg-papel p-space-6 shadow-3 dark:bg-papel-elevado"
          :class="somenteFolha ? 'pb-[calc(var(--spacing-space-6)+env(safe-area-inset-bottom))]' : 'vira-dialogo md:w-[480px] md:max-w-full md:rounded-xl'"
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
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * Scrim `tinta` a 40% no claro e preto a 60% no escuro (livro-pessoal.md §6). Não usa
 * `bg-tinta/40`: no escuro `tinta` vira `papel-suave` e o scrim clareia a tela em vez de escurecer.
 */
.scrim {
  background-color: rgb(23 21 18 / 0.4);
}

.dark .scrim {
  background-color: rgb(0 0 0 / 0.6);
}

/*
 * Sheet sobe de baixo em `dur-slow` (documento-de-design §3.6); dialog, da web, entra com
 * `dur-base` e um deslize curto. Saída em `dur-base` com `easing-in`. O scrim acompanha a
 * duração do painel para o `<Transition>` medir o tempo certo pelo elemento raiz.
 */
.sobreposicao-enter-active {
  transition: opacity var(--duration-slow) var(--easing-out);
}

.sobreposicao-enter-active .painel {
  transition: transform var(--duration-slow) var(--easing-out);
}

.sobreposicao-leave-active {
  transition: opacity var(--duration-base) var(--easing-in);
}

.sobreposicao-leave-active .painel {
  transition: transform var(--duration-base) var(--easing-in);
}

.sobreposicao-enter-from,
.sobreposicao-leave-to {
  opacity: 0;
}

.sobreposicao-enter-from .painel,
.sobreposicao-leave-to .painel {
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .sobreposicao-enter-active:has(.vira-dialogo) {
    transition-duration: var(--duration-base);
  }

  .sobreposicao-enter-active .vira-dialogo {
    transition: transform var(--duration-base) var(--easing-out), opacity var(--duration-base) var(--easing-out);
  }

  .sobreposicao-enter-from .vira-dialogo,
  .sobreposicao-leave-to .vira-dialogo {
    opacity: 0;
    transform: translateY(16px);
  }
}

/* Sob `reduce`, sheet e dialog entram sem deslizar (livro-pessoal.md §9). */
@media (prefers-reduced-motion: reduce) {
  .sobreposicao-enter-from .painel,
  .sobreposicao-leave-to .painel {
    transform: none;
  }
}
</style>
