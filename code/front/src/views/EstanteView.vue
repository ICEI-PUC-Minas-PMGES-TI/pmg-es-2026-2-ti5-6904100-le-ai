<script setup lang="ts">
import { PhArrowsDownUp, PhBooks, PhCheck } from '@phosphor-icons/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import AcoesLeitura from '../components/estante/AcoesLeitura.vue'
import CardEstante from '../components/estante/CardEstante.vue'
import EsqueletoEstante from '../components/estante/EsqueletoEstante.vue'
import StatusPill from '../components/estante/StatusPill.vue'
import FimDaLista from '../components/perfil/FimDaLista.vue'
import RegistrarProgresso from '../components/progresso/RegistrarProgresso.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import EstadoVazio from '../components/ui/EstadoVazio.vue'
import SobreposicaoModal from '../components/ui/SobreposicaoModal.vue'
import {
  ORDEM_DOS_FILTROS,
  ORDENACAO_PADRAO,
  ROTULO_DA_ORDENACAO,
  ROTULO_DO_STATUS,
  ROTULO_TODOS,
  TEXTOS_DA_ESTANTE,
  TEXTOS_DO_PAINEL,
  VAZIO_DO_FILTRO,
  textoTotalDeLivros,
  type DestinoDoVazio,
} from '../estante/textos'
import { APARENCIA_DO_STATUS } from '../estante/aparenciaDoStatus'
import { useEstante } from '../estante/useEstante'
import { usePainelDeAcoes } from '../estante/usePainelDeAcoes'
import { caminhoDoProgresso } from '../progresso/caminhos'
import { useDialogoDeRegistro } from '../progresso/useDialogoDeRegistro'
import { leituraService, type ItemEstante, type OrdenacaoEstante, type StatusEstante } from '../services/leitura'

const route = useRoute()
const router = useRouter()

const ORDENACOES = Object.keys(ROTULO_DA_ORDENACAO) as OrdenacaoEstante[]

const status = computed<StatusEstante | undefined>(() => {
  const valor = route.query.status
  return ORDEM_DOS_FILTROS.find((opcao) => opcao === valor)
})

const ordenacao = computed<OrdenacaoEstante>(() => {
  const valor = route.query.ordenacao
  return ORDENACOES.find((opcao) => opcao === valor) ?? ORDENACAO_PADRAO
})

const estante = useEstante(
  (filtro) => leituraService.listarEstante(filtro),
  () => ({ status: status.value, ordenacao: ordenacao.value }),
)

watch([status, ordenacao], () => void estante.carregar(), { immediate: true })

function navegar(novoStatus: StatusEstante | undefined, novaOrdenacao: OrdenacaoEstante): void {
  const query = { ...route.query }
  delete query.status
  delete query.ordenacao
  if (novoStatus) query.status = novoStatus
  if (novaOrdenacao !== ORDENACAO_PADRAO) query.ordenacao = novaOrdenacao
  void router.replace({ query })
}

function filtrar(novo: StatusEstante | undefined): void {
  navegar(novo, ordenacao.value)
}

const folhaDeOrdenacao = ref(false)

function ordenar(nova: OrdenacaoEstante): void {
  folhaDeOrdenacao.value = false
  navegar(status.value, nova)
}

const totalGeral = computed(() => {
  const totais = estante.totais.value
  return totais ? ORDEM_DOS_FILTROS.reduce((soma, opcao) => soma + totais[opcao], 0) : null
})

const pills = computed(() => [
  { status: undefined, rotulo: ROTULO_TODOS, contagem: totalGeral.value },
  ...ORDEM_DOS_FILTROS.map((opcao) => ({
    status: opcao,
    rotulo: ROTULO_DO_STATUS[opcao],
    contagem: estante.totais.value?.[opcao] ?? null,
  })),
])

const pronta = computed(() => !estante.carregando.value && !estante.falhou.value)
const estanteVazia = computed(() => pronta.value && totalGeral.value === 0)
const vazioDoFiltro = computed(() =>
  pronta.value && !estanteVazia.value && status.value && estante.itens.value.length === 0
    ? VAZIO_DO_FILTRO[status.value]
    : null,
)

function seguirVazio(destino: DestinoDoVazio): void {
  if (destino === 'descobrir') {
    void router.push('/descobrir')
  } else {
    filtrar(destino)
  }
}

const painel = usePainelDeAcoes((leituraId) => leituraService.detalharLeitura(leituraId))
const registro = useDialogoDeRegistro()

function abrirRegistro(): void {
  painel.fechar()
  registro.abrir(painel.livro.value, painel.estado.value)
}

function aoSalvarProgresso(): void {
  registro.fechar()
  void estante.carregar()
}

function verAtualizacoes(leituraId: string): void {
  painel.fechar()
  void router.push(caminhoDoProgresso(leituraId))
}

function abrirAcoes(item: ItemEstante): void {
  void painel.abrir({ livroId: item.livroId, ...item.livro }, item)
}
</script>

<template>
  <div class="pb-space-10">
    <div
      class="-mx-space-5 flex gap-space-2 overflow-x-auto px-space-5 py-space-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      role="group"
      :aria-label="TEXTOS_DA_ESTANTE.rotuloFiltros"
    >
      <button
        v-for="pill in pills"
        :key="pill.rotulo"
        type="button"
        class="group flex min-h-12 shrink-0 items-center focus-visible:outline-none"
        :aria-pressed="status === pill.status"
        @click="filtrar(pill.status)"
      >
        <span
          class="inline-flex items-center gap-space-1 rounded-full px-space-4 py-space-2 text-caption transition-colors duration-dur-fast group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-musgo"
          :class="status === pill.status ? 'bg-musgo-fundo font-semibold text-musgo' : 'border border-linha text-grafite md:group-hover:bg-linha'"
        >
          {{ pill.rotulo }}
          <span
            v-if="pill.contagem !== null && !estante.carregando.value"
            class="font-mono text-num-inline tabular-nums"
          >{{ pill.contagem }}</span>
        </span>
      </button>
    </div>

    <div
      v-if="!estante.falhou.value && !estanteVazia && !vazioDoFiltro"
      class="flex min-h-12 items-center justify-between gap-space-3 pb-space-3"
    >
      <p
        class="text-caption text-grafite"
        aria-live="polite"
      >
        <template v-if="!estante.carregando.value">
          {{ textoTotalDeLivros(estante.total.value) }}
        </template>
      </p>
      <BotaoTextual
        class="min-h-12 gap-space-1 md:hidden"
        :aria-label="`${TEXTOS_DA_ESTANTE.rotuloOrdenacao}: ${ROTULO_DA_ORDENACAO[ordenacao]}`"
        @click="folhaDeOrdenacao = true"
      >
        <PhArrowsDownUp
          :size="16"
          weight="regular"
          aria-hidden="true"
        />
        {{ ROTULO_DA_ORDENACAO[ordenacao] }}
      </BotaoTextual>
      <select
        class="hidden h-11 rounded-base border border-linha bg-papel-elevado px-space-3 text-body text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:block"
        :aria-label="TEXTOS_DA_ESTANTE.rotuloOrdenacao"
        :value="ordenacao"
        @change="ordenar(($event.target as HTMLSelectElement).value as OrdenacaoEstante)"
      >
        <option
          v-for="opcao in ORDENACOES"
          :key="opcao"
          :value="opcao"
        >
          {{ ROTULO_DA_ORDENACAO[opcao] }}
        </option>
      </select>
    </div>

    <EsqueletoEstante
      v-if="estante.carregando.value"
      :rotulo="TEXTOS_DA_ESTANTE.carregando"
    />

    <BannerAviso
      v-else-if="estante.falhou.value"
      variante="erro"
    >
      {{ TEXTOS_DA_ESTANTE.erroTexto }}
      <BotaoTextual
        class="mt-space-2"
        @click="estante.carregar()"
      >
        {{ TEXTOS_DA_ESTANTE.erroBotao }}
      </BotaoTextual>
    </BannerAviso>

    <EstadoVazio
      v-else-if="estanteVazia"
      :icone="PhBooks"
      :titulo="TEXTOS_DA_ESTANTE.vaziaTitulo"
      class="mx-auto max-w-[320px] pt-space-6"
    >
      <p class="mt-space-3 text-body text-grafite">
        {{ TEXTOS_DA_ESTANTE.vaziaTexto }}
      </p>
      <RouterLink
        to="/descobrir"
        class="mt-space-6 flex h-12 items-center justify-center rounded-full bg-musgo px-space-8 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
      >
        {{ TEXTOS_DA_ESTANTE.vaziaBotaoPrimario }}
      </RouterLink>
      <RouterLink
        to="/estante/adicionar"
        class="mt-space-3 inline-flex min-h-12 items-center text-body-strong text-musgo underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none md:min-h-10"
      >
        {{ TEXTOS_DA_ESTANTE.vaziaBotaoTextual }}
      </RouterLink>
    </EstadoVazio>

    <EstadoVazio
      v-else-if="vazioDoFiltro && status"
      :icone="APARENCIA_DO_STATUS[status].icone"
      :titulo="vazioDoFiltro.titulo"
      class="mx-auto max-w-[320px] pt-space-6"
    >
      <p class="mt-space-3 max-w-[280px] text-body text-grafite">
        {{ vazioDoFiltro.texto }}
      </p>
      <button
        v-if="vazioDoFiltro.botao"
        type="button"
        class="mt-space-6 flex h-12 items-center justify-center rounded-full bg-musgo px-space-8 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
        @click="seguirVazio(vazioDoFiltro.botao.destino)"
      >
        {{ vazioDoFiltro.botao.rotulo }}
      </button>
    </EstadoVazio>

    <template v-else>
      <ul
        class="grid grid-cols-2 gap-space-4 md:grid-cols-4 lg:grid-cols-6"
        :aria-label="TEXTOS_DA_ESTANTE.rotuloGrade"
      >
        <li
          v-for="item in estante.itens.value"
          :key="item.id"
          class="flex"
        >
          <CardEstante
            :item="item"
            @abrir="abrirAcoes"
          />
        </li>
      </ul>
      <FimDaLista
        v-if="estante.temMais.value || estante.falhouMais.value"
        :falhou="estante.falhouMais.value"
        @carregar="estante.carregarMais()"
      />
    </template>

    <BannerAviso
      v-if="painel.falhou.value"
      class="mt-space-4"
      variante="erro"
    >
      {{ TEXTOS_DO_PAINEL.erroAoAbrir }}
    </BannerAviso>

    <AcoesLeitura
      v-if="painel.livro.value"
      :aberta="painel.aberto.value"
      :livro="painel.livro.value"
      :estado="painel.estado.value"
      @fechar="painel.fechar()"
      @registrar-progresso="abrirRegistro"
      @ver-atualizacoes="verAtualizacoes"
      @atualizado="estante.carregar()"
    >
      <template #status="{ status: statusAtual }">
        <StatusPill :status="statusAtual" />
      </template>
    </AcoesLeitura>

    <RegistrarProgresso
      v-if="registro.contexto.value"
      :aberta="registro.aberto.value"
      :leitura="registro.contexto.value"
      @fechar="registro.fechar()"
      @salvo="aoSalvarProgresso"
    />

    <SobreposicaoModal
      :aberta="folhaDeOrdenacao"
      :rotulo="TEXTOS_DA_ESTANTE.rotuloOrdenacao"
      somente-folha
      @fechar="folhaDeOrdenacao = false"
    >
      <ul class="divide-y divide-linha">
        <li
          v-for="opcao in ORDENACOES"
          :key="opcao"
        >
          <button
            type="button"
            class="flex h-14 w-full items-center justify-between gap-space-4 text-left text-body focus-visible:underline focus-visible:outline-none"
            :class="opcao === ordenacao ? 'font-semibold text-musgo' : 'text-tinta'"
            :aria-pressed="opcao === ordenacao"
            @click="ordenar(opcao)"
          >
            {{ ROTULO_DA_ORDENACAO[opcao] }}
            <PhCheck
              v-if="opcao === ordenacao"
              :size="20"
              weight="bold"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
    </SobreposicaoModal>
  </div>
</template>

