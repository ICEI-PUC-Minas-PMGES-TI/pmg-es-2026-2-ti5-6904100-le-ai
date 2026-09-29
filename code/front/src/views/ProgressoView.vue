<script setup lang="ts">
import { PhClock } from '@phosphor-icons/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import FimDaLista from '../components/perfil/FimDaLista.vue'
import ListaProgresso from '../components/progresso/ListaProgresso.vue'
import RegistrarProgresso from '../components/progresso/RegistrarProgresso.vue'
import ResumoProgresso from '../components/progresso/ResumoProgresso.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoPrimario from '../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import DialogoConfirmacao from '../components/ui/DialogoConfirmacao.vue'
import EstadoVazio from '../components/ui/EstadoVazio.vue'
import { usePaginacao } from '../perfil/usePaginacao'
import { alcanceDaExclusao, ehUltimo } from '../progresso/regras'
import { TEXTOS_DAS_ATUALIZACOES, TEXTOS_DO_REGISTRO } from '../progresso/textos'
import { useRegistroProgresso } from '../progresso/useRegistroProgresso'
import {
  leituraService,
  type Leitura,
  type LivroDaEstante,
  type Progresso,
  type ProgressoComResumo,
  type ResumoProgresso as Resumo,
} from '../services/leitura'
import type { Pagina } from '../services/perfil'

const ITENS_POR_PAGINA = 20
const LINHAS_DO_ESQUELETO = 5

const route = useRoute()
const leituraId = String(route.params.leituraId)

const leitura = ref<Leitura | null>(null)
const livro = ref<LivroDaEstante | null>(null)
const resumo = ref<Resumo | null>(null)
const somenteLeitura = ref(true)
const aviso = ref<string | null>(null)

async function buscar(pagina: number): Promise<Pagina<Progresso>> {
  const resposta = await leituraService.listarProgresso(leituraId, { page: pagina + 1, limite: ITENS_POR_PAGINA })
  resumo.value = resposta.resumo
  somenteLeitura.value = resposta.somenteLeitura
  return {
    items: resposta.itens,
    page: pagina,
    size: resposta.paginacao.limite,
    totalElements: resposta.paginacao.totalItens,
    totalPages: resposta.paginacao.totalPaginas,
  }
}

const lista = usePaginacao(buscar)
const exclusao = useRegistroProgresso()

async function carregarLivro(): Promise<void> {
  try {
    leitura.value = await leituraService.detalharLeitura(leituraId)
    livro.value = (await leituraService.consultarItemEstante(leitura.value.livroId))?.livro ?? null
  } catch {
    livro.value = null
  }
}

const carregandoTela = computed(() => lista.carregando.value && resumo.value === null)
const falhou = computed(() => lista.falhou.value && resumo.value === null)
const idDoUltimo = computed(() => lista.itens.value.find((item) => ehUltimo(lista.itens.value, item.id))?.id ?? null)
const podeRegistrar = computed(() => resumo.value !== null && !somenteLeitura.value)

const registroAberto = ref(false)

const leituraDoRegistro = computed(() => ({
  leituraId,
  titulo: livro.value?.titulo ?? '',
  autor: livro.value?.autor ?? null,
  capaUrl: livro.value?.capaUrl ?? null,
  paginaAtual: resumo.value?.paginaAtual ?? 0,
  totalPaginas: resumo.value?.totalPaginas ?? 0,
}))

function abrirRegistro(): void {
  registroAberto.value = true
}

function fecharRegistro(): void {
  registroAberto.value = false
}

async function aoSalvar(resultado: ProgressoComResumo): Promise<void> {
  resumo.value = resultado.resumo
  fecharRegistro()
  await lista.carregar()
}

const alvo = ref<Progresso | null>(null)
const alcance = computed(() =>
  alvo.value && resumo.value ? alcanceDaExclusao(lista.itens.value, alvo.value.id, resumo.value.totalPaginas) : null,
)

function pedirExclusao(progresso: Progresso): void {
  exclusao.limparErro()
  alvo.value = progresso
}

function cancelarExclusao(): void {
  alvo.value = null
}

async function confirmarExclusao(): Promise<void> {
  if (!alvo.value || !idDoUltimo.value) return
  const resultado = await exclusao.excluirTrecho(alvo.value.id, idDoUltimo.value)
  if (resultado) {
    resumo.value = resultado.resumo
    alvo.value = null
    aviso.value = null
    await lista.carregar()
    return
  }
  if (exclusao.precisaRecarregar.value) {
    aviso.value = TEXTOS_DO_REGISTRO.erroListaDesatualizada
    alvo.value = null
    await lista.carregar()
  }
}

async function tentarDeNovo(): Promise<void> {
  await Promise.all([lista.carregar(), leitura.value ? Promise.resolve() : carregarLivro()])
}

onMounted(() => {
  void lista.carregar()
  void carregarLivro()
})
</script>

<template>
  <div class="px-space-5 pb-space-8 md:px-space-8">
    <Teleport
      v-if="podeRegistrar"
      to="#cabecalho-acoes"
      defer
    >
      <BotaoPrimario
        class="px-space-5"
        data-registrar
        @click="abrirRegistro"
      >
        {{ TEXTOS_DO_REGISTRO.titulo }}
      </BotaoPrimario>
    </Teleport>

    <div
      v-if="carregandoTela"
      class="entrada grid gap-space-6 md:grid-cols-[320px_minmax(0,1fr)] md:gap-space-8"
      aria-busy="true"
      data-carregando
    >
      <div
        class="flex flex-col gap-space-4"
        aria-hidden="true"
      >
        <div class="flex items-center gap-space-4 md:flex-col md:items-start">
          <div class="h-[90px] w-[60px] bg-capa-placeholder md:h-[300px] md:w-[200px]" />
          <div class="flex flex-1 flex-col gap-space-2">
            <div class="h-4 w-[70%] rounded-sm bg-linha" />
            <div class="h-3.5 w-[45%] rounded-sm bg-linha" />
          </div>
        </div>
        <div class="h-1.5 w-full rounded-full bg-linha" />
        <div class="flex gap-space-4">
          <div class="h-4 flex-1 rounded-sm bg-linha" />
          <div class="h-4 flex-1 rounded-sm bg-linha" />
          <div class="h-4 flex-1 rounded-sm bg-linha" />
        </div>
      </div>
      <div aria-hidden="true">
        <div
          v-for="linha in LINHAS_DO_ESQUELETO"
          :key="linha"
          class="flex h-14 items-center gap-space-6 border-b border-linha"
        >
          <div class="h-[18px] w-[30%] rounded-sm bg-linha" />
          <div class="h-[13px] w-[25%] rounded-sm bg-linha" />
        </div>
      </div>
    </div>

    <div
      v-else-if="falhou"
      class="flex flex-col items-start gap-space-3"
      data-erro
    >
      <BannerAviso
        variante="erro"
        triangulo
        class="w-full"
      >
        {{ TEXTOS_DAS_ATUALIZACOES.erroTexto }}
      </BannerAviso>
      <BotaoTextual @click="tentarDeNovo">
        {{ TEXTOS_DAS_ATUALIZACOES.erroBotao }}
      </BotaoTextual>
    </div>

    <div
      v-else-if="resumo"
      class="grid gap-space-6 md:grid-cols-[320px_minmax(0,1fr)] md:items-start md:gap-space-8"
    >
      <aside class="md:sticky md:top-space-6">
        <ResumoProgresso
          :livro="livro"
          :resumo="resumo"
          :data-inicio="leitura?.dataInicio ?? null"
          :registros="lista.total.value"
        />
      </aside>

      <section
        class="min-w-0"
        aria-labelledby="titulo-atualizacoes"
      >
        <h2
          id="titulo-atualizacoes"
          class="mb-space-4 text-title-lg text-tinta"
        >
          {{ TEXTOS_DAS_ATUALIZACOES.tituloSecao }}
        </h2>

        <BannerAviso
          v-if="aviso"
          variante="alerta"
          class="mb-space-4"
          data-aviso
        >
          {{ aviso }}
        </BannerAviso>

        <EstadoVazio
          v-if="lista.itens.value.length === 0"
          :icone="PhClock"
          solto
          :titulo="TEXTOS_DAS_ATUALIZACOES.vazioTitulo"
          class="py-space-8"
          data-vazio
        >
          <p class="mt-space-4 max-w-[280px] text-body text-grafite">
            {{ TEXTOS_DAS_ATUALIZACOES.vazioTexto }}
          </p>
          <BotaoPrimario
            v-if="!somenteLeitura"
            class="mt-space-6 px-space-6"
            @click="abrirRegistro"
          >
            {{ TEXTOS_DAS_ATUALIZACOES.vazioBotao }}
          </BotaoPrimario>
        </EstadoVazio>

        <template v-else>
          <ListaProgresso
            :itens="lista.itens.value"
            :somente-leitura="somenteLeitura"
            @excluir="pedirExclusao"
          />
          <FimDaLista
            v-if="lista.temMais.value"
            :falhou="lista.falhouMais.value"
            :carregando="lista.carregandoMais.value"
            @carregar="lista.carregarMais"
          />
        </template>
      </section>
    </div>

    <DialogoConfirmacao
      :aberta="alvo !== null"
      :titulo="TEXTOS_DAS_ATUALIZACOES.confirmacaoTitulo"
      :rotulo-confirmar="TEXTOS_DAS_ATUALIZACOES.confirmacaoBotao"
      :rotulo-cancelar="TEXTOS_DAS_ATUALIZACOES.botaoCancelar"
      :processando="exclusao.salvando.value"
      :erro="exclusao.erro.value ?? undefined"
      @confirmar="confirmarExclusao"
      @cancelar="cancelarExclusao"
    >
      <template v-if="alcance">
        <span
          v-if="alcance.quantidade > 1"
          data-alcance
        >
          {{ TEXTOS_DAS_ATUALIZACOES.confirmacaoAlcance(alcance.quantidade) }}
        </span>
        {{ TEXTOS_DAS_ATUALIZACOES.confirmacaoTexto(alcance.paginaResultante, alcance.percentualResultante) }}
      </template>
    </DialogoConfirmacao>

    <RegistrarProgresso
      v-if="resumo"
      :aberta="registroAberto"
      :leitura="leituraDoRegistro"
      @salvo="aoSalvar"
      @fechar="fecharRegistro"
    />
  </div>
</template>
