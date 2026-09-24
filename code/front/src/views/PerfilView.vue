<script setup lang="ts">
import { PhGear } from '@phosphor-icons/vue'
import { RouterLink } from 'vue-router'

import { useSession } from '../session'

/**
 * Placeholder (P0-NAV): conteúdo real entra com F-PERFIL no Período 1. Mostra o nome de quem
 * está na sessão, a prova visual de que cadastro, login, sessão e guarda chegam inteiros até
 * aqui. A engrenagem do header leva às configurações de F-AUT (configuracoes.md §1), onde fica
 * a saída da conta.
 */
const { usuario } = useSession()
</script>

<template>
  <p class="py-space-8 text-body text-grafite">
    <template v-if="usuario">
      Perfil de <span class="text-body-strong text-tinta">{{ usuario.displayName }}</span> aparece aqui.
    </template>
    <template v-else>
      Seu perfil aparece aqui.
    </template>
  </p>

  <Teleport
    to="#cabecalho-acoes"
    defer
  >
    <RouterLink
      to="/perfil/configuracoes"
      class="-mr-space-3 flex size-12 items-center justify-center rounded-base text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
      aria-label="Configurações"
    >
      <PhGear
        :size="24"
        weight="regular"
        aria-hidden="true"
      />
    </RouterLink>
  </Teleport>
</template>
