<script setup lang="ts">
import { computed, h, type VNodeChild } from 'vue'

import { trechoCorrido, type Trecho } from '../../markdown/resenha'

/**
 * Trecho da resenha no card da denúncia (denunciar.md §4, passo 1): no máximo três linhas, com o
 * itálico e o negrito do original. Monta os nós a partir da árvore do subconjunto (RN-13), sem
 * `v-html`: o texto só entra como nó de texto.
 */
const props = defineProps<{ texto: string }>()

function nos(trechos: Trecho[]): VNodeChild[] {
  return trechos.map((trecho) => {
    if ('t' in trecho) return trecho.t
    if ('br' in trecho) return ' '
    if ('b' in trecho) return h('strong', { class: 'font-semibold' }, nos(trecho.b))
    if ('i' in trecho) return h('em', { class: 'italic' }, nos(trecho.i))
    return h('s', { class: 'line-through decoration-1' }, nos(trecho.s))
  })
}

const Conteudo = () => nos(trechoCorrido(props.texto))
const vazio = computed(() => props.texto.trim() === '')
</script>

<template>
  <p
    v-if="!vazio"
    class="line-clamp-3 break-words font-editorial text-body text-tinta"
  >
    <Conteudo />
  </p>
</template>
