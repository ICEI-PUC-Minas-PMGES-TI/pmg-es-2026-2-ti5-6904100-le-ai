<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import RegistrarProgresso from '../progresso/RegistrarProgresso.vue'
import BannerAviso from '../ui/BannerAviso.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import AcoesLeitura from './AcoesLeitura.vue'
import StatusPill from './StatusPill.vue'
import { TEXTOS_DA_ESTANTE, TEXTOS_DO_PAINEL, ACOES_DE_LEITURA, textoPaginaDe, textoVezesLido } from '../../estante/textos'
import { usePainelDeAcoes } from '../../estante/usePainelDeAcoes'
import { caminhoDoProgresso } from '../../progresso/caminhos'
import { useDialogoDeRegistro } from '../../progresso/useDialogoDeRegistro'
import { leituraService, type ItemEstante, type StatusEstante } from '../../services/leitura'

const props = defineProps<{
  livroId: string
  titulo: string
  autor: string | null
  capaUrl: string | null
}>()

const EM_ANDAMENTO: readonly StatusEstante[] = ['LENDO', 'RELENDO']
const PERCENTUAL_MAXIMO = 100

const router = useRouter()

const naEstante = ref<ItemEstante | null>(null)
const vezesLido = ref(0)
const carregada = ref(false)
const falhou = ref(false)
const abrindoRegistro = ref(false)
const registroFalhou = ref(false)
const painel = usePainelDeAcoes((leituraId) => leituraService.detalharLeitura(leituraId))
const registro = useDialogoDeRegistro()

const livroDoPainel = computed(() => ({
  livroId: props.livroId,
  titulo: props.titulo,
  autor: props.autor,
  capaUrl: props.capaUrl,
}))

const leituraAberta = computed(() => {
  const item = naEstante.value
  return item && EM_ANDAMENTO.includes(item.status) ? item.leituraEmAndamentoId : null
})

const progresso = computed(() => {
  const item = naEstante.value
  if (!item || !EM_ANDAMENTO.includes(item.status)) return null
  const percentual = Math.min(Math.max(Math.round(item.percentualConcluido ?? 0), 0), PERCENTUAL_MAXIMO)
  const { paginaAtual, totalPaginas } = item
  const rotulo =
    paginaAtual != null && paginaAtual > 0 && totalPaginas != null
      ? textoPaginaDe(paginaAtual, totalPaginas)
      : TEXTOS_DA_ESTANTE.progressoIniciado
  return { percentual, rotulo }
})

async function carregar(): Promise<void> {
  carregada.value = false
  falhou.value = false
  try {
    const [item, conclusoes] = await Promise.all([
      leituraService.consultarItemEstante(props.livroId),
      leituraService.consultarConclusoes(props.livroId),
    ])
    naEstante.value = item
    vezesLido.value = conclusoes.vezesLido
    carregada.value = true
  } catch {
    falhou.value = true
  }
}

function abrirAcoes(): void {
  void painel.abrir(livroDoPainel.value, naEstante.value)
}

function abrirRegistroDoPainel(): void {
  painel.fechar()
  registro.abrir(painel.livro.value, painel.estado.value)
}

async function registrarProgresso(leituraId: string): Promise<void> {
  abrindoRegistro.value = true
  registroFalhou.value = false
  try {
    const leitura = await leituraService.detalharLeitura(leituraId)
    registro.abrir(livroDoPainel.value, { status: leitura.status, leitura })
  } catch {
    registroFalhou.value = true
  } finally {
    abrindoRegistro.value = false
  }
}

function aoSalvarProgresso(): void {
  registro.fechar()
  void carregar()
}

function verAtualizacoes(leituraId: string): void {
  painel.fechar()
  void router.push(caminhoDoProgresso(leituraId))
}

watch(() => props.livroId, () => void carregar(), { immediate: true })
</script>

<template>
  <section class="flex flex-col items-center gap-space-3 md:items-start">
    <template v-if="carregada">
      <div
        v-if="naEstante || vezesLido > 0"
        class="flex items-center gap-space-3"
      >
        <StatusPill
          v-if="naEstante"
          :status="naEstante.status"
        />
        <span
          v-if="vezesLido > 0"
          class="text-caption text-grafite"
        >{{ textoVezesLido(vezesLido) }}</span>
      </div>
      <div
        v-if="progresso"
        class="flex w-full max-w-sm items-center gap-space-2"
      >
        <div
          class="h-1.5 flex-1 overflow-hidden rounded-full bg-musgo-fundo"
          role="progressbar"
          :aria-valuenow="progresso.percentual"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Progresso de ${titulo}`"
        >
          <div
            class="h-full rounded-full bg-musgo"
            :style="{ width: `${progresso.percentual}%` }"
          />
        </div>
        <span class="font-mono text-caption tabular-nums text-grafite">{{ progresso.rotulo }}</span>
      </div>
      <button
        v-if="!naEstante || leituraAberta"
        type="button"
        class="flex h-12 w-full items-center justify-center rounded-full bg-musgo px-space-8 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:opacity-60 md:h-10 md:w-auto"
        :disabled="painel.preparando.value || abrindoRegistro"
        @click="leituraAberta ? registrarProgresso(leituraAberta) : abrirAcoes()"
      >
        {{ leituraAberta ? ACOES_DE_LEITURA.registrarProgresso : TEXTOS_DO_PAINEL.adicionarNaEstante }}
      </button>
      <BotaoTextual
        v-if="naEstante"
        :disabled="painel.preparando.value"
        @click="abrirAcoes"
      >
        {{ TEXTOS_DO_PAINEL.alterarStatus }}
      </BotaoTextual>
    </template>
    <BannerAviso
      v-if="falhou || painel.falhou.value || registroFalhou"
      variante="erro"
    >
      {{ TEXTOS_DO_PAINEL.erroAoAbrir }}
      <BotaoTextual
        v-if="falhou"
        class="mt-space-2"
        @click="carregar"
      >
        {{ TEXTOS_DO_PAINEL.tentarDeNovo }}
      </BotaoTextual>
    </BannerAviso>

    <AcoesLeitura
      v-if="painel.livro.value"
      :aberta="painel.aberto.value"
      :livro="painel.livro.value"
      :estado="painel.estado.value"
      @fechar="painel.fechar()"
      @registrar-progresso="abrirRegistroDoPainel"
      @ver-atualizacoes="verAtualizacoes"
      @atualizado="carregar()"
    >
      <template #status="{ status }">
        <StatusPill :status="status" />
      </template>
    </AcoesLeitura>

    <RegistrarProgresso
      v-if="registro.contexto.value"
      :aberta="registro.aberto.value"
      :leitura="registro.contexto.value"
      @fechar="registro.fechar()"
      @salvo="aoSalvarProgresso"
    />
  </section>
</template>
