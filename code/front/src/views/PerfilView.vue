<script setup lang="ts">
import { useSession } from '../session'

/**
 * Placeholder (P0-NAV): conteúdo real entra com F-PERFIL no Período 1. Mostra o nome de quem
 * está na sessão — não é feature, é a prova visual de que cadastro/login/sessão/guarda chegam
 * inteiros até aqui. Sem botão de sair: F-AUT ainda não tem logout com invalidação de refresh
 * (fronteira da feature); verificação manual é limpar o localStorage, como o plano documenta.
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
</template>
