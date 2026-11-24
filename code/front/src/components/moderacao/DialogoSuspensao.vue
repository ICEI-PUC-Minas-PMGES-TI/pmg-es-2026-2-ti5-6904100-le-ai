<script setup lang="ts">
import { PhArrowCounterClockwise, PhProhibit, PhWarning } from '@phosphor-icons/vue'
import { computed, useId } from 'vue'

import {
  LIMITE_DO_MOTIVO_DA_CONTA,
  useSuspensaoDeConta,
  type AcaoSobreConta,
  type OpcoesDaSuspensao,
} from '../../moderacao/useSuspensaoDeConta'
import type { ContaModerada } from '../../services/moderacao'
import BotaoTextual from '../ui/BotaoTextual.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'

/**
 * Dialog de suspensão e de reativação da conta (F-MOD-OPC), transcrito de
 * painel-de-moderacao.md §7, que o reaproveita da edição de `perfil-de-outro-leitor`. Motivo
 * obrigatório nos dois sentidos, até 500 caracteres; o foco entra no campo. Suspender é outline
 * `rubi`; reativar é o primário pill `musgo`. Montado com `v-if` por quem abre: cada abertura
 * começa sem texto, e `Esc` ou `Cancelar` descartam o motivo.
 */
const props = defineProps<{
  acao: AcaoSobreConta
  usuarioId: string
  /** Nome de exibição do autor, ou `@username` quando só ele é conhecido (registro). */
  nome: string
  servico?: OpcoesDaSuspensao['servico']
}>()
const emit = defineEmits<{ fechar: []; concluida: [conta: ContaModerada] }>()

const tela = useSuspensaoDeConta(props.acao, () => props.usuarioId, { servico: props.servico })
const { motivo, enviando, coldStart, falha, caracteres, excede, podeConfirmar } = tela

const idCampo = useId()
const numero = new Intl.NumberFormat('pt-BR')

const suspender = computed(() => props.acao === 'suspender')
/** `Sérgio deixa de conseguir entrar...`: o primeiro nome, como no design. */
const primeiroNome = computed(() => (props.nome.startsWith('@') ? props.nome : props.nome.split(' ')[0] ?? props.nome))

const titulo = computed(() =>
  suspender.value ? `Suspender a conta de ${props.nome}?` : `Reativar a conta de ${props.nome}?`,
)
const consequencia = computed(() =>
  suspender.value
    ? `${primeiroNome.value} deixa de conseguir entrar no Lê Ai, e o perfil, as resenhas, as atividades, os comentários e as listas dele ficam ocultos para os outros leitores. Nada é apagado, e a conta pode ser reativada depois.`
    : `${primeiroNome.value} volta a conseguir entrar, e o perfil e o conteúdo dele voltam a aparecer para os leitores, conforme a privacidade do perfil.`,
)
const naoConfirmada = computed(() =>
  suspender.value
    ? 'A suspensão não foi confirmada a tempo. A conta continua ativa. Tente de novo: se a suspensão já tiver acontecido, ela não é aplicada duas vezes.'
    : 'A reativação não foi confirmada a tempo. A conta continua suspensa. Tente de novo: se a reativação já tiver acontecido, ela não é aplicada duas vezes.',
)

// perfil-de-outro-leitor.md §9: a consequência descreve o dialog, e o confirmar desabilitado diz
// por que está indisponível (revisão de 06/11/2026).
const idConsequencia = `${idCampo}-consequencia`
const idIndisponivel = `${idCampo}-indisponivel`
const indisponivel = computed(() => !podeConfirmar.value && !enviando.value)
const motivoDaIndisponibilidade = computed(() =>
  excede.value ? 'Use até 500 caracteres para continuar.' : 'Escreva o motivo para continuar.',
)

function fechar(): void {
  if (!enviando.value) {
    emit('fechar')
  }
}

async function confirmar(): Promise<void> {
  const conta = await tela.confirmar()
  if (conta) {
    emit('concluida', conta)
  }
}
</script>

<template>
  <SobreposicaoModal
    :aberta="true"
    :rotulo="titulo"
    foco-inicial="textarea"
    :id-da-descricao="idConsequencia"
    @fechar="fechar"
  >
    <h2 class="text-title-sm text-tinta">
      {{ titulo }}
    </h2>
    <div
      aria-live="polite"
      class="contents"
    >
      <div
        v-if="falha"
        role="alert"
        class="mt-space-3 flex items-start gap-space-3 rounded-base bg-rubi-fundo p-space-4"
      >
        <PhWarning
          :size="20"
          weight="regular"
          class="mt-px shrink-0 text-rubi"
          aria-hidden="true"
        />
        <p class="text-body text-tinta">
          {{ falha.tipo === 'naoConfirmada' ? naoConfirmada : falha.mensagem }}
        </p>
      </div>
    </div>
    <p
      :id="idConsequencia"
      class="mt-space-3 text-body text-grafite"
    >
      {{ consequencia }}
    </p>

    <div class="mt-space-5 flex flex-col gap-space-2">
      <label
        :for="idCampo"
        class="text-label text-grafite"
      >{{ suspender ? 'Motivo da suspensão' : 'Motivo da reativação' }}</label>
      <textarea
        :id="idCampo"
        v-model="motivo"
        :disabled="enviando"
        :placeholder="suspender ? 'Por exemplo: ataques pessoais repetidos em comentários.' : 'Por exemplo: suspensão revista depois de nova análise.'"
        :aria-invalid="excede ? 'true' : undefined"
        :aria-describedby="`${idCampo}-ajuda ${idCampo}-contador`"
        class="field-sizing-content min-h-[96px] max-h-[160px] w-full resize-none rounded-base bg-papel-elevado p-space-3 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave disabled:text-grafite-suave"
        :class="excede ? 'border-[1.5px] border-rubi' : 'border border-linha focus:border-[1.5px] focus:border-musgo'"
      />
      <div class="flex items-start justify-between gap-space-4">
        <p
          :id="`${idCampo}-ajuda`"
          class="text-caption"
          :class="excede ? 'text-rubi' : 'text-grafite'"
        >
          {{ excede ? 'Use até 500 caracteres.' : `Fica no registro de auditoria. ${primeiroNome} não vê este texto.` }}
        </p>
        <p
          :id="`${idCampo}-contador`"
          class="shrink-0 text-caption tabular-nums"
          :class="excede ? 'text-rubi' : 'text-grafite'"
          :aria-live="excede ? 'polite' : 'off'"
        >
          {{ numero.format(caracteres) }} de {{ numero.format(LIMITE_DO_MOTIVO_DA_CONTA) }}
        </p>
      </div>
    </div>

    <p
      v-if="coldStart"
      class="mt-space-6 text-right text-caption text-grafite"
      role="status"
    >
      O serviço está iniciando. Isso pode levar alguns segundos.
    </p>
    <footer
      class="flex flex-col-reverse gap-space-3 md:flex-row md:items-center md:justify-end"
      :class="coldStart ? 'mt-space-3' : 'mt-space-6'"
    >
      <BotaoTextual
        class="h-12 w-full justify-center md:h-10 md:w-auto"
        tom="grafite"
        :disabled="enviando"
        @click="fechar"
      >
        Cancelar
      </BotaoTextual>
      <span
        :id="idIndisponivel"
        class="sr-only"
      >{{ motivoDaIndisponibilidade }}</span>
      <button
        v-if="suspender"
        type="button"
        data-confirmar
        :disabled="indisponivel"
        :aria-describedby="indisponivel ? idIndisponivel : undefined"
        :aria-busy="enviando ? 'true' : undefined"
        class="inline-flex h-12 w-full items-center justify-center gap-space-2 whitespace-nowrap rounded-base border border-rubi bg-transparent px-space-5 text-body-strong text-rubi transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo enabled:hover:bg-rubi-fundo disabled:cursor-not-allowed md:h-10 md:w-auto"
        :class="indisponivel ? 'opacity-40' : ''"
        @click="confirmar"
      >
        <PhProhibit
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        <span aria-live="polite">{{ enviando ? 'Suspendendo conta' : 'Suspender conta' }}</span>
      </button>
      <button
        v-else
        type="button"
        data-confirmar
        :disabled="indisponivel"
        :aria-describedby="indisponivel ? idIndisponivel : undefined"
        :aria-busy="enviando ? 'true' : undefined"
        class="inline-flex h-12 w-full items-center justify-center gap-space-2 whitespace-nowrap rounded-full bg-musgo px-space-5 text-body-strong text-papel transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:cursor-not-allowed md:h-10 md:w-auto"
        :class="indisponivel ? 'opacity-40' : ''"
        @click="confirmar"
      >
        <PhArrowCounterClockwise
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        <span aria-live="polite">{{ enviando ? 'Reativando conta' : 'Reativar conta' }}</span>
      </button>
    </footer>
  </SobreposicaoModal>
</template>
