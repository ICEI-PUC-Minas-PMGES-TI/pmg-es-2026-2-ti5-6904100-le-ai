<script setup lang="ts">
import { PhUser } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { miniaturaDoAvatar } from '../../services/avatar'

/**
 * Avatar circular de leitor (meu-perfil.md §4, editar-perfil.md §4): borda de 1px `linha`. Sem
 * foto, os protótipos de F-PERFIL mostram as iniciais do nome em `musgo`, peso 600, sobre
 * `musgo-fundo`, em cerca de um terço do lado (31px no avatar de 96, 38px no de 120). Sem nome,
 * fica o ícone de pessoa. Foto local (prévia do upload, `blob:`) vai como está; a do Cloudinary
 * vai como miniatura do tamanho exibido.
 */
const props = defineProps<{
  url: string | null
  /** Lado em pixels de CSS. */
  tamanho: number
  /** Nome de exibição, de onde saem as iniciais quando não há foto. */
  nome?: string
}>()

const origem = computed(() => {
  if (!props.url) {
    return null
  }
  return props.url.startsWith('https://res.cloudinary.com/') ? miniaturaDoAvatar(props.url, props.tamanho) : props.url
})

const iniciais = computed(() => iniciaisDoNome(props.nome ?? ''))
</script>

<script lang="ts">
/** Primeira letra do primeiro e do último nome, em maiúsculas: "Marina Beltrão" vira "MB". */
export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) {
    return ''
  }
  const primeira = [...partes[0]!][0] ?? ''
  const ultima = partes.length > 1 ? ([...partes[partes.length - 1]!][0] ?? '') : ''
  return (primeira + ultima).toLocaleUpperCase('pt-BR')
}
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-linha"
    :class="origem || !iniciais ? 'bg-papel-elevado' : 'bg-musgo-fundo'"
    :style="{ width: `${tamanho}px`, height: `${tamanho}px` }"
  >
    <img
      v-if="origem"
      :src="origem"
      alt=""
      class="size-full object-cover"
    >
    <span
      v-else-if="iniciais"
      class="font-body font-semibold leading-none text-musgo"
      :style="{ fontSize: `${Math.round(tamanho * 0.32)}px` }"
      aria-hidden="true"
    >{{ iniciais }}</span>
    <PhUser
      v-else
      :size="Math.round(tamanho / 2)"
      weight="regular"
      class="text-grafite-suave"
      aria-hidden="true"
    />
  </span>
</template>
