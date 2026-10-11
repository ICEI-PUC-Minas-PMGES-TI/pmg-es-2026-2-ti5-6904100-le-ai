<script setup lang="ts">
import { computed } from 'vue'

import { renderizarResenha } from '../../markdown/resenha'

/**
 * Corpo da resenha em Markdown (RN-13, pagina-do-livro.md §4.2 B): Newsreader 400 `tinta`, negrito
 * em Newsreader 600, itálico, tachado com risco de 1px, listas com recuo `space-5` e `space-1`
 * entre itens, citação com borda esquerda de 2px `linha` e texto `grafite`. Marcação fora do
 * subconjunto aparece literal.
 *
 * O `v-html` recebe só a saída de `renderizarResenha`: parser com HTML desligado e DOMPurify com
 * as tags do subconjunto (RNF-SEC-15). Nunca passe outro texto por aqui.
 */
const props = withDefaults(defineProps<{ texto: string; tamanho?: 'body' | 'body-lg' }>(), { tamanho: 'body-lg' })

const html = computed(() => renderizarResenha(props.texto))
</script>

<template>
  <div
    class="break-words font-editorial text-tinta [&_blockquote]:border-l-2 [&_blockquote]:border-linha [&_blockquote]:pl-space-4 [&_blockquote]:text-grafite [&_em]:italic [&_li+li]:mt-space-1 [&_ol]:list-decimal [&_ol]:pl-space-5 [&_s]:line-through [&_s]:decoration-1 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-space-5 [&>div>*+*]:mt-space-3 [&_blockquote>*+*]:mt-space-3 [&_li>*+*]:mt-space-1"
    :class="tamanho === 'body' ? 'text-body' : 'text-body-lg'"
  >
    <!-- eslint-disable-next-line vue/no-v-html -- saída sanitizada de renderizarResenha (RNF-SEC-15) -->
    <div v-html="html" />
  </div>
</template>
