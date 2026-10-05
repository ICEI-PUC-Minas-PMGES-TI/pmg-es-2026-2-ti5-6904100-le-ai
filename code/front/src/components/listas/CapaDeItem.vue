<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * Capa de 48 por 72px das linhas de lista (lista.md §4 "Linha de livro"): canto vivo, sem
 * sombra. Sem imagem, o `capa-placeholder` com o título centralizado, reduzido para caber
 * (documento-de-design §4.5). Livro pessoal ganha o badge `PESSOAL` em `overline` no canto
 * inferior esquerdo, sobre `papel` a 90%.
 */
const props = defineProps<{
  url: string | null
  titulo: string
  pessoal: boolean
  /** 60 por 90px a partir de 768px: cabeçalho do dialog `Adicionar à lista` (§5). */
  maiorNaWeb?: boolean
}>()

const falhou = ref(false)
watch(
  () => props.url,
  () => {
    falhou.value = false
  },
)
</script>

<template>
  <div
    class="relative flex h-[72px] w-12 shrink-0 items-center justify-center overflow-hidden bg-capa-placeholder"
    :class="maiorNaWeb ? 'md:h-[90px] md:w-[60px]' : ''"
  >
    <img
      v-if="url && !falhou"
      :src="url"
      alt=""
      class="size-full object-cover"
      @error="falhou = true"
    >
    <span
      v-else
      class="line-clamp-4 px-0.5 text-center text-[10px] font-semibold leading-tight text-tinta"
      aria-hidden="true"
    >{{ titulo }}</span>
    <span
      v-if="pessoal"
      class="absolute bottom-0.5 left-0.5 rounded-sm bg-papel/90 px-0.5 text-[8px] font-semibold uppercase leading-tight tracking-wide text-tinta"
    >Pessoal</span>
  </div>
</template>
