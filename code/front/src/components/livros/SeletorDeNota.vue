<script setup lang="ts">
import { PhStar, PhStarHalf } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'

import { formatarNota } from '../../livros/formatos'

/**
 * Seletor de nota com meia estrela (avaliar-livro.md §4 e §5, documento-de-design §4.3, `lg`).
 *
 * - Cinco estrelas de 32px em alvos de 48px. A metade esquerda de cada alvo escolhe a meia estrela;
 *   a direita, a inteira. Arrastar sobre a linha escolhe continuamente, e o começo da linha é `0`:
 *   nota zero é um julgamento válido (RN-06).
 * - Na web, o cursor pré-visualiza o valor (estrelas a 60% e o número em `grafite-suave`, emitido
 *   em `previa`) sem trocar o valor real até o clique.
 * - É um `slider` operável inteiro por teclado: setas mudam de 0,5 em 0,5, `Home` é 0 e `End` é 5.
 *   O valor é anunciado em texto, sem depender das estrelas.
 */
const props = withDefaults(defineProps<{ modelValue: number | null; desabilitado?: boolean }>(), {
  desabilitado: false,
})

const emit = defineEmits<{ 'update:modelValue': [valor: number]; previa: [valor: number | null] }>()

const ALVO = 48

const linha = ref<HTMLElement | null>(null)
const previa = ref<number | null>(null)
const arrastando = ref(false)

const exibido = computed(() => previa.value ?? props.modelValue)

const estrelas = computed(() => {
  const valor = exibido.value ?? -1
  return [1, 2, 3, 4, 5].map((posicao) =>
    valor >= posicao ? 'cheia' : valor >= posicao - 0.5 ? 'meia' : 'vazia',
  )
})

const textoDoValor = computed(() =>
  props.modelValue === null ? 'Sem nota' : `${formatarNota(props.modelValue)} de 5`,
)

/** Posição horizontal do ponteiro → valor em passos de 0,5. */
function valorNa(clienteX: number): number {
  const caixa = linha.value?.getBoundingClientRect()
  const largura = caixa && caixa.width > 0 ? caixa.width : ALVO * 5
  const dx = clienteX - (caixa?.left ?? 0)
  if (dx <= 0) {
    return 0
  }
  return Math.min(10, Math.ceil((dx / largura) * 10)) / 2
}

function escolher(valor: number): void {
  if (props.desabilitado) {
    return
  }
  const limitado = Math.min(5, Math.max(0, valor))
  if (limitado !== props.modelValue) {
    emit('update:modelValue', limitado)
  }
}

function mudarPrevia(valor: number | null): void {
  previa.value = valor
  emit('previa', valor)
}

function aoMover(evento: PointerEvent): void {
  if (props.desabilitado) {
    return
  }
  const valor = valorNa(evento.clientX)
  if (arrastando.value) {
    escolher(valor)
  } else if (evento.pointerType === 'mouse') {
    mudarPrevia(valor)
  }
}

function aoPressionar(evento: PointerEvent): void {
  if (props.desabilitado) {
    return
  }
  arrastando.value = true
  linha.value?.setPointerCapture?.(evento.pointerId)
  escolher(valorNa(evento.clientX))
}

function aoSoltar(): void {
  arrastando.value = false
}

function aoSair(): void {
  arrastando.value = false
  mudarPrevia(null)
}

function aoTeclar(evento: KeyboardEvent): void {
  const atual = props.modelValue
  const passos: Record<string, number | undefined> = {
    ArrowRight: atual === null ? 0.5 : atual + 0.5,
    ArrowUp: atual === null ? 0.5 : atual + 0.5,
    ArrowLeft: atual === null ? undefined : atual - 0.5,
    ArrowDown: atual === null ? undefined : atual - 0.5,
    Home: 0,
    End: 5,
  }
  if (!(evento.key in passos)) {
    return
  }
  evento.preventDefault()
  const novo = passos[evento.key]
  if (novo !== undefined) {
    escolher(novo)
  }
}
</script>

<template>
  <div
    ref="linha"
    role="slider"
    :tabindex="desabilitado ? -1 : 0"
    aria-label="Nota"
    aria-valuemin="0"
    aria-valuemax="5"
    :aria-valuenow="modelValue ?? undefined"
    :aria-valuetext="textoDoValor"
    :aria-disabled="desabilitado || undefined"
    class="flex touch-none select-none rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
    :class="desabilitado ? 'cursor-default' : 'cursor-pointer'"
    @pointerdown="aoPressionar"
    @pointermove="aoMover"
    @pointerup="aoSoltar"
    @pointerleave="aoSair"
    @keydown="aoTeclar"
  >
    <span
      v-for="(estrela, indice) in estrelas"
      :key="indice"
      class="flex h-12 w-12 items-center justify-center"
      :class="previa !== null ? 'opacity-60' : ''"
      aria-hidden="true"
    >
      <PhStarHalf
        v-if="estrela === 'meia'"
        :size="32"
        weight="fill"
        class="text-musgo"
      />
      <PhStar
        v-else
        :size="32"
        :weight="estrela === 'cheia' ? 'fill' : 'regular'"
        :class="estrela === 'cheia' ? 'text-musgo' : 'text-grafite-suave'"
      />
    </span>
  </div>
</template>
