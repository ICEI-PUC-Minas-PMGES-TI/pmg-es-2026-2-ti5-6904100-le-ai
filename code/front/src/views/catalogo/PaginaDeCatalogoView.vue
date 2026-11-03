<script setup lang="ts">
import { PhBookOpen, PhBooks, PhWarning } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import CardLivroBusca from '../../components/livros/CardLivroBusca.vue'
import FimDaLista from '../../components/perfil/FimDaLista.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import { agruparEdicoes } from '../../livros/agruparEdicoes'
import { agruparSerie, type GrupoDaSerie } from '../../livros/livrosDaSerie'
import { usePaginaDeCatalogo } from '../../livros/usePaginaDeCatalogo'
import {
  acervoService,
  type AutorResumo,
  type LivroDaSerieResumo,
  type PaginaDaEditora,
  type PaginaDaSerie,
  type PaginaDoAutor,
} from '../../services/acervo'

/**
 * Páginas de autor, editora e série (RF-ACV-10/11/12, F-ACV-DESCOBERTA), a partir dos protótipos
 * `pagina-do-autor.html`, `pagina-da-editora.html` e `pagina-da-serie.html`: o mesmo esqueleto de
 * página de catálogo, que **não é perfil** (sem seguir, compartilhar nem conteúdo de usuário).
 *
 * - Identidade: o nome (h1) e `N livros no acervo`, de `livros.totalItens`, que conta edições. Na
 *   web, `<Tipo> · N livros no acervo`. Sem livros, a contagem some (nunca `0 livros`).
 * - Autor: `Biografia` só quando a OpenLibrary tem uma; `null` não deixa título nem bloco vazio.
 * - Série: autoria com link para cada autor, `Livro N` em cada card, as edições agrupadas só dentro
 *   do mesmo número, e os sem número no fim, sob `Sem número na série`.
 * - Livros por rolagem infinita, em lista no mobile e em grid na web; a falha da página seguinte
 *   mantém os carregados e oferece "Tentar de novo".
 * - Selo de estante nos cards fica fora desta entrega (Pendências da F-ACV-DESCOBERTA).
 */
type Tipo = 'autor' | 'editora' | 'serie'
type Resposta = PaginaDoAutor | PaginaDaEditora | PaginaDaSerie

const props = defineProps<{ tipo: Tipo }>()

const ROTULO: Record<Tipo, string> = { autor: 'Autor', editora: 'Editora', serie: 'Série' }

const route = useRoute()
const router = useRouter()

const catalogo = usePaginaDeCatalogo<Resposta>((id, page) => {
  if (props.tipo === 'autor') {
    return acervoService.obterAutor(id, page)
  }
  return props.tipo === 'editora' ? acervoService.obterEditora(id, page) : acervoService.obterSerie(id, page)
})
const { estado, coldStart, pagina, livros, totalItens, carregandoMais, falhouMais, temMais } = catalogo

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string') {
      void catalogo.carregar(id)
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => catalogo.descartar())

const rotulo = computed(() => ROTULO[props.tipo])
const contagem = computed(() => (totalItens.value === 1 ? '1 livro no acervo' : `${totalItens.value} livros no acervo`))
const semLivros = computed(() => estado.value === 'pronta' && livros.value.length === 0)

const biografia = computed(() =>
  props.tipo === 'autor' ? ((pagina.value as PaginaDoAutor | null)?.biografia ?? null) : null,
)
const autoresDaSerie = computed<AutorResumo[]>(() =>
  props.tipo === 'serie' ? ((pagina.value as PaginaDaSerie | null)?.autores ?? []) : [],
)

/** Autor e editora: edições vizinhas agrupadas, como na busca. Série: por número de ordem. */
const grupos = computed<GrupoDaSerie[]>(() =>
  props.tipo === 'serie'
    ? agruparSerie(livros.value as LivroDaSerieResumo[]).numerados
    : agruparEdicoes(livros.value).map((grupo) => ({ numero: null, grupo })),
)
const semNumero = computed<GrupoDaSerie[]>(() =>
  props.tipo === 'serie' ? agruparSerie(livros.value as LivroDaSerieResumo[]).semNumero : [],
)

function voltar(): void {
  if (window.history.state?.back) {
    router.back()
  } else {
    void router.push('/descobrir')
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1120px] pb-space-12 pt-space-2 md:pt-space-6">
    <!-- Região fixa: a que nasce junto com o texto do cold start não é lida pelo leitor de tela. -->
    <p
      role="status"
      class="sr-only"
    >
      {{ estado === 'carregando' && coldStart ? 'O servidor está iniciando. Isso pode levar alguns segundos.' : '' }}
    </p>

    <div
      v-if="estado === 'carregando'"
      class="entrada"
      aria-busy="true"
      :aria-label="`Carregando ${rotulo.toLowerCase()}`"
    >
      <div class="h-8 w-[60%] rounded-sm bg-capa-placeholder md:h-10 md:w-[40%]" />
      <div class="mt-space-2 h-[15px] w-[35%] rounded-sm bg-capa-placeholder md:w-[20%]" />
      <h2 class="mt-space-8 text-title-lg text-tinta">
        Livros
      </h2>
      <ul
        class="mt-space-3 divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0 xl:grid-cols-3"
        aria-hidden="true"
      >
        <li
          v-for="n in 6"
          :key="n"
          class="flex gap-space-4 py-space-4 md:p-space-3"
          :class="n > 4 ? 'hidden md:flex' : ''"
        >
          <span class="h-[120px] w-20 shrink-0 bg-capa-placeholder" />
          <span class="flex flex-1 flex-col gap-space-2">
            <span class="h-[18px] w-[70%] rounded-sm bg-capa-placeholder" />
            <span class="h-[15px] w-[45%] rounded-sm bg-capa-placeholder" />
            <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
          </span>
        </li>
      </ul>
      <p
        v-if="coldStart"
        class="mt-space-3 text-caption text-grafite"
        aria-hidden="true"
      >
        O servidor está iniciando. Isso pode levar alguns segundos.
      </p>
    </div>

    <div
      v-else-if="estado === 'erro' || estado === 'nao-encontrada'"
      class="mx-auto flex max-w-[360px] flex-col items-center gap-space-5 pt-space-16 text-center"
      role="alert"
    >
      <component
        :is="estado === 'erro' ? PhWarning : PhBookOpen"
        :size="32"
        weight="regular"
        :class="estado === 'erro' ? 'text-rubi' : 'text-grafite-suave'"
        aria-hidden="true"
      />
      <h2 class="text-title text-tinta">
        {{ estado === 'erro' ? 'Não foi possível abrir esta página' : 'Não encontramos esta página' }}
      </h2>
      <p class="text-body text-grafite">
        {{
          estado === 'erro'
            ? 'A conexão falhou antes de carregar os dados. Tente de novo em alguns instantes.'
            : 'Ela pode ter saído do acervo. Volte e busque de novo.'
        }}
      </p>
      <BotaoPrimario
        v-if="estado === 'erro'"
        class="w-auto"
        @click="catalogo.carregar()"
      >
        Tentar de novo
      </BotaoPrimario>
      <BotaoTextual
        v-else
        class="min-h-12 md:min-h-10"
        @click="voltar"
      >
        Voltar
      </BotaoTextual>
    </div>

    <article v-else-if="pagina">
      <header>
        <h1 class="line-clamp-2 text-title-lg text-tinta md:text-display">
          {{ pagina.nome }}
        </h1>
        <div class="mt-space-1 flex flex-wrap items-baseline gap-x-space-3 gap-y-space-1">
          <p
            v-if="autoresDaSerie.length && !semLivros"
            class="text-body text-musgo"
          >
            de
            <template
              v-for="(autor, indice) in autoresDaSerie"
              :key="autor.id"
            >
              <RouterLink
                :to="`/descobrir/autores/${autor.id}`"
                class="underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {{ autor.nome }}
              </RouterLink><template v-if="indice < autoresDaSerie.length - 1">
                ,
              </template>
            </template>
          </p>
          <p
            v-if="!semLivros"
            class="text-caption text-grafite"
          >
            <span class="hidden md:inline">{{ rotulo }} · </span>{{ contagem }}
          </p>
        </div>
      </header>

      <section
        v-if="biografia"
        class="entrada mt-space-6 md:mt-space-8"
      >
        <h2 class="text-title-lg text-tinta">
          Biografia
        </h2>
        <p class="mt-space-3 max-w-[68ch] whitespace-pre-line text-body text-tinta md:text-body-lg">
          {{ biografia }}
        </p>
        <p class="mt-space-2 text-caption text-grafite-suave">
          Fonte: OpenLibrary
        </p>
      </section>

      <section class="mt-space-6 md:mt-space-8">
        <h2 class="text-title-lg text-tinta">
          Livros
        </h2>

        <EstadoVazio
          v-if="semLivros"
          :icone="PhBooks"
          solto
          titulo="Nenhum livro no acervo"
          class="mx-auto mt-space-10 max-w-[320px] md:max-w-[440px]"
        >
          <p class="mt-space-4 text-body text-grafite">
            Os livros de {{ pagina.nome }} não estão no acervo no momento.
          </p>
          <BotaoTextual
            class="mt-space-4 min-h-12 md:min-h-10"
            @click="router.push('/descobrir')"
          >
            Buscar no Descobrir
          </BotaoTextual>
        </EstadoVazio>

        <template v-else>
          <ul class="mt-space-3 divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0 xl:grid-cols-3">
            <li
              v-for="item in grupos"
              :key="item.grupo.principal.id"
            >
              <CardLivroBusca
                :grupo="item.grupo"
                :numero-na-serie="item.numero"
              />
            </li>
          </ul>

          <template v-if="semNumero.length">
            <h3 class="mt-space-6 text-label text-grafite md:mt-space-8">
              Sem número na série
            </h3>
            <ul class="mt-space-2 divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0 xl:grid-cols-3">
              <li
                v-for="item in semNumero"
                :key="item.grupo.principal.id"
              >
                <CardLivroBusca :grupo="item.grupo" />
              </li>
            </ul>
          </template>

          <ul
            v-if="carregandoMais"
            class="entrada divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0 xl:grid-cols-3"
            aria-hidden="true"
          >
            <li
              v-for="n in 2"
              :key="n"
              class="flex gap-space-4 py-space-4 md:p-space-3"
            >
              <span class="h-[120px] w-20 shrink-0 bg-capa-placeholder" />
              <span class="flex flex-1 flex-col gap-space-2">
                <span class="h-[18px] w-[70%] rounded-sm bg-capa-placeholder" />
                <span class="h-[15px] w-[45%] rounded-sm bg-capa-placeholder" />
              </span>
            </li>
          </ul>

          <BannerAviso
            v-if="falhouMais"
            variante="erro"
            triangulo
            class="mt-space-4"
          >
            Não foi possível carregar mais livros. Verifique sua conexão e tente de novo.
            <!-- Em linha própria: o botão na linha do texto a deixava mais alta, e o texto
                 descia em relação ao ícone. -->
            <span class="mt-space-1 flex">
              <BotaoTextual @click="catalogo.carregarMais()">
                Tentar de novo
              </BotaoTextual>
            </span>
          </BannerAviso>
          <FimDaLista
            v-else-if="temMais"
            :falhou="false"
            :carregando="carregandoMais"
            @carregar="catalogo.carregarMais()"
          />
        </template>
      </section>
    </article>
  </div>
</template>

<style scoped>
/* Um único fade de entrada no skeleton e na biografia que chega; sob movimento reduzido, a regra
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
