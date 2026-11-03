<script setup lang="ts">
import { PhClock, PhFlag, PhWarning, PhX } from '@phosphor-icons/vue'
import { computed, nextTick, ref, useId, watch } from 'vue'

import { LIMITE_DO_MOTIVO, useDenunciar, type AlvoDaDenuncia, type OpcoesDoDenunciar } from '../../moderacao/useDenunciar'
import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'
import TrechoDaDenuncia from './TrechoDaDenuncia.vue'

/**
 * Denúncia de resenha ou comentário (F-MOD, denunciar.md): bottom sheet abaixo de 768px e dialog de
 * 480px acima. Dois passos no mesmo painel, motivo e confirmação (RNF-USA-04), com o conteúdo
 * trocado em vez de abrir outro por cima; a confirmação de descarte e o estado de conteúdo
 * indisponível também trocam o conteúdo. A denúncia não esconde o conteúdo para quem denunciou.
 */
const props = defineProps<{ alvo: AlvoDaDenuncia; servico?: OpcoesDoDenunciar['servico'] }>()
const emit = defineEmits<{ fechar: []; enviada: [] }>()

const tela = useDenunciar(props.alvo, { servico: props.servico })
const { passo, motivo, erroDoMotivo, enviando, coldStart, falha, caracteres, excede } = tela

const idCampo = useId()
const campo = ref<HTMLTextAreaElement | null>(null)
const painel = ref<HTMLElement | null>(null)

const ehResenha = computed(() => props.alvo.tipo === 'resenha')
const titulo = computed(() => (ehResenha.value ? 'Denunciar resenha' : 'Denunciar comentário'))
const linhaDoCard = computed(() =>
  ehResenha.value ? `Resenha de ${props.alvo.livroTitulo}` : `Resposta em ${props.alvo.livroTitulo}`,
)
const consequencia = computed(() =>
  ehResenha.value
    ? `A resenha de ${props.alvo.autorNome} e o seu motivo vão para a moderação. Depois de enviada, a denúncia não pode ser desfeita.`
    : `O comentário de ${props.alvo.autorNome} e o seu motivo vão para a moderação. Depois de enviada, a denúncia não pode ser desfeita.`,
)
const numero = new Intl.NumberFormat('pt-BR')

function focar(seletor: string): void {
  void nextTick(() => painel.value?.querySelector<HTMLElement>(seletor)?.focus())
}

watch(passo, (atual) => {
  if (atual === 'confirmar') focar('[data-voltar]')
  else if (atual === 'descartar') focar('[data-continuar]')
  else if (atual === 'indisponivel') focar('[data-fechar-indisponivel]')
  else focar('textarea')
})

function revisar(): void {
  if (!tela.revisar()) {
    campo.value?.focus()
  }
}

function pedirFechar(): void {
  if (tela.pedirFechar()) {
    emit('fechar')
  }
}

async function enviar(): Promise<void> {
  if (await tela.enviar()) {
    emit('enviada')
  }
}
</script>

<template>
  <SobreposicaoModal
    :aberta="true"
    :rotulo="titulo"
    foco-inicial="[data-fechar]"
    @fechar="pedirFechar"
  >
    <div
      ref="painel"
      class="max-h-[calc(88dvh-4rem)] overflow-y-auto md:max-h-[712px]"
    >
      <!-- Passo 1: motivo (denunciar.md §4 e §5). -->
      <div
        v-if="passo === 'motivo'"
        class="flex flex-col"
      >
        <header class="flex items-center justify-between gap-space-4">
          <h2 class="text-title text-tinta">
            {{ titulo }}
          </h2>
          <button
            type="button"
            data-fechar
            class="-mr-space-3 flex size-12 cursor-pointer items-center justify-center rounded-full text-tinta hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:size-10 md:text-grafite"
            aria-label="Fechar"
            @click="pedirFechar"
          >
            <PhX
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
          </button>
        </header>

        <div class="mt-space-4 rounded-md bg-papel-elevado p-space-4 dark:bg-papel">
          <div class="flex items-center gap-space-3">
            <AvatarLeitor
              :url="alvo.autorAvatarUrl"
              :nome="alvo.autorNome"
              :tamanho="32"
            />
            <div class="min-w-0">
              <p class="truncate text-body-strong text-tinta">
                {{ alvo.autorNome }}
              </p>
              <p class="truncate text-caption text-grafite">
                {{ linhaDoCard }}
              </p>
            </div>
          </div>
          <p
            v-if="ehResenha && alvo.spoiler"
            class="mt-space-3 text-body text-grafite"
          >
            Resenha com spoiler. O texto fica oculto aqui.
          </p>
          <TrechoDaDenuncia
            v-else-if="ehResenha"
            class="mt-space-3"
            :texto="alvo.texto"
          />
          <p
            v-else
            class="mt-space-3 line-clamp-3 break-words text-body text-tinta"
          >
            {{ alvo.texto }}
          </p>
        </div>

        <div class="mt-space-6 flex flex-col gap-space-2">
          <label
            :for="idCampo"
            class="text-label text-grafite"
          >Motivo da denúncia</label>
          <textarea
            :id="idCampo"
            ref="campo"
            v-model="motivo"
            placeholder="Por exemplo: conta o final sem aviso de spoiler"
            :aria-invalid="erroDoMotivo ? 'true' : undefined"
            :aria-describedby="`${idCampo}-ajuda ${idCampo}-contador`"
            class="field-sizing-content min-h-[120px] max-h-[168px] w-full resize-none rounded-base bg-papel-elevado px-space-4 py-space-3 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave"
            :class="erroDoMotivo ? 'border-[1.5px] border-rubi' : 'border border-linha focus:border-[1.5px] focus:border-musgo'"
            @input="erroDoMotivo = null"
          />
          <div class="flex items-start justify-between gap-space-4">
            <p
              :id="`${idCampo}-ajuda`"
              class="text-caption"
              :class="erroDoMotivo ? 'text-rubi' : 'text-grafite'"
            >
              {{ erroDoMotivo ?? 'Obrigatório. Conte o que há de errado com as suas palavras.' }}
            </p>
            <p
              :id="`${idCampo}-contador`"
              class="shrink-0 text-caption"
              :class="excede ? 'text-rubi' : 'text-grafite'"
            >
              <span class="font-mono tabular-nums">{{ numero.format(caracteres) }}</span> de
              <span class="font-mono tabular-nums">{{ numero.format(LIMITE_DO_MOTIVO) }}</span> caracteres
            </p>
          </div>
        </div>

        <footer class="mt-space-6 flex items-center justify-end gap-space-3">
          <div class="hidden md:block">
            <BotaoTextual
              class="h-10"
              tom="grafite"
              @click="pedirFechar"
            >
              Cancelar
            </BotaoTextual>
          </div>
          <BotaoPrimario
            class="h-12 md:h-10 md:w-auto"
            @click="revisar"
          >
            Revisar denúncia
          </BotaoPrimario>
        </footer>
      </div>

      <!-- Passo 2: confirmação, com o motivo repetido para conferência. -->
      <div
        v-else-if="passo === 'confirmar'"
        class="entrada flex flex-col"
      >
        <h2 class="text-title-sm text-tinta">
          Enviar esta denúncia?
        </h2>
        <p class="mt-space-3 text-body text-grafite">
          {{ consequencia }}
        </p>
        <div
          v-if="falha"
          role="alert"
          class="mt-space-4 flex items-start gap-space-3 rounded-base p-space-4 text-body text-tinta"
          :class="falha === 'conexao' ? 'bg-rubi-fundo' : 'bg-ambar-fundo'"
        >
          <component
            :is="falha === 'conexao' ? PhWarning : PhClock"
            :size="20"
            weight="regular"
            class="mt-px shrink-0"
            :class="falha === 'conexao' ? 'text-rubi' : 'text-tinta'"
            aria-hidden="true"
          />
          <p v-if="falha === 'conexao'">
            Não foi possível enviar a denúncia. Verifique sua conexão e tente de novo.
          </p>
          <p v-else>
            Você enviou muitas denúncias em pouco tempo. Espere alguns minutos e tente de novo.
          </p>
        </div>
        <div class="mt-space-4 border-l-2 border-linha pl-space-4">
          <p class="text-label text-grafite">
            Seu motivo
          </p>
          <p class="mt-space-1 whitespace-pre-line break-words text-body text-tinta">
            {{ motivo.trim() }}
          </p>
        </div>
        <footer class="mt-space-6 flex flex-col-reverse gap-space-3 md:flex-row md:items-center md:justify-end">
          <BotaoTextual
            data-voltar
            class="h-12 w-full md:h-10 md:w-auto"
            tom="grafite"
            :disabled="enviando"
            @click="tela.voltarAoMotivo()"
          >
            Voltar ao motivo
          </BotaoTextual>
          <button
            type="button"
            :aria-busy="enviando ? 'true' : undefined"
            class="inline-flex h-12 w-full items-center justify-center gap-space-2 whitespace-nowrap rounded-base border border-rubi bg-transparent px-space-5 text-body-strong text-rubi transition-colors duration-dur-fast hover:bg-rubi-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10 md:w-auto"
            @click="enviar"
          >
            <PhFlag
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
            <span aria-live="polite">{{ enviando ? 'Enviando denúncia' : 'Enviar denúncia' }}</span>
          </button>
        </footer>
        <p
          v-if="coldStart"
          class="mt-space-3 text-center text-caption text-grafite"
          role="status"
        >
          O serviço está iniciando. Isso pode levar alguns segundos.
        </p>
      </div>

      <!-- Conteúdo indisponível: o servidor recusou por falta de acesso (denunciar.md §4.9). -->
      <div
        v-else-if="passo === 'indisponivel'"
        class="entrada flex flex-col"
      >
        <h2 class="text-title-sm text-tinta">
          {{ ehResenha ? 'Esta resenha não está mais disponível' : 'Este comentário não está mais disponível' }}
        </h2>
        <p class="mt-space-3 text-body text-grafite">
          {{
            ehResenha
              ? 'Ela pode ter sido excluída, ou o perfil de quem a escreveu mudou a privacidade. Não há o que denunciar.'
              : 'Ele pode ter sido excluído, ou a atividade deixou de estar visível para você. Não há o que denunciar.'
          }}
        </p>
        <button
          type="button"
          data-fechar-indisponivel
          class="mt-space-6 inline-flex h-12 w-full items-center justify-center rounded-base border border-linha text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-papel-elevado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
          @click="emit('fechar')"
        >
          Fechar
        </button>
      </div>

      <!-- Descartar a denúncia? (denunciar.md §4.10). -->
      <div
        v-else
        class="entrada flex flex-col"
      >
        <h2 class="text-title-sm text-tinta">
          Descartar esta denúncia?
        </h2>
        <p class="mt-space-3 text-body text-grafite">
          O motivo que você escreveu não será guardado. Nada vai para a moderação.
        </p>
        <footer class="mt-space-6 flex flex-col-reverse gap-space-3 md:flex-row md:items-center md:justify-end">
          <BotaoTextual
            data-continuar
            class="h-12 w-full md:h-10 md:w-auto"
            tom="grafite"
            @click="tela.continuarEscrevendo()"
          >
            Continuar escrevendo
          </BotaoTextual>
          <button
            type="button"
            class="inline-flex h-12 w-full items-center justify-center whitespace-nowrap rounded-base border border-rubi bg-transparent px-space-5 text-body-strong text-rubi transition-colors duration-dur-fast hover:bg-rubi-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10 md:w-auto"
            @click="emit('fechar')"
          >
            Descartar
          </button>
        </footer>
      </div>
    </div>
  </SobreposicaoModal>
</template>

<style scoped>
.entrada {
  animation: surgir var(--duration-base) var(--easing-in-out);
}

@keyframes surgir {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .entrada {
    animation: none;
  }
}
</style>
