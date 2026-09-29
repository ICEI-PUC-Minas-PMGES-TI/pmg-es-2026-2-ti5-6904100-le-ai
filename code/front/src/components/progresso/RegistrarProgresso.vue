<script setup lang="ts">
import { PhCalculator, PhX } from '@phosphor-icons/vue'
import { computed, ref, watch } from 'vue'

import { ROTULO_FECHAR } from '../../estante/textos'
import { paginasLidasDerivadas, validarPagina, validarTempo } from '../../progresso/regras'
import { rotuloPaginaDeTotal, TEXTOS_DO_REGISTRO } from '../../progresso/textos'
import { useRegistroProgresso } from '../../progresso/useRegistroProgresso'
import type { ProgressoComResumo } from '../../services/leitura'
import CapaLivro from '../livros/CapaLivro.vue'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import CampoTexto from '../ui/CampoTexto.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'

export interface LeituraDoRegistro {
  leituraId: string
  titulo: string
  autor?: string | null
  capaUrl?: string | null
  paginaAtual: number
  totalPaginas: number
}

const props = defineProps<{
  aberta: boolean
  leitura: LeituraDoRegistro
}>()

const emit = defineEmits<{ salvo: [resultado: ProgressoComResumo]; fechar: [] }>()

const { salvando, erro, erroDoCampo, registrar, limparErro } = useRegistroProgresso()

const pagina = ref('')
const horas = ref('')
const minutos = ref('')
const erroPagina = ref<string | null>(null)
const erroTempo = ref<string | null>(null)

const paginaBase = computed(() => props.leitura.paginaAtual)
const ajudaPagina = computed(() => TEXTOS_DO_REGISTRO.ajudaPagina(paginaBase.value + 1, props.leitura.totalPaginas))

function numero(texto: string): number {
  return texto.trim() === '' ? Number.NaN : Number(texto)
}

function numeroOuZero(texto: string): number {
  return texto.trim() === '' ? 0 : Number(texto)
}

const derivado = computed(() => {
  const valor = numero(pagina.value)
  if (valor > props.leitura.totalPaginas) return null
  return paginasLidasDerivadas(paginaBase.value, valor)
})

const mensagemPagina = computed(() => erroPagina.value ?? erroDoCampo.value.pagina)
const mensagemTempo = computed(() => erroTempo.value ?? erroDoCampo.value.minutos)

function preencher(): void {
  limparErro()
  erroPagina.value = null
  erroTempo.value = null
  pagina.value = ''
  horas.value = ''
  minutos.value = ''
}

watch(
  () => props.aberta,
  (aberta) => {
    if (aberta) preencher()
  },
  { immediate: true },
)

watch(pagina, () => {
  erroPagina.value = null
})

watch([horas, minutos], () => {
  erroTempo.value = null
})

async function salvar(): Promise<void> {
  const valorPagina = numero(pagina.value)
  const tempo = validarTempo(numeroOuZero(horas.value), numeroOuZero(minutos.value))
  erroPagina.value = validarPagina(paginaBase.value, props.leitura.totalPaginas, valorPagina)
  erroTempo.value = tempo.erro
  if (erroPagina.value || tempo.minutos === null) return
  const tempoVazio = horas.value.trim() === '' && minutos.value.trim() === ''
  const resultado = await registrar(props.leitura.leituraId, {
    pagina: valorPagina,
    ...(tempoVazio ? {} : { minutos: tempo.minutos }),
  })
  if (resultado) emit('salvo', resultado)
}

function fechar(): void {
  if (!salvando.value) emit('fechar')
}
</script>

<template>
  <SobreposicaoModal
    :aberta="aberta"
    :rotulo="TEXTOS_DO_REGISTRO.titulo"
    foco-inicial="input"
    @fechar="fechar"
  >
    <form
      class="flex flex-col"
      novalidate
      @submit.prevent="salvar"
    >
      <div class="flex items-start justify-between gap-space-4">
        <h2 class="text-title text-tinta">
          {{ TEXTOS_DO_REGISTRO.titulo }}
        </h2>
        <button
          type="button"
          class="-mr-space-2 -mt-space-2 hidden size-10 items-center justify-center rounded-full text-grafite hover:bg-linha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-musgo md:flex"
          :aria-label="ROTULO_FECHAR"
          :disabled="salvando"
          @click="fechar"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="mt-space-5 flex items-start gap-space-4 border-b border-linha pb-space-5">
        <CapaLivro
          class="h-[90px] w-[60px]"
          :url="leitura.capaUrl ?? null"
          :rotulo="`Capa de ${leitura.titulo}`"
          :icone="false"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-space-1">
          <p class="line-clamp-2 text-title-sm text-tinta">
            {{ leitura.titulo }}
          </p>
          <p
            v-if="leitura.autor"
            class="text-caption text-grafite"
          >
            {{ leitura.autor }}
          </p>
          <p class="text-caption text-grafite">
            {{ rotuloPaginaDeTotal(leitura.paginaAtual, leitura.totalPaginas) }}
          </p>
        </div>
      </div>

      <div class="mt-space-5 grid gap-space-5 md:grid-cols-2 md:gap-space-4">
        <CampoTexto
          v-model="pagina"
          data-campo="pagina"
          :label="TEXTOS_DO_REGISTRO.rotuloPagina"
          inputmode="numeric"
          mono
          :helper="ajudaPagina"
          :erro="mensagemPagina"
          :disabled="salvando"
        />
        <fieldset
          class="flex min-w-0 flex-col gap-space-2"
          :disabled="salvando"
        >
          <legend class="mb-space-2 text-label text-grafite">
            {{ TEXTOS_DO_REGISTRO.rotuloTempo }}
          </legend>
          <div class="grid grid-cols-2 gap-space-3">
            <CampoTexto
              v-model="horas"
              data-campo="horas"
              :label="TEXTOS_DO_REGISTRO.sufixoHoras"
              class="[&>label]:sr-only"
              inputmode="numeric"
              mono
              :borda-de-erro="Boolean(mensagemTempo)"
              :disabled="salvando"
            >
              <template #trailing>
                <span
                  class="pointer-events-none flex items-center pr-space-4 text-caption text-grafite-suave"
                  aria-hidden="true"
                >{{ TEXTOS_DO_REGISTRO.sufixoHoras }}</span>
              </template>
            </CampoTexto>
            <CampoTexto
              v-model="minutos"
              data-campo="minutos"
              :label="TEXTOS_DO_REGISTRO.sufixoMinutos"
              class="[&>label]:sr-only"
              inputmode="numeric"
              mono
              :borda-de-erro="Boolean(mensagemTempo)"
              :disabled="salvando"
            >
              <template #trailing>
                <span
                  class="pointer-events-none flex items-center pr-space-4 text-caption text-grafite-suave"
                  aria-hidden="true"
                >{{ TEXTOS_DO_REGISTRO.sufixoMinutos }}</span>
              </template>
            </CampoTexto>
          </div>
          <p
            v-if="mensagemTempo"
            data-erro="tempo"
            class="text-caption text-rubi"
          >
            {{ mensagemTempo }}
          </p>
          <p class="text-caption text-grafite">
            {{ TEXTOS_DO_REGISTRO.ajudaTempo }}
          </p>
        </fieldset>
      </div>

      <p
        v-if="derivado !== null"
        data-derivado
        class="mt-space-5 flex items-center gap-space-2 text-caption text-grafite"
        aria-live="polite"
      >
        <PhCalculator
          :size="16"
          weight="regular"
          class="shrink-0 text-grafite-suave"
          aria-hidden="true"
        />
        {{ TEXTOS_DO_REGISTRO.derivado(derivado) }}
      </p>

      <div class="mt-space-6 flex flex-col gap-space-3 md:flex-row-reverse md:items-center md:justify-start md:gap-space-4">
        <BotaoPrimario
          tipo="submit"
          class="h-12 md:h-10 md:w-auto"
          :disabled="salvando"
        >
          {{ salvando ? TEXTOS_DO_REGISTRO.botaoSalvando : TEXTOS_DO_REGISTRO.botaoSalvar }}
        </BotaoPrimario>
        <BotaoTextual
          class="h-12 w-full justify-center md:h-10 md:w-auto"
          :disabled="salvando"
          @click="fechar"
        >
          {{ TEXTOS_DO_REGISTRO.botaoCancelar }}
        </BotaoTextual>
      </div>
      <p
        v-if="erro"
        role="alert"
        class="mt-space-2 text-caption text-rubi"
      >
        {{ erro }}
      </p>
    </form>
  </SobreposicaoModal>
</template>
