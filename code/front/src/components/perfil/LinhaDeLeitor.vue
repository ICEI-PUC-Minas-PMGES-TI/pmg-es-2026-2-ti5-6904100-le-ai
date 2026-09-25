<script setup lang="ts">
import { RouterLink } from 'vue-router'

import type { PerfilResumo } from '../../services/perfil'
import AvatarLeitor from './AvatarLeitor.vue'

/**
 * Leitor numa lista (seguidores-e-seguidos.md e solicitacoes-de-seguir.md §4): avatar de 48px,
 * nome e `@username`. A área do nome leva ao perfil; a ação entra pelo slot, como alvo separado.
 * Sem a linha de biografia dos protótipos: o `PerfilResumo` do contrato não traz biografia.
 */
defineProps<{ leitor: PerfilResumo }>()
</script>

<template>
  <div class="flex items-center gap-space-4">
    <RouterLink
      :to="`/leitores/${leitor.username}`"
      class="flex min-h-12 min-w-0 flex-1 items-center gap-space-4 rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
      :aria-label="`${leitor.displayName}, arroba ${leitor.username}`"
    >
      <AvatarLeitor
        :url="leitor.avatarUrl"
        :tamanho="48"
      />
      <span class="flex min-w-0 flex-col">
        <span class="truncate text-title-sm text-tinta">{{ leitor.displayName }}</span>
        <span class="truncate text-caption text-grafite-suave">@{{ leitor.username }}</span>
      </span>
    </RouterLink>
    <slot />
  </div>
</template>
