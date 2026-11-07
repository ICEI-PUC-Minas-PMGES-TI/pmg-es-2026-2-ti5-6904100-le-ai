<script setup lang="ts">
import { PhArrowCounterClockwise, PhCaretRight, PhProhibit } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { dataComHora } from '../../moderacao/textos'
import { primeiroNome } from '../../perfil/textos'
import type { ContaDaModeracao } from '../../services/moderacao'
import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import ChipPrivacidade from '../perfil/ChipPrivacidade.vue'
import FaixaInformativa from '../ui/FaixaInformativa.vue'

/**
 * Visão do administrador de uma conta suspensa (F-MOD-OPC, perfil-de-outro-leitor.md §5.0 e
 * 5.5): o estado e a ação, sem conteúdo. Os dados continuam guardados, mas esta página não é um
 * caminho para lê-los. Sem `rubi`: a suspensão é estado da conta, não erro.
 */
const props = defineProps<{ conta: ContaDaModeracao }>()
defineEmits<{ reativar: [] }>()

const nome = computed(() => primeiroNome(props.conta.nomeExibicao))
const faixa = computed(() => {
  const quando = props.conta.suspensaEm ? ` em ${dataComHora(props.conta.suspensaEm)}` : ''
  return `Conta suspensa${quando}. ${nome.value} não consegue entrar, e o perfil e o conteúdo dele estão ocultos para os leitores. Nada foi apagado.`
})
</script>

<template>
  <div class="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-space-12">
    <section
      class="flex flex-col items-center text-center md:items-start md:text-left"
      :aria-label="`Conta de ${conta.nomeExibicao}`"
    >
      <AvatarLeitor
        class="md:hidden"
        :url="conta.avatarUrl"
        :nome="conta.nomeExibicao"
        :tamanho="96"
      />
      <AvatarLeitor
        class="hidden md:flex"
        :url="conta.avatarUrl"
        :nome="conta.nomeExibicao"
        :tamanho="120"
      />
      <h2 class="mt-space-4 text-display text-tinta md:text-title-lg">
        {{ conta.nomeExibicao }}
      </h2>
      <p class="mt-space-1 text-caption text-grafite-suave">
        @{{ conta.username }}
      </p>
      <ChipPrivacidade
        class="mt-space-3"
        :privacidade="conta.privacidade"
      />
      <span class="mt-space-3 inline-flex h-6 items-center gap-space-1 rounded-full border border-linha px-space-3 text-label text-grafite">
        <PhProhibit
          :size="16"
          weight="regular"
          aria-hidden="true"
        />
        Conta suspensa
      </span>
      <button
        type="button"
        data-reativar
        class="mt-space-6 inline-flex h-12 w-full items-center justify-center gap-space-2 rounded-base border border-linha text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-papel-elevado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
        @click="$emit('reativar')"
      >
        <PhArrowCounterClockwise
          :size="20"
          weight="regular"
          class="text-musgo"
          aria-hidden="true"
        />
        Reativar conta
      </button>
    </section>

    <section class="mt-space-8 min-w-0 md:mt-0">
      <FaixaInformativa>{{ faixa }}</FaixaInformativa>
      <template v-if="conta.motivo">
        <h3 class="mt-space-6 text-title-sm text-tinta">
          Motivo registrado
        </h3>
        <p class="mt-space-3 whitespace-pre-line break-words border-l-2 border-linha pl-space-4 text-body-lg text-tinta">
          {{ conta.motivo }}
        </p>
      </template>
      <RouterLink
        :to="{ name: 'moderacao', query: { aba: 'registro' } }"
        class="mt-space-4 inline-flex min-h-12 items-center gap-space-1 text-body-strong text-musgo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:min-h-10"
      >
        Ver no registro de auditoria
        <PhCaretRight
          :size="16"
          weight="regular"
          aria-hidden="true"
        />
      </RouterLink>
    </section>
  </div>
</template>
