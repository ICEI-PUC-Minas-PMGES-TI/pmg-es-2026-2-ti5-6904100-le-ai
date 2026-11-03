<script setup lang="ts">
import { PhClockCounterClockwise, PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import LinhaOcorrencia from '../components/historico/LinhaOcorrencia.vue'
import CapaLivro from '../components/livros/CapaLivro.vue'
import FimDaLista from '../components/perfil/FimDaLista.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import EstadoVazio from '../components/ui/EstadoVazio.vue'
import { agruparPorAno, agruparPorLivro } from '../historico/agrupamentos'
import {
  TEXTOS_DO_HISTORICO,
  textoContagem,
  textoLeiturasConcluidas,
  textoLeiturasDoAno,
} from '../historico/textos'
import { useHistorico } from '../historico/useHistorico'
import { leituraService } from '../services/leitura'

const LINHAS_DO_ESQUELETO = 5

const route = useRoute()
const router = useRouter()

const busca = computed(() => {
  const valor = route.query.q
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined
})

const ano = computed(() => {
  const valor = Number(route.query.ano)
  return Number.isInteger(valor) && valor > 0 ? valor : undefined
})

const historico = useHistorico(
  (filtro) => leituraService.listarHistorico(filtro),
  () => ({ ano: ano.value, q: busca.value }),
)

watch([ano, busca], () => void historico.carregar(), { immediate: true })

const textoDaBusca = ref(busca.value ?? '')
watch(busca, (valor) => {
  textoDaBusca.value = valor ?? ''
})

function atualizarQuery(mudancas: { q?: string; ano?: number }): void {
  const query = { ...route.query }
  delete query.q
  delete query.ano
  if (mudancas.q) query.q = mudancas.q
  if (mudancas.ano !== undefined) query.ano = String(mudancas.ano)
  void router.replace({ query })
}

function pesquisar(): void {
  atualizarQuery({ q: textoDaBusca.value.trim(), ano: ano.value })
}

function limparPesquisa(): void {
  textoDaBusca.value = ''
  atualizarQuery({ ano: ano.value })
}

function escolherAno(novo: number | undefined): void {
  atualizarQuery({ q: busca.value, ano: novo })
}

const carregando = computed(() => historico.carregando.value)
const pronta = computed(() => !carregando.value && !historico.falhou.value)
const semNada = computed(
  () => pronta.value && historico.anos.value.length === 0 && busca.value === undefined && ano.value === undefined,
)
const semResultado = computed(() => pronta.value && !semNada.value && historico.itens.value.length === 0)

const totalDoHistorico = computed(() => historico.anos.value.reduce((soma, item) => soma + item.total, 0))
const opcoesDeAno = computed(() => [
  { ano: undefined, rotulo: TEXTOS_DO_HISTORICO.todosOsAnos, total: totalDoHistorico.value },
  ...historico.anos.value.map((item) => ({ ano: item.ano, rotulo: String(item.ano), total: item.total })),
])
const totalDoAno = computed(() => new Map(historico.anos.value.map((item) => [item.ano, item.total])))

const gruposPorAno = computed(() => agruparPorAno(historico.itens.value))
const gruposPorLivro = computed(() => agruparPorLivro(historico.itens.value))
const contagem = computed(() =>
  historico.totais.value ? textoContagem(historico.totais.value, { ano: ano.value, q: busca.value }) : '',
)
</script>

<template>
  <div class="pb-space-10">
    <EstadoVazio
      v-if="semNada"
      :icone="PhClockCounterClockwise"
      solto
      :titulo="TEXTOS_DO_HISTORICO.vazioTitulo"
      class="mx-auto max-w-[320px] pt-space-10"
      data-historico-vazio
    >
      <p class="mt-space-3 max-w-[280px] text-body text-grafite">
        {{ TEXTOS_DO_HISTORICO.vazioTexto }}
      </p>
      <RouterLink
        to="/estante"
        class="mt-space-6 flex h-12 items-center justify-center rounded-full bg-musgo px-space-8 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
      >
        {{ TEXTOS_DO_HISTORICO.vazioBotao }}
      </RouterLink>
    </EstadoVazio>

    <div
      v-else
      class="grid gap-space-4 pt-space-4 md:max-w-[1120px] md:grid-cols-[280px_minmax(0,1fr)] md:items-start md:gap-space-8"
    >
      <aside class="flex flex-col gap-space-4 md:sticky md:top-space-6 md:gap-space-6">
        <form
          role="search"
          @submit.prevent="pesquisar"
        >
          <label
            for="pesquisa-historico"
            class="text-label text-grafite"
          >{{ TEXTOS_DO_HISTORICO.rotuloPesquisa }}</label>
          <div class="mt-space-2 flex h-12 items-center gap-space-3 rounded-base border border-linha bg-papel-elevado px-space-4 transition-colors duration-dur-fast focus-within:border-[1.5px] focus-within:border-musgo md:h-11">
            <PhMagnifyingGlass
              :size="20"
              weight="regular"
              class="shrink-0 text-grafite-suave"
              aria-hidden="true"
            />
            <input
              id="pesquisa-historico"
              v-model="textoDaBusca"
              type="search"
              maxlength="100"
              enterkeyhint="search"
              autocomplete="off"
              :placeholder="TEXTOS_DO_HISTORICO.placeholder"
              aria-describedby="ajuda-pesquisa-historico"
              class="min-w-0 flex-1 bg-transparent text-body text-tinta outline-none placeholder:text-grafite-suave [&::-webkit-search-cancel-button]:hidden"
            >
            <button
              v-if="textoDaBusca"
              type="button"
              class="-mr-space-3 flex size-12 shrink-0 items-center justify-center rounded-base text-grafite focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo md:size-10"
              :aria-label="TEXTOS_DO_HISTORICO.limparPesquisa"
              @click="limparPesquisa"
            >
              <PhX
                :size="20"
                weight="regular"
                aria-hidden="true"
              />
            </button>
          </div>
          <p
            id="ajuda-pesquisa-historico"
            class="mt-space-2 text-caption text-grafite"
          >
            {{ TEXTOS_DO_HISTORICO.ajudaPesquisa }}
          </p>
        </form>

        <div>
          <p class="hidden text-label text-grafite md:block">
            {{ TEXTOS_DO_HISTORICO.rotuloAnos }}
          </p>
          <div
            class="-mx-space-5 flex gap-space-2 overflow-x-auto px-space-5 [scrollbar-width:none] md:mx-0 md:mt-space-2 md:flex-col md:gap-space-1 md:overflow-visible md:px-0"
            role="group"
            :aria-label="TEXTOS_DO_HISTORICO.rotuloAnos"
          >
            <button
              v-for="opcao in opcoesDeAno"
              :key="opcao.rotulo"
              type="button"
              class="flex min-h-12 shrink-0 items-center focus-visible:outline-none md:min-h-11"
              :aria-pressed="ano === opcao.ano"
              @click="escolherAno(opcao.ano)"
            >
              <span
                class="inline-flex w-full items-center justify-between gap-space-3 rounded-full px-space-4 py-space-2 text-caption transition-colors duration-dur-fast md:h-11 md:rounded-base"
                :class="ano === opcao.ano ? 'bg-musgo-fundo font-semibold text-musgo' : 'border border-linha text-grafite md:border-0 md:hover:bg-linha'"
              >
                <span :class="opcao.ano ? 'font-mono tabular-nums' : ''">{{ opcao.rotulo }}</span>
                <span class="hidden md:inline">{{ textoLeiturasDoAno(opcao.total) }}</span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <section class="min-w-0">
        <p
          class="min-h-5 pb-space-3 text-caption text-grafite"
          role="status"
        >
          <template v-if="pronta">
            {{ contagem }}
          </template>
        </p>

        <div
          v-if="carregando"
          aria-busy="true"
          :aria-label="TEXTOS_DO_HISTORICO.carregando"
          data-carregando
        >
          <div class="mb-space-3 h-6 w-[20%] rounded-sm bg-capa-placeholder" />
          <div
            v-for="linha in LINHAS_DO_ESQUELETO"
            :key="linha"
            class="flex items-center gap-space-4 border-b border-linha py-space-4"
          >
            <div class="h-[72px] w-12 bg-capa-placeholder md:h-12 md:w-8" />
            <div class="flex flex-1 flex-col gap-space-2">
              <div class="h-[17px] w-[70%] rounded-sm bg-capa-placeholder" />
              <div class="h-[13px] w-[45%] rounded-sm bg-capa-placeholder" />
            </div>
          </div>
        </div>

        <div
          v-else-if="historico.falhou.value"
          class="flex flex-col items-start gap-space-3"
          data-erro
        >
          <BannerAviso
            variante="erro"
            class="w-full"
          >
            {{ TEXTOS_DO_HISTORICO.erroTexto }}
          </BannerAviso>
          <BotaoTextual @click="historico.carregar()">
            {{ TEXTOS_DO_HISTORICO.erroBotao }}
          </BotaoTextual>
        </div>

        <EstadoVazio
          v-else-if="semResultado"
          :icone="PhMagnifyingGlass"
          solto
          :titulo="TEXTOS_DO_HISTORICO.semResultadoTitulo"
          class="mx-auto max-w-[320px] pt-space-6"
          data-sem-resultado
        >
          <p class="mt-space-3 max-w-[280px] text-body text-grafite">
            {{ ano ? TEXTOS_DO_HISTORICO.semResultadoNoAno(ano) : TEXTOS_DO_HISTORICO.semResultadoTexto }}
          </p>
          <BotaoTextual
            class="mt-space-4"
            @click="ano ? escolherAno(undefined) : limparPesquisa()"
          >
            {{ ano ? TEXTOS_DO_HISTORICO.pesquisarEmTodosOsAnos : TEXTOS_DO_HISTORICO.limparPesquisa }}
          </BotaoTextual>
        </EstadoVazio>

        <template v-else>
          <template v-if="busca">
            <section
              v-for="grupo in gruposPorLivro"
              :key="grupo.livroId"
              class="pt-space-6 first:pt-0"
              data-grupo-livro
            >
              <header class="flex items-center gap-space-4">
                <CapaLivro
                  :url="grupo.livro.capaUrl"
                  class="h-[90px] w-[60px] shrink-0"
                />
                <div class="min-w-0">
                  <h2 class="text-title-sm text-tinta">
                    {{ grupo.livro.titulo }}
                  </h2>
                  <p
                    v-if="grupo.livro.autor"
                    class="text-caption text-grafite"
                  >
                    {{ grupo.livro.autor }}
                  </p>
                  <p class="text-caption text-grafite">
                    {{ textoLeiturasConcluidas(grupo.ocorrencias.length) }}
                  </p>
                </div>
              </header>
              <ul class="ml-[76px] divide-y divide-linha">
                <li
                  v-for="ocorrencia in grupo.ocorrencias"
                  :key="ocorrencia.id"
                >
                  <LinhaOcorrencia
                    :ocorrencia="ocorrencia"
                    :com-livro="false"
                  />
                </li>
              </ul>
            </section>
          </template>

          <template v-else>
            <section
              v-for="grupo in gruposPorAno"
              :key="grupo.ano"
              data-grupo-ano
            >
              <header class="sticky top-0 z-10 flex items-baseline justify-between gap-space-3 bg-papel pb-space-3 pt-space-6">
                <h2 class="font-mono text-title-lg tabular-nums text-tinta">
                  {{ grupo.ano }}
                </h2>
                <p class="text-caption text-grafite">
                  {{ textoLeiturasConcluidas(totalDoAno.get(grupo.ano) ?? grupo.ocorrencias.length) }}
                </p>
              </header>
              <ul class="divide-y divide-linha">
                <li
                  v-for="ocorrencia in grupo.ocorrencias"
                  :key="ocorrencia.id"
                >
                  <LinhaOcorrencia :ocorrencia="ocorrencia" />
                </li>
              </ul>
            </section>
          </template>

          <FimDaLista
            v-if="historico.temMais.value || historico.falhouMais.value"
            :falhou="historico.falhouMais.value"
            :carregando="historico.carregandoMais.value"
            @carregar="historico.carregarMais()"
          />
        </template>
      </section>
    </div>
  </div>
</template>
