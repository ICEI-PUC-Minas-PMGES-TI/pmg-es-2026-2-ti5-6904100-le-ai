<script setup lang="ts">
import {
  PhArrowsClockwise,
  PhBookmarkSimple,
  PhBookOpen,
  PhCaretRight,
  PhCheckCircle,
  PhPauseCircle,
  PhPlay,
  PhPlusCircle,
  PhTrash,
  PhX,
} from '@phosphor-icons/vue'
import { type Component, computed, ref, watch } from 'vue'

import { type AcaoDisponivel, acoesDisponiveis, type EstadoDeLeitura, type IdAcao } from '../../estante/acoesDisponiveis'
import {
  CONFIRMACAO_ABANDONAR_LEITURA,
  CONFIRMACAO_ABANDONAR_RELEITURA,
  CONFIRMACAO_REMOVER,
  ACOES_DE_LEITURA,
  ROTULO_DO_STATUS,
  ROTULO_FECHAR,
  TEXTOS_DE_ACAO,
  textoConcluido,
  textoPaginaDe,
  textoParouNaPagina,
  textoProximaConclusao,
  textoRetomada,
} from '../../estante/textos'
import { type PedidoDeAcao, useAcaoLeitura } from '../../estante/useAcaoLeitura'
import { formatarData } from '../../livros/formatos'
import { ROTULO_VER_ATUALIZACOES } from '../../progresso/textos'
import type { LivroDaEstante } from '../../services/leitura'
import CapaLivro from '../livros/CapaLivro.vue'
import BannerAviso from '../ui/BannerAviso.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import DialogoConfirmacao from '../ui/DialogoConfirmacao.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'
import FormularioDataLeitura from './FormularioDataLeitura.vue'

const props = defineProps<{
  aberta: boolean
  livro: LivroDaEstante & { livroId: string }
  estado: EstadoDeLeitura
}>()

const emit = defineEmits<{
  fechar: []
  atualizado: [estado: EstadoDeLeitura]
  registrarProgresso: []
  verAtualizacoes: [leituraId: string]
}>()

const ICONE: Record<IdAcao, Component> = {
  adicionarQueroLer: PhBookmarkSimple,
  iniciarLeitura: PhBookOpen,
  registrarProgresso: PhPlusCircle,
  finalizarLeitura: PhCheckCircle,
  finalizarReleitura: PhCheckCircle,
  iniciarReleitura: PhArrowsClockwise,
  retomarLeitura: PhPlay,
  abandonarLeitura: PhPauseCircle,
  abandonarReleitura: PhPauseCircle,
  removerDaEstante: PhTrash,
}

const COR_DO_TOM = { principal: 'text-musgo', neutra: 'text-tinta', destrutiva: 'text-rubi' } as const

type Passo = { tipo: 'lista' } | { tipo: 'data' | 'confirmacao'; acao: AcaoDisponivel }

const { salvando, erro, executar, limparErro } = useAcaoLeitura()
const passo = ref<Passo>({ tipo: 'lista' })
const acaoEmCurso = ref<IdAcao | null>(null)

const acoes = computed(() => acoesDisponiveis(props.estado))
const leitura = computed(() => props.estado.leitura ?? null)
const hoje = ref(dataLocalDeHoje())

watch(
  () => props.aberta,
  (aberta) => {
    if (!aberta) irPara({ tipo: 'lista' })
    else hoje.value = dataLocalDeHoje()
  },
)

function dataLocalDeHoje(): string {
  const agora = new Date()
  const doisDigitos = (valor: number) => String(valor).padStart(2, '0')
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`
}

function porExtenso(data: string): string {
  return formatarData(`${data}T00:00:00`)
}

function irPara(proximo: Passo): void {
  limparErro()
  passo.value = proximo
}

const paginas = computed(() => {
  const atual = leitura.value
  return atual?.totalPaginas ? { atual: atual.paginaAtual, total: atual.totalPaginas } : null
})

const emAndamento = computed(() => props.estado.status === 'LENDO' || props.estado.status === 'RELENDO')

const detalheDoLido = computed(() => {
  const atual = leitura.value
  return props.estado.status === 'LIDO' && atual?.dataFim ? textoConcluido(porExtenso(atual.dataFim), atual.vezesLido) : null
})

const passoDeData = computed(() => {
  if (passo.value.tipo !== 'data') return null
  const { acao } = passo.value
  const finalizar = acao.id === 'finalizarLeitura' || acao.id === 'finalizarReleitura'
  return {
    acao,
    rotuloCampo: finalizar ? TEXTOS_DE_ACAO.rotuloDataFim : TEXTOS_DE_ACAO.rotuloDataInicio,
    helper: finalizar ? TEXTOS_DE_ACAO.ajudaDataFim : TEXTOS_DE_ACAO.ajudaDataInicio,
    aviso: finalizar && leitura.value ? textoProximaConclusao(leitura.value.vezesLido + 1) : undefined,
  }
})

const confirmacao = computed(() => {
  if (passo.value.tipo !== 'confirmacao') return null
  const { acao } = passo.value
  switch (acao.id) {
    case 'abandonarLeitura':
      return { acao, titulo: CONFIRMACAO_ABANDONAR_LEITURA.titulo, texto: CONFIRMACAO_ABANDONAR_LEITURA.texto(leitura.value?.paginaAtual ?? 0) }
    case 'abandonarReleitura':
      return { acao, ...CONFIRMACAO_ABANDONAR_RELEITURA }
    default:
      return { acao, ...CONFIRMACAO_REMOVER }
  }
})

function escolher(acao: AcaoDisponivel): void {
  if (acao.passo === 'externo') {
    emit('registrarProgresso')
  } else if (acao.passo === 'direto') {
    void salvar(acao.id)
  } else {
    irPara({ tipo: acao.passo, acao })
  }
}

function pedidoDe(id: IdAcao, data?: string): PedidoDeAcao | null {
  const { livroId } = props.livro
  const leituraId = leitura.value?.id
  switch (id) {
    case 'adicionarQueroLer':
    case 'removerDaEstante':
      return { acao: id, livroId }
    case 'iniciarLeitura':
    case 'iniciarReleitura':
      return { acao: id, livroId, dataInicio: data ?? hoje.value }
    case 'finalizarLeitura':
    case 'finalizarReleitura':
      return leituraId
        ? { acao: id, leituraId, dataFim: data ?? hoje.value, fusoHorarioDispositivo: Intl.DateTimeFormat().resolvedOptions().timeZone }
        : null
    case 'abandonarLeitura':
    case 'abandonarReleitura':
    case 'retomarLeitura':
      return leituraId ? { acao: id, leituraId } : null
    case 'registrarProgresso':
      return null
  }
}

async function salvar(id: IdAcao, data?: string): Promise<void> {
  const pedido = pedidoDe(id, data)
  if (!pedido) return
  acaoEmCurso.value = id
  try {
    const novo = await executar(pedido)
    if (novo) {
      emit('atualizado', novo)
      emit('fechar')
    }
  } finally {
    acaoEmCurso.value = null
  }
}
</script>

<template>
  <SobreposicaoModal
    :aberta="aberta && passo.tipo !== 'confirmacao'"
    :rotulo="livro.titulo"
    @fechar="!salvando && emit('fechar')"
  >
    <FormularioDataLeitura
      v-if="passoDeData"
      :key="passoDeData.acao.id"
      :titulo="passoDeData.acao.rotulo"
      :rotulo-campo="passoDeData.rotuloCampo"
      :helper="passoDeData.helper"
      :aviso="passoDeData.aviso"
      :hoje="hoje"
      :salvando="salvando"
      :erro="erro"
      @confirmar="(data) => salvar(passoDeData!.acao.id, data)"
      @voltar="irPara({ tipo: 'lista' })"
      @cancelar="emit('fechar')"
    />

    <template v-else>
      <header class="flex items-start gap-space-4 border-b border-linha pb-space-5">
        <CapaLivro
          class="h-[90px] w-[60px] md:h-[108px] md:w-[72px]"
          :url="livro.capaUrl"
          :rotulo="`Capa de ${livro.titulo}`"
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
          <div
            v-if="emAndamento && paginas"
            class="mt-space-2 flex flex-col gap-space-1"
          >
            <div class="flex items-center gap-space-2">
              <div
                class="h-1.5 flex-1 overflow-hidden rounded-full bg-musgo-fundo"
                role="progressbar"
                :aria-valuenow="leitura?.percentualConcluido ?? 0"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="h-full rounded-full bg-musgo"
                  :style="{ width: `${leitura?.percentualConcluido ?? 0}%` }"
                />
              </div>
              <span class="text-caption tabular-nums text-grafite">{{ leitura?.percentualConcluido ?? 0 }}%</span>
            </div>
            <p class="text-caption text-grafite">
              {{ textoPaginaDe(paginas.atual, paginas.total) }}
            </p>
          </div>
          <p
            v-else-if="detalheDoLido"
            class="mt-space-1 text-caption text-grafite"
          >
            {{ detalheDoLido }}
          </p>
          <p
            v-else-if="estado.status === 'ABANDONADO' && paginas"
            class="mt-space-1 text-caption text-grafite"
          >
            {{ textoParouNaPagina(paginas.atual, paginas.total) }}
          </p>
        </div>
        <div class="flex shrink-0 items-start gap-space-2">
          <slot
            v-if="estado.status"
            name="status"
            :status="estado.status"
          >
            <span class="rounded-full border border-linha px-space-2 py-space-1 text-caption text-tinta">
              {{ ROTULO_DO_STATUS[estado.status] }}
            </span>
          </slot>
          <button
            type="button"
            class="-mr-space-2 -mt-space-2 hidden size-10 items-center justify-center rounded-full text-grafite hover:bg-linha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-musgo md:flex"
            :aria-label="ROTULO_FECHAR"
            :disabled="salvando"
            @click="emit('fechar')"
          >
            <PhX
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      <BannerAviso
        v-if="erro"
        class="mt-space-4"
        variante="erro"
      >
        {{ erro }}
      </BannerAviso>

      <ul class="-mx-space-6 mt-space-2">
        <li
          v-for="acao in acoes"
          :key="acao.id"
          :class="acao.tom === 'destrutiva' ? 'mt-space-2 border-t border-linha pt-space-2' : ''"
        >
          <button
            type="button"
            class="flex h-14 w-full items-center gap-space-4 px-space-5 text-left text-body-strong transition-colors duration-dur-fast hover:bg-linha focus-visible:bg-linha focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 md:h-12"
            :class="COR_DO_TOM[acao.tom]"
            :disabled="salvando"
            :aria-busy="acaoEmCurso === acao.id ? 'true' : undefined"
            @click="escolher(acao)"
          >
            <component
              :is="ICONE[acao.id]"
              :size="24"
              weight="regular"
              aria-hidden="true"
            />
            <span class="flex-1">{{ acaoEmCurso === acao.id ? ACOES_DE_LEITURA.salvando : acao.rotulo }}</span>
            <PhCaretRight
              v-if="acao.passo === 'data' || acao.passo === 'externo'"
              :size="20"
              weight="regular"
              class="text-grafite-suave"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>

      <BotaoTextual
        v-if="emAndamento && leitura"
        class="mt-space-2 min-h-12 md:min-h-10"
        :disabled="salvando"
        @click="emit('verAtualizacoes', leitura.id)"
      >
        {{ ROTULO_VER_ATUALIZACOES }}
      </BotaoTextual>

      <p
        v-if="estado.status === 'ABANDONADO' && leitura?.retomavel"
        class="mt-space-2 text-caption text-grafite"
      >
        {{ textoRetomada(leitura.paginaAtual) }}
      </p>
    </template>
  </SobreposicaoModal>

  <DialogoConfirmacao
    :aberta="aberta && confirmacao !== null"
    :titulo="confirmacao?.titulo ?? ''"
    :rotulo-confirmar="confirmacao?.acao.rotulo ?? ''"
    :processando="salvando"
    :erro="erro ?? undefined"
    @confirmar="confirmacao && salvar(confirmacao.acao.id)"
    @cancelar="irPara({ tipo: 'lista' })"
  >
    {{ confirmacao?.texto }}
  </DialogoConfirmacao>
</template>
