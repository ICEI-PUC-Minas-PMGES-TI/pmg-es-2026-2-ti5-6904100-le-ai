<script setup lang="ts">
import { onMounted } from 'vue'

import { initializeSession } from './session'
import { initializeTheme } from './theme'

// initializeSession() também roda antes do mount em main.ts (session.ts precisa estar
// hidratado do localStorage antes da primeira resolução de rota, para a guarda não confundir
// "ainda não carreguei" com "sem sessão"). Chamar de novo aqui é redundante em produção — é
// idempotente — e é o que deixa um teste que só monta <App/> simular sessão já existente sem
// precisar replicar o bootstrap de main.ts.
onMounted(() => {
  initializeTheme()
  initializeSession()
})
</script>

<template>
  <RouterView />
</template>
