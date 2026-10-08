<script setup lang="ts">
import { PhMagnifyingGlass, PhSlidersHorizontal, PhX } from '@phosphor-icons/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CardLivroBusca from '../components/livros/CardLivroBusca.vue'
import ChipsDeFiltros from '../components/livros/ChipsDeFiltros.vue'
import FiltroAssuntos from '../components/livros/FiltroAssuntos.vue'
import FiltrosAvancados from '../components/livros/FiltrosAvancados.vue'
import FimDaLista from '../components/perfil/FimDaLista.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoPrimario from '../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import EstadoVazio from '../components/ui/EstadoVazio.vue'
import SobreposicaoModal from '../components/ui/SobreposicaoModal.vue'
import {
  chipsDosFiltros,
  type FiltrosAplicados,
  filtrosDaQuery,
  filtrosIguais,
  filtrosParaQuery,
  temFiltros,
} from '../livros/filtrosDaBusca'
import { type CriteriosDaTela, useBuscaDeLivros } from '../livros/useBuscaDeLivros'

/**
 * Aba Descobrir (RF-ACV-01, RF-ACV-02), a partir do protótipo `descobrir.html`.
 *
 * - **A partir de 768px o campo vai para a linha do título** (Teleport para `#cabecalho-acoes`,
 *   no padrão de `BuscarLeitorView`), com 560px; abaixo disso é a segunda linha do header.
 * - **A partir de 768px**, painel de 240px à esquerda (Filtros recolhível e Assuntos), chips,
 *   contagem e resultados num bloco só à direita, em grid de duas colunas; abaixo disso, faixa de
 *   chips, contagem à esquerda e lista de uma coluna com divisor.
 * - `q` e `assunto` ficam na URL (`router.replace`), para a busca voltar igual ao sair da página
 *   do livro e ao recarregar. A rolagem, essa, recomeça do topo.
 * - A aterrissagem é magra no Período 1, por decisão (§5.5): sem foco automático, sem bloco de
 *   vazio, sem espaço reservado. Os assuntos têm skeleton enquanto chegam e "Tentar de novo" se
 *   falharem, para a aba não parecer quebrada no cold start.
 * - A URL também manda: tocar na aba Descobrir já estando nela (`/descobrir` sem `q`) volta à
 *   aterrissagem, em vez de deixar a tela com uma busca que a URL não tem.
 * - Um único `role="status"` fixo anuncia a contagem e o "Nenhum livro encontrado" (§9): região
 *   que nasce junto com o texto não é lida.
 * - **Filtros avançados** (F-ACV-DESCOBERTA, descobrir.md do Período 2): a partir de 768px, bloco
 *   `Filtros` no topo do painel, acima de `Assuntos`, recolhível e fechado ao abrir a tela (decisão
 *   do dono, 07/10/2026, diverge do protótipo, que o põe abaixo e sempre aberto); abaixo disso,
 *   botão ao lado do campo, com badge da contagem, que abre uma bottom sheet. Os aplicados viram
 *   chips e também vão para a URL.
 */
const route = useRoute()
const router = useRouter()

const consultaLarga =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 768px)')
    : null
const largo = ref(consultaLarga?.matches === true)
function acompanharLargura(evento: MediaQueryListEvent): void {
  largo.value = evento.matches
}

function textoDaQuery(valor: unknown): string | null {
  return typeof valor === 'string' && valor !== '' ? valor : null
}

function criteriosDaUrl(): CriteriosDaTela {
  return {
    q: textoDaQuery(route.query.q),
    assunto: textoDaQuery(route.query.assunto),
    filtros: filtrosDaQuery(route.query),
  }
}

function mesmosCriterios(a: CriteriosDaTela, b: CriteriosDaTela): boolean {
  return a.q === b.q && a.assunto === b.assunto && filtrosIguais(a.filtros, b.filtros)
}

/** O que a própria tela pôs na URL, para o `watch` da rota não tratar isso como navegação. */
let criteriosNaUrl = criteriosDaUrl()

const busca = useBuscaDeLivros({
  inicial: criteriosNaUrl,
  aoBuscar: (criterios) => {
    criteriosNaUrl = criterios
    void router.replace({
      query: {
        ...route.query,
        q: criterios.q ?? undefined,
        assunto: criterios.assunto ?? undefined,
        ...filtrosParaQuery(criterios.filtros),
      },
    })
  },
})
const {
  consulta,
  assunto,
  filtros,
  assuntos,
  estadoDosAssuntos,
  estado,
  grupos,
  totalItens,
  coldStart,
  carregandoMais,
  falhouMais,
  geracao,
  temMais,
} = busca

onMounted(() => {
  consultaLarga?.addEventListener?.('change', acompanharLargura)
  busca.iniciar()
})
onBeforeUnmount(() => {
  consultaLarga?.removeEventListener?.('change', acompanharLargura)
  busca.descartar()
})

watch(
  () => route.query,
  () => {
    const daUrl = criteriosDaUrl()
    if (mesmosCriterios(daUrl, criteriosNaUrl)) {
      return
    }
    criteriosNaUrl = daUrl
    busca.aplicarCriterios(daUrl)
  },
)

const chips = computed(() => chipsDosFiltros(filtros.value))
const comFiltros = computed(() => temFiltros(filtros.value))
const folhaAberta = ref(false)

const rotuloDoBotaoDeFiltros = computed(() => {
  const total = chips.value.length
  if (total === 0) {
    return 'Filtros'
  }
  return total === 1 ? 'Filtros, 1 ativo' : `Filtros, ${total} ativos`
})

function aplicarFiltros(novos: FiltrosAplicados): void {
  folhaAberta.value = false
  busca.aplicarFiltros(novos)
}

function limparFiltros(): void {
  folhaAberta.value = false
  busca.limparFiltros()
}

const campo = ref<HTMLInputElement | null>(null)

function aoDigitar(evento: Event): void {
  busca.alterarConsulta((evento.target as HTMLInputElement).value)
}

/** O botão some com o texto: o foco volta ao campo, e não cai no `body`. */
function limpar(): void {
  busca.limparConsulta()
  void nextTick(() => campo.value?.focus())
}

const anuncio = computed(() => {
  if (estado.value === 'buscando' && coldStart.value) {
    return 'O servidor está iniciando. Isso pode levar alguns segundos.'
  }
  if (estado.value === 'resultados') {
    return totalItens.value === 1 ? '1 livro encontrado' : `${totalItens.value} livros encontrados`
  }
  if (estado.value === 'vazio') {
    return comFiltros.value ? 'Nenhum livro com esses filtros' : 'Nenhum livro encontrado'
  }
  return ''
})
</script>

<template>
  <div class="max-w-[1120px] pb-space-10">
    <Teleport
      to="#cabecalho-acoes"
      defer
      :disabled="!largo"
    >
      <form
        role="search"
        :class="largo ? 'w-[560px] max-w-full' : 'pt-space-1'"
        @submit.prevent
      >
        <div class="flex items-center gap-space-3">
          <div class="flex h-12 min-w-0 flex-1 items-center gap-space-3 rounded-base border border-linha bg-papel-elevado px-space-4 transition-colors duration-dur-fast focus-within:border-[1.5px] focus-within:border-musgo md:h-11">
            <PhMagnifyingGlass
              :size="20"
              weight="regular"
              class="shrink-0 text-grafite-suave"
              aria-hidden="true"
            />
            <input
              ref="campo"
              :value="consulta"
              type="search"
              maxlength="200"
              enterkeyhint="search"
              autocomplete="off"
              placeholder="Título, autor, editora ou ISBN"
              aria-label="Buscar por título, autor, editora ou ISBN"
              class="min-w-0 flex-1 bg-transparent text-body text-tinta outline-none placeholder:text-grafite-suave [&::-webkit-search-cancel-button]:hidden"
              @input="aoDigitar"
            >
            <button
              v-if="consulta"
              type="button"
              class="-mr-space-3 flex size-12 shrink-0 items-center justify-center rounded-base text-grafite focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo md:size-10"
              aria-label="Limpar busca"
              @click="limpar"
            >
              <PhX
                :size="20"
                weight="regular"
                aria-hidden="true"
              />
            </button>
          </div>
          <button
            v-if="!largo"
            type="button"
            class="relative flex size-12 shrink-0 items-center justify-center rounded-base focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
            :class="chips.length ? 'bg-musgo-fundo text-musgo' : 'border border-linha bg-papel-elevado text-grafite'"
            :aria-label="rotuloDoBotaoDeFiltros"
            aria-haspopup="dialog"
            @click="folhaAberta = true"
          >
            <PhSlidersHorizontal
              :size="20"
              :weight="chips.length ? 'fill' : 'regular'"
              aria-hidden="true"
            />
            <!-- O badge passa 4px da borda do botão, como o do sino. O `pt-space-1` do formulário
                 é a folga dele: o `<main>` do shell rola e cortaria o que sobe além do topo. -->
            <span
              v-if="chips.length"
              class="absolute -right-space-1 -top-space-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-musgo px-space-1 font-mono text-[11px] font-semibold leading-none text-papel"
              aria-hidden="true"
            >{{ chips.length }}</span>
          </button>
        </div>
      </form>
    </Teleport>

    <SobreposicaoModal
      :aberta="folhaAberta && !largo"
      rotulo="Filtros"
      foco-inicial="[data-foco-inicial]"
      somente-folha
      @fechar="folhaAberta = false"
    >
      <div class="max-h-[80vh] overflow-y-auto">
        <FiltrosAvancados
          :aplicados="filtros"
          variante="folha"
          @aplicar="aplicarFiltros"
          @limpar="limparFiltros"
        />
      </div>
    </SobreposicaoModal>

    <div class="mt-space-4 flex flex-col md:mt-space-3 md:grid md:grid-cols-[280px_minmax(0,1fr)] md:gap-x-space-8 md:gap-y-space-3">
      <!-- Coluna da esquerda a partir de 768px: Filtros (recolhível, começa fechado) e Assuntos. -->
      <div class="md:col-start-1 md:row-start-1 md:self-start">
        <template v-if="largo">
          <FiltrosAvancados
            :aplicados="filtros"
            variante="painel"
            @aplicar="aplicarFiltros"
            @limpar="limparFiltros"
          />
          <div
            class="my-space-5 h-px bg-linha"
            aria-hidden="true"
          />
        </template>
        <FiltroAssuntos
          v-if="assuntos.length"
          :assuntos="assuntos"
          :ativo="assunto"
          @alternar="busca.alternarAssunto"
        />
        <ul
          v-else-if="estadoDosAssuntos === 'carregando'"
          class="entrada -mx-space-5 flex gap-space-2 overflow-hidden px-space-5 py-space-1 md:mx-0 md:mt-space-7 md:flex-col md:gap-space-1 md:px-0 md:py-0"
          aria-hidden="true"
        >
          <li
            v-for="n in 8"
            :key="n"
            class="h-10 w-24 shrink-0 rounded-full bg-capa-placeholder md:h-9 md:w-full md:rounded-base"
          />
        </ul>
        <div
          v-else-if="estadoDosAssuntos === 'erro'"
          class="flex flex-wrap items-center gap-x-space-3 md:flex-col md:items-start md:px-space-3"
        >
          <p class="text-caption text-grafite">
            Não foi possível carregar os assuntos.
          </p>
          <BotaoTextual
            class="min-h-12 md:min-h-10"
            @click="busca.carregarAssuntos()"
          >
            Tentar de novo
          </BotaoTextual>
        </div>
      </div>

      <!-- Coluna da direita num bloco só: com o painel alto ao lado, linhas separadas de grid
           dividiriam a altura dele e empurrariam os chips e os resultados para baixo. -->
      <div class="min-w-0 md:col-start-2 md:row-start-1">
        <ChipsDeFiltros
          v-if="chips.length"
          :chips="chips"
          class="mt-space-2 md:mt-0"
          @remover="busca.removerFiltro"
          @limpar="limparFiltros"
        />

        <p
          role="status"
          :class="estado === 'resultados'
            ? 'mt-space-2 text-caption text-grafite md:mb-space-3 md:text-right'
            : 'sr-only'"
        >
          {{ anuncio }}
        </p>

        <section aria-label="Resultados da busca">
          <div
            v-if="estado === 'buscando'"
            class="entrada mt-space-2 md:mt-0"
            aria-busy="true"
          >
            <!-- Anunciado pela região de status fixa: esta nasce com o texto e não seria lida. -->
            <p
              v-if="coldStart"
              class="mb-space-3 text-caption text-grafite"
            >
              O servidor está iniciando. Isso pode levar alguns segundos.
            </p>
            <ul
              class="divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0"
              aria-hidden="true"
            >
              <li
                v-for="n in 6"
                :key="n"
                class="flex gap-space-4 py-space-4 md:p-space-3"
                :class="n === 6 ? 'hidden md:flex' : ''"
              >
                <span class="h-[120px] w-20 shrink-0 bg-capa-placeholder" />
                <span class="flex flex-1 flex-col gap-space-2">
                  <span class="h-[18px] w-[70%] rounded-sm bg-capa-placeholder" />
                  <span class="h-[15px] w-[45%] rounded-sm bg-capa-placeholder" />
                  <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
                </span>
              </li>
            </ul>
          </div>

          <template v-else-if="estado === 'resultados'">
            <ul
              :key="geracao"
              class="mt-space-1 divide-y divide-linha md:mt-0 md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0"
            >
              <li
                v-for="grupo in grupos"
                :key="grupo.principal.id"
              >
                <CardLivroBusca :grupo="grupo" />
              </li>
            </ul>
            <FimDaLista
              v-if="temMais || falhouMais || carregandoMais"
              :falhou="falhouMais"
              :carregando="carregandoMais"
              @carregar="busca.carregarMais()"
            />
          </template>

          <EstadoVazio
            v-else-if="estado === 'vazio' && comFiltros"
            :icone="PhSlidersHorizontal"
            solto
            titulo="Nenhum livro com esses filtros"
            class="mx-auto mt-space-12 max-w-[320px] md:mt-space-16 md:max-w-[440px]"
          >
            <p class="mt-space-6 max-w-[280px] text-body text-grafite">
              Remova um filtro ou amplie a faixa de páginas para ver mais resultados.
            </p>
            <div class="mt-space-6 flex w-full justify-center md:w-auto">
              <BotaoPrimario
                class="w-full md:w-auto"
                @click="limparFiltros"
              >
                Limpar filtros
              </BotaoPrimario>
            </div>
          </EstadoVazio>

          <EstadoVazio
            v-else-if="estado === 'vazio'"
            :icone="PhMagnifyingGlass"
            solto
            titulo="Nenhum livro encontrado"
            class="mx-auto mt-space-12 max-w-[320px] md:mt-space-16 md:max-w-[440px]"
          >
            <p class="mt-space-6 max-w-[280px] text-body text-grafite">
              Confira a grafia ou tente pelo ISBN. Se o livro não está no acervo, você pode cadastrá-lo.
            </p>
            <div class="mt-space-6 flex w-full flex-col items-center gap-space-3 md:w-auto md:flex-row md:gap-space-5">
              <BotaoPrimario
                class="w-full md:w-auto"
                @click="router.push('/descobrir/adicionar')"
              >
                Cadastrar por ISBN
              </BotaoPrimario>
              <BotaoTextual
                class="min-h-12 md:min-h-10"
                @click="router.push('/descobrir/adicionar/pessoal')"
              >
                Cadastrar livro pessoal
              </BotaoTextual>
            </div>
          </EstadoVazio>

          <BannerAviso
            v-else-if="estado === 'erro'"
            variante="erro"
            triangulo
            class="mt-space-4 md:mt-0"
          >
            Não foi possível carregar os resultados. Verifique sua conexão e tente de novo.
            <!-- Em linha própria: o botão na linha do texto a deixava mais alta, e o texto
                 descia em relação ao ícone. -->
            <span class="mt-space-1 flex">
              <BotaoTextual @click="busca.tentarDeNovo()">
                Tentar de novo
              </BotaoTextual>
            </span>
          </BannerAviso>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Um único fade de entrada no skeleton (descobrir.md §4.3); sob movimento reduzido, a regra
   global de `styles.css` zera a animação. */
.entrada {
  animation: surgir var(--duration-base) var(--easing-out);
}

@keyframes surgir {
  from {
    opacity: 0;
  }
}
</style>
