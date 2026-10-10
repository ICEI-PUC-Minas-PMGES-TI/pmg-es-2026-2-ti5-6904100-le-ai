<script setup lang="ts">
import { PhWarning, PhX } from '@phosphor-icons/vue'
import { computed, nextTick, ref, useId, watch } from 'vue'

import {
  contarCaracteres,
  erroDaPagina,
  erroDoTrecho,
  LIMITE_DO_TRECHO,
  linhaDaCota,
  TEXTOS_DAS_FRASES as T,
} from '../../livros/frases'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { leituraService, type Frase, type LeituraService } from '../../services/leitura'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import CampoTexto from '../ui/CampoTexto.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'
import CapaLivro from './CapaLivro.vue'

export interface LivroDaFrase {
  id: string
  titulo: string
  autor: string | null
  capaUrl: string | null
  paginas: number
}

/**
 * Formulário de nova frase (adicionar-frase.md): sheet no celular e dialog de 480px na web, pela
 * `SobreposicaoModal`. Trecho de até 500 caracteres e página obrigatória (RN-11), validados ao
 * tocar em `Salvar frase`; o botão nunca trava, porque travar esconderia o motivo.
 *
 * O trecho é texto puro em Manrope, e o contador (`63/500`) conta code points, como o servidor;
 * passa a `rubi` acima de 500 e nunca corta o texto. A mesma chave de idempotência vale enquanto
 * trecho e página não mudam, então reenviar depois de uma falha não cria uma segunda frase.
 *
 * Com o trecho preenchido, fechar pede o descarte no próprio dialog. Se o servidor recusar pela
 * cota de 10, os campos travam e as ações viram `Ver minhas frases` e `Fechar`.
 */
const props = withDefaults(
  defineProps<{
    aberta: boolean
    livro: LivroDaFrase
    minhasFrases: number
    limite?: number
    servico?: Pick<LeituraService, 'criarFrase'>
  }>(),
  { limite: 10, servico: undefined },
)

const emit = defineEmits<{ salva: [frase: Frase]; fechar: []; verMinhas: [] }>()

const servico = computed(() => props.servico ?? leituraService)

type Etapa = 'formulario' | 'descarte' | 'limite'
const etapa = ref<Etapa>('formulario')
const trecho = ref('')
const pagina = ref('')
const tentou = ref(false)
const salvando = ref(false)
const erroEnvio = ref<string | null>(null)
const erroServidor = ref<{ texto?: string; pagina?: string }>({})
let chave: { corpo: string; valor: string } | null = null

const idTrecho = useId()
const total = computed(() => contarCaracteres(trecho.value))
const erroTrecho = computed(() => erroServidor.value.texto ?? (tentou.value ? erroDoTrecho(trecho.value) : null))
const erroPagina = computed(
  () => erroServidor.value.pagina ?? (tentou.value ? erroDaPagina(pagina.value, props.livro.paginas) : null),
)

watch(
  () => props.aberta,
  (aberta) => {
    if (aberta) {
      etapa.value = 'formulario'
      trecho.value = ''
      pagina.value = ''
      tentou.value = false
      erroEnvio.value = null
      erroServidor.value = {}
      chave = null
    }
  },
  { immediate: true },
)

watch([trecho, pagina], () => {
  erroServidor.value = {}
  erroEnvio.value = null
})

function chaveDaIntencao(corpo: string): string {
  if (chave?.corpo !== corpo) {
    chave = { corpo, valor: novaChaveIdempotencia() }
  }
  return chave.valor
}

async function salvar(): Promise<void> {
  if (salvando.value || etapa.value !== 'formulario') return
  tentou.value = true
  if (erroDoTrecho(trecho.value) || erroDaPagina(pagina.value, props.livro.paginas)) {
    await nextTick()
    const primeiro = erroDoTrecho(trecho.value) ? `#${idTrecho}` : '[data-campo="pagina"] input'
    document.querySelector<HTMLElement>(primeiro)?.focus()
    return
  }
  const entrada = { texto: trecho.value, pagina: Number(pagina.value) }
  salvando.value = true
  erroEnvio.value = null
  try {
    const frase = await servico.value.criarFrase(props.livro.id, entrada, chaveDaIntencao(JSON.stringify(entrada)))
    chave = null
    emit('salva', frase)
  } catch (erro) {
    if (erro instanceof ApiError && erro.code === 'LIMITE_DE_FRASES') {
      etapa.value = 'limite'
    } else if (erro instanceof ApiError && erro.status === 422 && erro.campos) {
      erroServidor.value = { texto: erro.campos.texto, pagina: erro.campos.pagina }
    } else {
      erroEnvio.value = T.erroEnvio
    }
  } finally {
    salvando.value = false
  }
}

/** `Cancelar`, `X`, `Esc` e scrim: com trecho escrito, pergunta antes; sem ele, só fecha. */
function pedirFechar(): void {
  if (salvando.value) return
  if (etapa.value === 'formulario' && trecho.value.trim() !== '') {
    etapa.value = 'descarte'
    return
  }
  emit('fechar')
}

function teclaNoTrecho(evento: KeyboardEvent): void {
  if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
    evento.preventDefault()
    void salvar()
  }
}
</script>

<template>
  <SobreposicaoModal
    :aberta="aberta"
    :rotulo="etapa === 'descarte' ? T.descartarTitulo : T.adicionar"
    :foco-inicial="etapa === 'descarte' ? '[data-continuar]' : 'textarea'"
    @fechar="pedirFechar"
  >
    <div
      v-if="etapa === 'descarte'"
      class="flex flex-col"
    >
      <h2 class="text-title-sm text-tinta">
        {{ T.descartarTitulo }}
      </h2>
      <p class="mt-space-3 text-body text-grafite">
        {{ T.naoSeraGuardado }}
      </p>
      <div class="mt-space-6 flex flex-col gap-space-3 md:flex-row-reverse md:justify-start">
        <button
          type="button"
          class="h-12 w-full rounded-base border border-rubi text-body-strong text-rubi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10 md:w-auto md:px-space-5"
          @click="emit('fechar')"
        >
          {{ T.descartar }}
        </button>
        <BotaoTextual
          data-continuar
          class="h-12 w-full justify-center md:h-10 md:w-auto"
          @click="etapa = 'formulario'"
        >
          {{ T.continuar }}
        </BotaoTextual>
      </div>
    </div>

    <form
      v-else
      class="flex flex-col"
      novalidate
      @submit.prevent="salvar"
    >
      <div class="flex items-start justify-between gap-space-4">
        <h2 class="text-title md:text-title-lg text-tinta">
          {{ T.adicionar }}
        </h2>
        <button
          type="button"
          class="-mr-space-2 -mt-space-2 hidden size-10 items-center justify-center rounded-base text-grafite hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:flex"
          :aria-label="T.fechar"
          :disabled="salvando"
          @click="pedirFechar"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="mt-space-4 flex items-start gap-space-4 border-b border-linha pb-space-5">
        <CapaLivro
          class="h-[72px] w-12"
          :url="livro.capaUrl"
          :rotulo="`Capa de ${livro.titulo}`"
          :titulo="livro.titulo"
          :autor="livro.autor"
          :icone="false"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-space-1">
          <p class="line-clamp-2 text-title-sm text-tinta">
            {{ livro.titulo }}
          </p>
          <p
            v-if="livro.autor"
            class="text-caption text-grafite"
          >
            {{ livro.autor }}
          </p>
          <p class="text-caption text-grafite">
            {{ linhaDaCota(minhasFrases, limite, true) }}
          </p>
        </div>
      </div>

      <div class="mt-space-5 flex flex-col gap-space-2">
        <label
          :for="idTrecho"
          class="text-label text-grafite"
        >{{ T.rotuloTrecho }}</label>
        <textarea
          :id="idTrecho"
          v-model="trecho"
          :placeholder="T.placeholderTrecho"
          :disabled="salvando || etapa === 'limite'"
          :aria-invalid="erroTrecho ? 'true' : undefined"
          :aria-describedby="`${idTrecho}-ajuda ${idTrecho}-contador`"
          class="field-sizing-content min-h-[132px] max-h-[264px] w-full resize-none rounded-base bg-papel-elevado px-space-4 py-space-3 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave disabled:cursor-not-allowed disabled:bg-linha disabled:text-grafite-suave"
          :class="erroTrecho ? 'border-[1.5px] border-rubi' : 'border border-linha focus:border-[1.5px] focus:border-musgo'"
          @keydown="teclaNoTrecho"
        />
        <div class="flex items-start justify-between gap-space-4">
          <p
            :id="`${idTrecho}-ajuda`"
            class="text-caption"
            :class="erroTrecho ? 'text-rubi' : 'text-grafite'"
          >
            {{ erroTrecho ?? T.ajudaTrecho }}
          </p>
          <p
            :id="`${idTrecho}-contador`"
            data-contador
            class="shrink-0 font-mono text-caption tabular-nums"
            :class="total > LIMITE_DO_TRECHO ? 'text-rubi' : 'text-grafite'"
          >
            {{ total }}/{{ LIMITE_DO_TRECHO }}
          </p>
        </div>
      </div>

      <CampoTexto
        v-model="pagina"
        data-campo="pagina"
        class="mt-space-5 w-40"
        :label="T.rotuloPagina"
        inputmode="numeric"
        mono
        :helper="erroPagina ? undefined : T.ajudaPagina(livro.paginas)"
        :erro="erroPagina ?? undefined"
        :disabled="salvando || etapa === 'limite'"
      />

      <div
        v-if="etapa === 'limite'"
        role="alert"
        class="mt-space-5 flex items-start gap-space-3 rounded-base bg-rubi-fundo p-space-4"
      >
        <PhWarning
          :size="20"
          weight="regular"
          class="shrink-0 text-rubi"
          aria-hidden="true"
        />
        <p class="text-body text-tinta">
          {{ T.limiteNoEnvio }}
        </p>
      </div>

      <div
        v-if="etapa === 'limite'"
        class="mt-space-6 flex flex-col gap-space-3 md:flex-row-reverse md:items-center md:justify-start md:gap-space-4"
      >
        <button
          type="button"
          class="h-12 w-full rounded-base border border-linha text-body-strong text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10 md:w-auto md:px-space-5"
          @click="emit('verMinhas')"
        >
          {{ T.verMinhas }}
        </button>
        <BotaoTextual
          class="h-12 w-full justify-center md:h-10 md:w-auto"
          @click="emit('fechar')"
        >
          {{ T.fechar }}
        </BotaoTextual>
      </div>
      <div
        v-else
        class="mt-space-6 flex flex-col gap-space-2 md:flex-row-reverse md:items-center md:justify-start md:gap-space-4"
      >
        <BotaoPrimario
          tipo="submit"
          class="h-12 md:h-10 md:w-auto"
          :disabled="salvando"
        >
          {{ salvando ? T.salvando : T.salvar }}
        </BotaoPrimario>
        <BotaoTextual
          class="h-12 w-full justify-center md:h-10 md:w-auto"
          :disabled="salvando"
          @click="pedirFechar"
        >
          {{ T.cancelar }}
        </BotaoTextual>
      </div>
      <p
        v-if="etapa === 'limite'"
        class="mt-space-3 text-caption text-grafite"
      >
        {{ T.naoSeraGuardado }}
      </p>
      <p
        v-if="erroEnvio"
        role="alert"
        class="mt-space-3 flex items-center gap-space-2 text-caption text-rubi"
      >
        <PhWarning
          :size="16"
          weight="regular"
          aria-hidden="true"
        />
        {{ erroEnvio }}
      </p>
    </form>
  </SobreposicaoModal>
</template>
