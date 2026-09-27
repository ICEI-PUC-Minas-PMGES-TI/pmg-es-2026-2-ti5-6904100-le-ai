<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { computed, ref, watch } from 'vue'

import { formatarNota } from '../../livros/formatos'
import type { LivroAvaliado, MinhaAvaliacaoDoLivro } from '../../livros/useMinhaAvaliacao'
import BotaoDestrutivo from '../ui/BotaoDestrutivo.vue'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'
import CapaLivro from './CapaLivro.vue'
import SeletorDeNota from './SeletorDeNota.vue'

/**
 * Painel de dar nota (avaliar-livro.md, a partir do `.html`): bottom sheet abaixo de 768px e
 * dialog de 460px na web.
 *
 * Remover passa por confirmação (RNF-USA-04). A confirmação **troca o conteúdo do mesmo modal**,
 * em vez de abrir um segundo por cima: dois modais disputariam o foco, e o design diz que o painel
 * "dá lugar" ao diálogo (§4.5). `Cancelar` volta ao painel.
 */
const props = withDefaults(
  defineProps<{
    aberta: boolean
    livro: LivroAvaliado
    avaliacao: MinhaAvaliacaoDoLivro
    /** Mostra `Escrever resenha` (§4 e §5). O editor não abre dentro de outro editor. */
    comEscreverResenha?: boolean
  }>(),
  { comEscreverResenha: false },
)

const emit = defineEmits<{ fechar: []; 'escrever-resenha': [] }>()

const ERRO_AO_SALVAR = 'Não foi possível salvar sua nota. Verifique sua conexão e tente de novo.'
const ERRO_AO_REMOVER = 'Não foi possível remover sua nota. Verifique sua conexão e tente de novo.'

const salva = computed(() => props.avaliacao.nota.value?.valor ?? null)

const escolhido = ref<number | null>(null)
const previa = ref<number | null>(null)
const salvando = ref(false)
const removendo = ref(false)
const confirmando = ref(false)
const erro = ref<string | null>(null)

// Cada abertura começa do valor salvo, sem erro nem confirmação pendente.
watch(
  () => props.aberta,
  (aberta) => {
    if (aberta) {
      escolhido.value = salva.value
      previa.value = null
      confirmando.value = false
      erro.value = null
    }
  },
  { immediate: true },
)

const zeroSalvo = computed(() => escolhido.value === 0 && salva.value === 0)

async function salvar(): Promise<void> {
  if (escolhido.value === null) {
    return
  }
  salvando.value = true
  erro.value = null
  try {
    await props.avaliacao.salvarNota(escolhido.value)
    emit('fechar')
  } catch {
    erro.value = ERRO_AO_SALVAR
  } finally {
    salvando.value = false
  }
}

/**
 * `Escrever resenha` salva a nota escolhida no caminho (§4). Se o salvamento falhar, o painel
 * fica aberto com o erro e o editor não abre; sem mudança na nota, abre direto.
 */
async function escreverResenha(): Promise<void> {
  if (escolhido.value !== null && escolhido.value !== salva.value) {
    salvando.value = true
    erro.value = null
    try {
      await props.avaliacao.salvarNota(escolhido.value)
    } catch {
      erro.value = ERRO_AO_SALVAR
      return
    } finally {
      salvando.value = false
    }
  }
  emit('escrever-resenha')
}

async function remover(): Promise<void> {
  removendo.value = true
  erro.value = null
  try {
    await props.avaliacao.removerNota()
    emit('fechar')
  } catch {
    confirmando.value = false
    erro.value = ERRO_AO_REMOVER
  } finally {
    removendo.value = false
  }
}

function fechar(): void {
  if (salvando.value || removendo.value) {
    return
  }
  if (confirmando.value) {
    confirmando.value = false
    return
  }
  emit('fechar')
}
</script>

<template>
  <SobreposicaoModal
    :aberta="aberta"
    :rotulo="confirmando ? 'Remover sua nota?' : 'Avaliar livro'"
    :compacto="confirmando"
    :largura-dialogo="confirmando ? '400px' : '460px'"
    :foco-inicial="confirmando ? '[data-cancelar]' : '[role=slider]'"
    @fechar="fechar"
  >
    <template v-if="!confirmando">
      <div class="relative">
        <button
          type="button"
          class="absolute -right-space-2 -top-space-2 hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full text-grafite md:flex md:hover:bg-linha"
          aria-label="Fechar"
          @click="fechar"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
        <div class="flex items-center gap-space-4 pr-space-8">
          <CapaLivro
            class="h-[90px] w-[60px] shrink-0 md:h-[108px] md:w-[72px]"
            :url="livro.capaUrl"
            :titulo="livro.titulo"
            :autor="livro.autor ?? undefined"
            :rotulo="`Capa de ${livro.titulo}`"
          />
          <div class="min-w-0">
            <p class="line-clamp-2 text-title-sm text-tinta">
              {{ livro.titulo }}
            </p>
            <p
              v-if="livro.autor"
              class="text-caption text-grafite"
            >
              {{ livro.autor }}
            </p>
          </div>
        </div>
      </div>

      <hr class="my-space-4 border-linha">

      <div class="flex flex-col items-center py-space-8">
        <SeletorDeNota
          v-model="escolhido"
          :desabilitado="salvando"
          @previa="previa = $event"
        />
        <p
          class="mt-space-4"
          aria-live="polite"
        >
          <span
            v-if="previa !== null"
            class="font-mono text-num-display tabular-nums text-grafite-suave"
          >{{ formatarNota(previa) }}</span>
          <span
            v-else-if="escolhido === null"
            class="text-body text-grafite-suave"
          >Sem nota</span>
          <span
            v-else
            class="font-mono text-num-display tabular-nums text-tinta"
          >{{ formatarNota(escolhido) }}</span>
        </p>
        <p
          v-if="previa === null"
          class="mt-space-2 text-caption text-grafite"
        >
          {{ zeroSalvo ? 'Você deu nota 0 a este livro.' : 'de 0 a 5, com meia estrela' }}
        </p>
      </div>

      <div class="flex flex-col gap-space-2 md:flex-row-reverse md:items-center md:gap-space-4">
        <BotaoPrimario
          class="w-full md:w-auto md:px-space-5"
          :disabled="escolhido === null"
          :carregando="salvando"
          @click="salvar"
        >
          {{ salvando ? 'Salvando' : 'Salvar nota' }}
        </BotaoPrimario>
        <BotaoTextual
          v-if="comEscreverResenha"
          class="h-12 w-full justify-center md:h-10 md:w-auto"
          :disabled="salvando"
          @click="escreverResenha"
        >
          Escrever resenha
        </BotaoTextual>
        <BotaoTextual
          v-if="salva !== null"
          class="h-12 w-full justify-center md:mr-auto md:h-10 md:w-auto"
          tom="rubi"
          :disabled="salvando"
          @click="confirmando = true"
        >
          Remover nota
        </BotaoTextual>
      </div>
      <p
        v-if="erro"
        role="alert"
        class="mt-space-2 text-caption text-rubi"
      >
        {{ erro }}
      </p>
    </template>

    <template v-else>
      <h2 class="text-title text-tinta">
        Remover sua nota?
      </h2>
      <p class="mt-space-3 text-body text-grafite">
        O livro volta a ficar sem nota sua. Sua resenha, se houver, continua publicada.
      </p>
      <div class="mt-space-6 flex flex-col-reverse gap-space-3 md:flex-row md:items-center md:justify-end md:gap-space-4">
        <BotaoTextual
          data-cancelar
          class="h-12 w-full justify-center md:h-10 md:w-auto"
          tom="grafite"
          :disabled="removendo"
          @click="confirmando = false"
        >
          Cancelar
        </BotaoTextual>
        <BotaoDestrutivo
          class="h-12 w-full md:h-10 md:w-auto"
          :carregando="removendo"
          @click="remover"
        >
          Remover nota
        </BotaoDestrutivo>
      </div>
    </template>
  </SobreposicaoModal>
</template>
