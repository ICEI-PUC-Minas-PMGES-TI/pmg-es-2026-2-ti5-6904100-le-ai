<script setup lang="ts">
import { PhCalendarX } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import EstadoTerminal from '../../components/ui/EstadoTerminal.vue'
import LogoLeAi from '../../components/ui/LogoLeAi.vue'
import { dataPorExtenso } from '../../contaEmExclusao'
import LayoutAutenticacao from '../../layouts/LayoutAutenticacao.vue'

/**
 * Exclusão solicitada (F-CONTA-2, excluir-conta.md §4.8 e §5.4). Fora do shell: a sessão já
 * acabou. A data vem na query (`?ate=`), que é a que o servidor devolveu no `202`, e sobrevive a
 * um recarregar. Sem ela, a tela fala do prazo sem data, em vez de inventar uma.
 */

const route = useRoute()
const router = useRouter()

const data = computed(() => {
  const ate = route.query.ate
  if (typeof ate !== 'string' || Number.isNaN(Date.parse(ate))) {
    return null
  }
  return dataPorExtenso(ate)
})

function irParaOLogin(): void {
  void router.replace('/login')
}
</script>

<template>
  <LayoutAutenticacao somente-marca>
    <div class="md:hidden">
      <LogoLeAi :altura="24" />
    </div>
    <EstadoTerminal
      class="mt-space-16 md:mt-0"
      :icone="PhCalendarX"
      tom="grafite"
      titulo="Exclusão solicitada"
      acoes-a-esquerda-na-web
    >
      <p>Sua conta já está oculta para os outros leitores e você saiu de todos os aparelhos.</p>
      <div class="rounded-md bg-papel-elevado p-space-5">
        <p class="text-label text-grafite">
          Remoção definitiva em
        </p>
        <p class="mt-space-2 text-title text-tinta">
          {{ data ?? 'daqui a 30 dias' }}
        </p>
        <p class="mt-space-2 text-caption text-grafite">
          Até essa data, entre com seu e-mail e senha para cancelar a exclusão.
        </p>
      </div>
      <template #acoes>
        <BotaoPrimario @click="irParaOLogin">
          Ir para o login
        </BotaoPrimario>
      </template>
    </EstadoTerminal>
  </LayoutAutenticacao>
</template>
