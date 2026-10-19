<script setup lang="ts">
import {
  PhArrowLeft,
  PhArrowsDownUp,
  PhBooks,
  PhCheck,
  PhClockCounterClockwise,
  PhHeart,
  PhMagnifyingGlass,
  PhX,
} from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
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
import type { ItemDoCard } from '../estante/itemDoCard'
import {
  ORDEM_DOS_FILTROS,
  ORDENACAO_PADRAO,
  ROTULO_DA_ORDENACAO,
  ROTULO_DO_STATUS,
  ROTULO_HISTORICO,
  ROTULO_TODOS,
  TEXTOS_DA_BUSCA_NA_ESTANTE,
  TEXTOS_DA_ESTANTE,
  TEXTOS_DO_FILTRO_FAVORITOS,
  TEXTOS_DO_PAINEL,
  VAZIO_DO_FILTRO,
  textoEncontradosNaEstante,
  textoTotalDeLivros,
  type DestinoDoVazio,
} from '../estante/textos'
import { APARENCIA_DO_STATUS } from '../estante/aparenciaDoStatus'
import { useEstante } from '../estante/useEstante'
import { useFavoritosDaEstante } from '../estante/useFavoritosDaEstante'
import { usePainelDeAcoes } from '../estante/usePainelDeAcoes'
import { ESPERA_DA_BUSCA_MS } from '../livros/useBuscaDeLivros'
import { caminhoDoProgresso } from '../progresso/caminhos'
import { useDialogoDeRegistro } from '../progresso/useDialogoDeRegistro'
import { ApiError } from '../services/api'
import { leituraService, type ItemEstante, type OrdenacaoEstante, type StatusEstante } from '../services/leitura'

const route = useRoute()
const router = useRouter()

const ORDENACOES = Object.keys(ROTULO_DA_ORDENACAO) as OrdenacaoEstante[]
const FILTRO_FAVORITOS = 'FAVORITOS'
const ROTA_DO_HISTORICO = '/estante/historico'

type FiltroDaEstante = StatusEstante | typeof FILTRO_FAVORITOS | undefined
type ItemDaGrade = ItemDoCard & { id: string }

const status = computed<StatusEstante | undefined>(() => {
  const valor = route.query.status
  return ORDEM_DOS_FILTROS.find((opcao) => opcao === valor)
})

const favoritosAtivo = computed(() => route.query.status === FILTRO_FAVORITOS)
const filtroAtivo = computed<FiltroDaEstante>(() => (favoritosAtivo.value ? FILTRO_FAVORITOS : status.value))

const ordenacao = computed<OrdenacaoEstante>(() => {
  const valor = route.query.ordenacao
  return ORDENACOES.find((opcao) => opcao === valor) ?? ORDENACAO_PADRAO
})

const busca = computed(() => {
  const valor = route.query.q
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined
})

const estante = useEstante(
  (filtro) => leituraService.listarEstante(filtro),
  () => ({ status: status.value, ordenacao: ordenacao.value, q: busca.value }),
)
const favoritos = useFavoritosDaEstante(
  (filtro) => leituraService.listarFavoritos(filtro),
  () => busca.value,
)
const lista = computed(() => (favoritosAtivo.value ? favoritos : estante))

function recarregar(): void {
  if (favoritosAtivo.value) {
    void favoritos.carregar()
    void estante.carregarTotais()
  } else {
    void estante.carregar()
  }
}

watch([filtroAtivo, ordenacao, busca], recarregar, { immediate: true })

function navegar(novoFiltro: FiltroDaEstante, novaOrdenacao: OrdenacaoEstante): void {
  const query = { ...route.query }
  delete query.status
  delete query.ordenacao
  if (novoFiltro) query.status = novoFiltro
  if (novaOrdenacao !== ORDENACAO_PADRAO) query.ordenacao = novaOrdenacao
  void router.replace({ query })
}

function filtrar(novo: FiltroDaEstante): void {
  navegar(novo, ordenacao.value)
}

const folhaDeOrdenacao = ref(false)

function ordenar(nova: OrdenacaoEstante): void {
  folhaDeOrdenacao.value = false
  navegar(filtroAtivo.value, nova)
}

const textoDaBusca = ref(busca.value ?? '')
const buscaAberta = ref(busca.value !== undefined)
let espera: ReturnType<typeof setTimeout> | undefined

function aplicarBusca(texto: string): void {
  clearTimeout(espera)
  const query = { ...route.query }
  delete query.q
  const termo = texto.trim()
  if (termo) query.q = termo
  void router.replace({ query })
}

function aoDigitar(evento: Event): void {
  textoDaBusca.value = (evento.target as HTMLInputElement).value
  clearTimeout(espera)
  espera = setTimeout(() => aplicarBusca(textoDaBusca.value), ESPERA_DA_BUSCA_MS)
}

function limparBusca(): void {
  textoDaBusca.value = ''
  aplicarBusca('')
}

function fecharBusca(): void {
  buscaAberta.value = false
  limparBusca()
}

watch(busca, (valor) => {
  if ((valor ?? '') !== textoDaBusca.value.trim()) textoDaBusca.value = valor ?? ''
  if (valor !== undefined) buscaAberta.value = true
})

onBeforeUnmount(() => clearTimeout(espera))

function buscarNoAcervo(): void {
  void router.push({ path: '/descobrir', query: { q: busca.value } })
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

const carregando = computed(() => lista.value.carregando.value)
const falhou = computed(() => lista.value.falhou.value)
const itens = computed<ItemDaGrade[]>(() => lista.value.itens.value)
const pronta = computed(() => !carregando.value && !falhou.value)
const semItens = computed(() => pronta.value && itens.value.length === 0)
const estanteVazia = computed(
  () => pronta.value && totalGeral.value === 0 && !favoritosAtivo.value && busca.value === undefined,
)
const buscaVazia = computed(() => semItens.value && !estanteVazia.value && busca.value !== undefined)
const favoritosVazio = computed(() => semItens.value && favoritosAtivo.value && busca.value === undefined)
const vazioDoFiltro = computed(() =>
  semItens.value && !estanteVazia.value && busca.value === undefined && status.value
    ? VAZIO_DO_FILTRO[status.value]
    : null,
)
const comLista = computed(
  () => !falhou.value && !estanteVazia.value && !buscaVazia.value && !favoritosVazio.value && !vazioDoFiltro.value,
)
const contagem = computed(() =>
  busca.value === undefined
    ? textoTotalDeLivros(lista.value.total.value)
    : textoEncontradosNaEstante(lista.value.total.value),
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
const favoritoDoPainel = ref<boolean | undefined>(undefined)

function abrirRegistro(): void {
  painel.fechar()
  registro.abrir(painel.livro.value, painel.estado.value)
}

function aoSalvarProgresso(): void {
  registro.fechar()
  recarregar()
}

function verAtualizacoes(leituraId: string): void {
  painel.fechar()
  void router.push(caminhoDoProgresso(leituraId))
}

function ehItemDaEstante(item: ItemDoCard): item is ItemEstante {
  return 'ultimaLeituraId' in item
}

async function situacaoDoCard(item: ItemDoCard): Promise<ItemEstante | null> {
  if (ehItemDaEstante(item)) return item
  return item.status ? leituraService.consultarItemEstante(item.livroId) : null
}

async function abrirAcoes(item: ItemDoCard): Promise<void> {
  favoritoDoPainel.value = item.favorito
  try {
    await painel.abrir({ livroId: item.livroId, ...item.livro }, await situacaoDoCard(item))
  } catch (erro) {
    if (!(erro instanceof ApiError)) throw erro
    painel.falhou.value = true
  }
}
</script>

<template>
  <div class="pb-space-10">
    <Teleport
      to="#cabecalho-acoes"
      defer
    >
      <div class="hidden items-center gap-space-4 md:flex">
        <RouterLink
          :to="ROTA_DO_HISTORICO"
          class="flex h-10 items-center gap-space-2 rounded-base px-space-3 text-body-strong text-musgo transition-colors duration-dur-fast hover:bg-musgo-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo motion-reduce:transition-none"
        >
          <PhClockCounterClockwise
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
          {{ ROTULO_HISTORICO }}
        </RouterLink>
        <form
          role="search"
          class="w-[320px]"
          @submit.prevent="aplicarBusca(textoDaBusca)"
        >
          <div class="flex h-11 items-center gap-space-3 rounded-base border border-linha bg-papel-elevado px-space-4 transition-colors duration-dur-fast focus-within:border-[1.5px] focus-within:border-musgo">
            <PhMagnifyingGlass
              :size="20"
              weight="regular"
              class="shrink-0 text-grafite-suave"
              aria-hidden="true"
            />
            <input
              :value="textoDaBusca"
              type="search"
              maxlength="100"
              enterkeyhint="search"
              autocomplete="off"
              :placeholder="TEXTOS_DA_BUSCA_NA_ESTANTE.placeholder"
              :aria-label="TEXTOS_DA_BUSCA_NA_ESTANTE.placeholder"
              class="min-w-0 flex-1 bg-transparent text-body text-tinta outline-none placeholder:text-grafite-suave [&::-webkit-search-cancel-button]:hidden"
              data-busca-estante
              @input="aoDigitar"
            >
            <button
              v-if="textoDaBusca"
              type="button"
              class="-mr-space-3 flex size-10 shrink-0 items-center justify-center rounded-base text-grafite focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
              :aria-label="TEXTOS_DA_BUSCA_NA_ESTANTE.limpar"
              @click="limparBusca"
            >
              <PhX
                :size="20"
                weight="regular"
                aria-hidden="true"
              />
            </button>
          </div>
        </form>
      </div>
      <div
        v-if="!buscaAberta"
        class="-mr-space-3 flex items-center md:hidden"
      >
        <RouterLink
          :to="ROTA_DO_HISTORICO"
          class="flex size-12 items-center justify-center rounded-base text-tinta focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
          :aria-label="ROTULO_HISTORICO"
        >
          <PhClockCounterClockwise
            :size="24"
            weight="regular"
            aria-hidden="true"
          />
        </RouterLink>
        <button
          type="button"
          class="flex size-12 items-center justify-center rounded-base text-tinta focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
          :aria-label="TEXTOS_DA_BUSCA_NA_ESTANTE.abrir"
          data-abrir-busca
          @click="buscaAberta = true"
        >
          <PhMagnifyingGlass
            :size="24"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>
    </Teleport>

    <form
      v-if="buscaAberta"
      role="search"
      class="flex items-center gap-space-2 pt-space-4 md:hidden"
      @submit.prevent="aplicarBusca(textoDaBusca)"
    >
      <button
        type="button"
        class="-ml-space-3 flex size-12 shrink-0 items-center justify-center rounded-base text-tinta focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
        :aria-label="TEXTOS_DA_BUSCA_NA_ESTANTE.fechar"
        @click="fecharBusca"
      >
        <PhArrowLeft
          :size="24"
          weight="regular"
          aria-hidden="true"
        />
      </button>
      <div class="flex h-12 min-w-0 flex-1 items-center gap-space-3 rounded-base border border-linha bg-papel-elevado px-space-4 transition-colors duration-dur-fast focus-within:border-[1.5px] focus-within:border-musgo">
        <PhMagnifyingGlass
          :size="20"
          weight="regular"
          class="shrink-0 text-grafite-suave"
          aria-hidden="true"
        />
        <input
          :value="textoDaBusca"
          type="search"
          maxlength="100"
          enterkeyhint="search"
          autocomplete="off"
          :placeholder="TEXTOS_DA_BUSCA_NA_ESTANTE.placeholder"
          :aria-label="TEXTOS_DA_BUSCA_NA_ESTANTE.placeholder"
          class="min-w-0 flex-1 bg-transparent text-body text-tinta outline-none placeholder:text-grafite-suave [&::-webkit-search-cancel-button]:hidden"
          @input="aoDigitar"
        >
        <button
          v-if="textoDaBusca"
          type="button"
          class="-mr-space-3 flex size-12 shrink-0 items-center justify-center rounded-base text-grafite focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
          :aria-label="TEXTOS_DA_BUSCA_NA_ESTANTE.limpar"
          @click="limparBusca"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>
    </form>

    <div
      class="-mx-space-5 flex items-center gap-space-2 overflow-x-auto px-space-5 py-space-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      role="group"
      :aria-label="TEXTOS_DA_ESTANTE.rotuloFiltros"
    >
      <button
        v-for="pill in pills"
        :key="pill.rotulo"
        type="button"
        class="group flex min-h-12 shrink-0 items-center focus-visible:outline-none"
        :aria-pressed="filtroAtivo === pill.status"
        @click="filtrar(pill.status)"
      >
        <span
          class="inline-flex items-center gap-space-1 rounded-full px-space-4 py-space-2 text-caption transition-colors duration-dur-fast group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-musgo"
          :class="filtroAtivo === pill.status ? 'bg-musgo-fundo font-semibold text-musgo' : 'border border-linha text-grafite md:group-hover:bg-linha'"
        >
          {{ pill.rotulo }}
          <span
            v-if="pill.contagem !== null && !estante.carregando.value"
            class="font-mono text-num-inline tabular-nums"
          >{{ pill.contagem }}</span>
        </span>
      </button>
      <span
        class="mx-space-2 h-6 w-px shrink-0 bg-linha"
        aria-hidden="true"
      />
      <button
        type="button"
        class="group flex min-h-12 shrink-0 items-center focus-visible:outline-none"
        :aria-pressed="favoritosAtivo"
        data-pill-favoritos
        @click="filtrar(FILTRO_FAVORITOS)"
      >
        <span
          class="inline-flex items-center gap-space-1 rounded-full px-space-4 py-space-2 text-caption transition-colors duration-dur-fast group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-musgo"
          :class="favoritosAtivo ? 'bg-musgo-fundo font-semibold text-musgo' : 'border border-linha text-grafite md:group-hover:bg-linha'"
        >
          <PhHeart
            :size="16"
            :weight="favoritosAtivo ? 'fill' : 'regular'"
            aria-hidden="true"
          />
          {{ TEXTOS_DO_FILTRO_FAVORITOS.rotulo }}
          <span
            v-if="estante.totalFavoritos.value !== null && !estante.carregando.value"
            class="font-mono text-num-inline tabular-nums"
          >{{ estante.totalFavoritos.value }}</span>
        </span>
      </button>
    </div>

    <div
      v-if="comLista || buscaVazia"
      class="flex min-h-12 items-center justify-between gap-space-3 pb-space-3"
    >
      <p
        class="text-caption text-grafite"
        aria-live="polite"
      >
        <template v-if="!carregando">
          {{ contagem }}
        </template>
      </p>
      <template v-if="!favoritosAtivo">
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
      </template>
    </div>

    <EsqueletoEstante
      v-if="carregando"
      :rotulo="TEXTOS_DA_ESTANTE.carregando"
    />

    <BannerAviso
      v-else-if="falhou"
      variante="erro"
    >
      {{ TEXTOS_DA_ESTANTE.erroTexto }}
      <BotaoTextual
        class="mt-space-2"
        @click="recarregar()"
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
      v-else-if="buscaVazia"
      :icone="PhMagnifyingGlass"
      :titulo="TEXTOS_DA_BUSCA_NA_ESTANTE.vazioTitulo"
      class="mx-auto max-w-[320px] pt-space-6"
      data-busca-vazia
    >
      <p class="mt-space-3 max-w-[280px] text-body text-grafite">
        {{ TEXTOS_DA_BUSCA_NA_ESTANTE.vazioTexto }}
      </p>
      <button
        type="button"
        class="mt-space-6 flex h-12 items-center justify-center rounded-full bg-musgo px-space-8 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
        @click="buscarNoAcervo"
      >
        {{ TEXTOS_DA_BUSCA_NA_ESTANTE.vazioBotao }}
      </button>
    </EstadoVazio>

    <EstadoVazio
      v-else-if="favoritosVazio"
      :icone="PhHeart"
      :titulo="TEXTOS_DO_FILTRO_FAVORITOS.vazioTitulo"
      class="mx-auto max-w-[320px] pt-space-6"
      data-favoritos-vazio
    >
      <p class="mt-space-3 max-w-[280px] text-body text-grafite">
        {{ TEXTOS_DO_FILTRO_FAVORITOS.vazioTexto }}
      </p>
      <button
        type="button"
        class="mt-space-6 flex h-12 items-center justify-center rounded-full bg-musgo px-space-8 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
        @click="filtrar('LIDO')"
      >
        {{ TEXTOS_DO_FILTRO_FAVORITOS.vazioBotao }}
      </button>
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
          v-for="item in itens"
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
        v-if="lista.temMais.value || lista.falhouMais.value"
        :falhou="lista.falhouMais.value"
        @carregar="lista.carregarMais()"
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
      :favorito="favoritoDoPainel"
      @fechar="painel.fechar()"
      @registrar-progresso="abrirRegistro"
      @ver-atualizacoes="verAtualizacoes"
      @atualizado="recarregar()"
      @favorito-alterado="recarregar()"
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
