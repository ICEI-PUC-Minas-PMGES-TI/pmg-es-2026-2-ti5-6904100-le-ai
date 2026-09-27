<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Contador permanente do editor de resenha (escrever-resenha.md §4): `grafite`, `ambar` a partir
 * de 4.750 e `rubi` acima de 5.000. Conta caracteres Unicode (code points), como o servidor e o
 * `char_length` do banco. O leitor de tela ouve só quando a faixa muda, não a cada tecla.
 */
const props = withDefaults(defineProps<{ total: number; limite?: number; aviso?: number }>(), {
  limite: 5000,
  aviso: 4750,
})

const numero = new Intl.NumberFormat('pt-BR')

const faixa = computed(() => (props.total > props.limite ? 'excedido' : props.total >= props.aviso ? 'aviso' : 'normal'))

const anuncio = ref('')
watch(faixa, (atual) => {
  anuncio.value =
    atual === 'excedido'
      ? `Passou do limite de ${numero.format(props.limite)} caracteres.`
      : atual === 'aviso'
        ? `Perto do limite de ${numero.format(props.limite)} caracteres.`
        : 'Dentro do limite.'
})

const COR = { normal: 'text-grafite', aviso: 'text-ambar', excedido: 'text-rubi' } as const
</script>

<template>
  <p
    class="text-right font-mono text-caption tabular-nums"
    :class="COR[faixa]"
  >
    {{ numero.format(total) }} de {{ numero.format(limite) }} caracteres
    <span
      class="sr-only"
      aria-live="polite"
    >{{ anuncio }}</span>
  </p>
</template>
