<script setup lang="ts">
import { PhUser } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { miniaturaDoAvatar } from '../../services/avatar'

/**
 * Avatar circular de leitor (meu-perfil.md §4, editar-perfil.md §4): borda de 1px `linha`. Sem
 * foto, o círculo fica em `papel-elevado` com o ícone de pessoa, porque nenhum protótipo define
 * esse estado. Foto local (prévia do upload, `blob:`) vai como está; a do Cloudinary vai como
 * miniatura do tamanho exibido.
 */
const props = defineProps<{
  url: string | null
  /** Lado em pixels de CSS. */
  tamanho: number
}>()

const origem = computed(() => {
  if (!props.url) {
    return null
  }
  return props.url.startsWith('https://res.cloudinary.com/') ? miniaturaDoAvatar(props.url, props.tamanho) : props.url
})
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-linha bg-papel-elevado"
    :style="{ width: `${tamanho}px`, height: `${tamanho}px` }"
  >
    <img
      v-if="origem"
      :src="origem"
      alt=""
      class="size-full object-cover"
    >
    <PhUser
      v-else
      :size="Math.round(tamanho / 2)"
      weight="regular"
      class="text-grafite-suave"
      aria-hidden="true"
    />
  </span>
</template>
