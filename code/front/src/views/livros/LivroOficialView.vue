<script setup lang="ts">
import { PhBookOpen, PhWarning } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import BlocoSuaAvaliacao from '../../components/livros/BlocoSuaAvaliacao.vue'
import CapaLivro from '../../components/livros/CapaLivro.vue'
import CardResenha from '../../components/livros/CardResenha.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import { formatarPaginas } from '../../livros/formatos'
import { useLivroOficial } from '../../livros/useLivroOficial'
import { useMinhaAvaliacao } from '../../livros/useMinhaAvaliacao'

/**
 * Página do livro oficial (RF-ACV-04, RF-ACV-18, RF-ACV-19), a partir do protótipo
 * `pagina-do-livro.html`.
 *
 * - **A partir de 1024px, duas colunas**: capa e ficha à esquerda, fixas ao rolar; título,
 *   sinopse e resenhas à direita, com as resenhas em grid de dois cards. **Entre 768 e 1024px**,
 *   uma coluna com a capa de 200px no topo. **Abaixo de 768px**, o desenho do mobile.
 * - A página abre inteira enquanto a sinopse chega (RN-19.5); só a seção dela fica em skeleton.
 *   Ausência é texto neutro, nunca erro.
 * - "Sua avaliação" (F-AVA) fica entre o cabeçalho e a sinopse e carrega à parte, do `leitura`: se
 *   ele estiver lento, a página abre igual. Estante e progresso são de F-EST e F-PRG e entram com
 *   elas, sem espaço reservado aqui. Trocar de livro na mesma rota recarrega a página.
 */
const route = useRoute()
const router = useRouter()
const pagina = useLivroOficial()
const minhaAvaliacao = useMinhaAvaliacao()
const {
  estado,
  coldStart,
  livro,
  sinopse,
  sinopseDemorou,
  resenhas,
  resenhasIndisponiveis,
  carregandoResenhas,
  falhouMaisResenhas,
  mensagemDoErro,
  temMaisResenhas,
} = pagina

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string') {
      void pagina.carregar(id)
      void minhaAvaliacao.carregar(id)
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => pagina.descartar())

const autores = computed(() => livro.value?.autores.map((autor) => autor.nome).join(', ') || null)
const rotaDoEditor = computed(() => ({
  name: 'escrever-resenha',
  params: { id: String(route.params.id) },
  query: route.query.origem ? { origem: String(route.query.origem) } : {},
}))
const livroAvaliado = computed(() => ({
  titulo: livro.value?.titulo ?? '',
  autor: autores.value,
  capaUrl: livro.value?.capa.url ?? null,
}))
/** `Todavia · 2019 · 264 páginas`: só o que existe. */
const metadados = computed(() => {
  if (!livro.value) {
    return ''
  }
  const { editora, anoPublicacao, paginas } = livro.value
  return [editora, anoPublicacao === null ? null : String(anoPublicacao), formatarPaginas(paginas)]
    .filter((parte): parte is string => Boolean(parte))
    .join(' · ')
})
const ficha = computed(() => {
  if (!livro.value) {
    return []
  }
  const linhas: { rotulo: string; valor: string }[] = []
  if (autores.value) {
    linhas.push({ rotulo: 'Autor', valor: autores.value })
  }
  if (livro.value.editora) {
    linhas.push({ rotulo: 'Editora', valor: livro.value.editora })
  }
  linhas.push({ rotulo: 'ISBN', valor: livro.value.isbn })
  return linhas
})
const semResenhas = computed(() => resenhas.value.length === 0 && !resenhasIndisponiveis.value)
const aguardandoSinopse = computed(
  () => (sinopse.value.status === 'pendente' || sinopse.value.status === 'nao_consultada') && !sinopseDemorou.value,
)

function voltar(): void {
  if (window.history.state?.back) {
    router.back()
  } else {
    void router.push(route.query.origem === 'estante' ? '/estante' : '/descobrir')
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1120px] pb-space-12 pt-space-2 md:pt-space-6">
    <div
      v-if="estado === 'carregando'"
      class="entrada flex flex-col items-center gap-space-3 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-space-10"
      aria-busy="true"
      aria-label="Carregando livro"
    >
      <div class="aspect-[2/3] w-[40%] bg-capa-placeholder md:w-[200px] lg:w-[280px]" />
      <div class="flex w-full flex-col items-center gap-space-3 lg:items-start">
        <div class="h-8 w-[70%] rounded-sm bg-capa-placeholder" />
        <div class="h-[18px] w-[45%] rounded-sm bg-capa-placeholder" />
        <div class="mt-space-6 h-12 w-full rounded-full bg-capa-placeholder lg:hidden" />
        <div class="h-12 w-full rounded-full bg-capa-placeholder lg:hidden" />
        <p
          v-if="coldStart"
          class="mt-space-3 text-caption text-grafite"
          role="status"
        >
          O servidor está iniciando. Isso pode levar alguns segundos.
        </p>
      </div>
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
        {{ estado === 'erro' ? 'Não foi possível abrir este livro' : 'Não encontramos este livro' }}
      </h2>
      <p class="text-body text-grafite">
        {{
          estado === 'erro'
            ? mensagemDoErro ?? 'A conexão falhou antes de carregar os dados. Tente de novo em alguns instantes.'
            : 'Ele pode ter saído do acervo. Volte e busque de novo.'
        }}
      </p>
      <BotaoPrimario
        v-if="estado === 'erro'"
        @click="pagina.carregar()"
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

    <article
      v-else-if="livro"
      class="flex flex-col lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-space-10"
    >
      <!-- O título vem primeiro no DOM, para o leitor de tela começar pelo h1; a ordem visual vem de
           `order` abaixo de 1024px e da posição no grid acima. -->
      <header class="order-2 mt-space-5 text-center lg:order-none lg:col-start-2 lg:row-start-1 lg:mt-0 lg:text-left">
        <h1 class="text-display text-tinta lg:text-display-hero">
          {{ livro.titulo }}
        </h1>
        <p
          v-if="autores"
          class="mt-space-2 text-body text-grafite lg:text-title-sm"
        >
          {{ autores }}
        </p>
        <p class="mt-space-1 text-caption text-grafite-suave">
          {{ metadados }}
        </p>
      </header>

      <!-- Abaixo de 1024px a coluna se desfaz (`contents`) e a ordem vem de `order`: capa, título,
           sinopse, ficha e resenhas, como no mobile. -->
      <aside class="contents lg:sticky lg:top-space-8 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:flex-col lg:self-start">
        <CapaLivro
          :url="livro.capa.url"
          :rotulo="`Capa de ${livro.titulo}`"
          :titulo="livro.titulo"
          :autor="autores"
          class="order-1 mx-auto aspect-[2/3] w-[40%] shadow-2 md:w-[200px] lg:order-none lg:mx-0 lg:w-[280px]"
        />
        <section class="order-5 mt-space-6 lg:order-none">
          <h2 class="text-title-lg text-tinta">
            Ficha
          </h2>
          <dl class="mt-space-3 divide-y divide-linha">
            <div
              v-for="linha in ficha"
              :key="linha.rotulo"
              class="flex items-start justify-between gap-space-4 py-space-3"
            >
              <dt class="text-label text-grafite">
                {{ linha.rotulo }}
              </dt>
              <dd class="text-right text-body text-tinta">
                {{ linha.valor }}
              </dd>
            </div>
          </dl>
        </section>
      </aside>

      <div class="contents lg:col-start-2 lg:row-start-2 lg:flex lg:flex-col">
        <BlocoSuaAvaliacao
          class="order-3 mt-space-8 lg:order-none"
          :avaliacao="minhaAvaliacao"
          :livro="livroAvaliado"
          :rota-do-editor="rotaDoEditor"
        />

        <section
          class="order-4 mt-space-6 lg:order-none lg:mt-space-8"
          aria-live="polite"
        >
          <h2 class="text-title-lg text-tinta">
            Sinopse
          </h2>
          <div
            v-if="aguardandoSinopse"
            class="entrada mt-space-3 flex max-w-[68ch] flex-col gap-space-3"
            aria-hidden="true"
          >
            <span class="h-5 w-full rounded-sm bg-capa-placeholder" />
            <span class="h-5 w-[96%] rounded-sm bg-capa-placeholder" />
            <span class="h-5 w-full rounded-sm bg-capa-placeholder" />
            <span class="h-5 w-[62%] rounded-sm bg-capa-placeholder" />
          </div>
          <p
            v-else-if="sinopse.status === 'disponivel'"
            class="mt-space-3 max-w-[68ch] whitespace-pre-line font-editorial text-body-lg text-tinta"
          >
            {{ sinopse.texto }}
          </p>
          <!-- Só a ausência usa grafite-suave (design): ela não pede nada ao leitor. Os outros dois
               avisos dizem o que fazer, e precisam do contraste AA do grafite. -->
          <p
            v-else
            class="mt-space-3 text-body"
            :class="sinopse.status === 'ausente' ? 'text-grafite-suave' : 'text-grafite'"
          >
            {{
              sinopse.status === 'ausente'
                ? 'Este livro ainda não tem sinopse no acervo.'
                : sinopse.status === 'falha_transitoria'
                  ? 'Não conseguimos buscar a sinopse agora. Ela deve aparecer numa próxima visita.'
                  : 'A sinopse ainda está a caminho. Volte daqui a pouco.'
            }}
          </p>
        </section>

        <section class="order-6 mt-space-6 lg:order-none lg:mt-space-8">
          <div class="flex flex-wrap items-baseline gap-x-space-3">
            <h2 class="text-title-lg text-tinta">
              Resenhas
            </h2>
            <span
              v-if="semResenhas"
              class="text-caption text-grafite"
            >Nenhuma resenha ainda</span>
          </div>
          <template v-if="resenhasIndisponiveis">
            <p
              class="mt-space-3 text-body text-grafite"
              role="alert"
            >
              Não foi possível carregar as resenhas.
            </p>
            <BotaoTextual
              class="mt-space-1 min-h-12 md:min-h-10"
              :disabled="carregandoResenhas"
              @click="pagina.carregarResenhas()"
            >
              Tentar de novo
            </BotaoTextual>
          </template>
          <!-- A lista é filtrada por RN-08: "sem resenhas" pode ser "nenhuma para você". -->
          <div
            v-else-if="semResenhas"
            class="mt-space-3"
          >
            <p class="text-body text-grafite">
              Ninguém que você segue escreveu sobre este livro.
            </p>
            <!-- Só para quem ainda não escreveu: a resenha própria fica em "Sua avaliação". -->
            <RouterLink
              v-if="minhaAvaliacao.estado.value === 'pronta' && !minhaAvaliacao.resenha.value"
              :to="rotaDoEditor"
              class="mt-space-1 inline-flex min-h-12 items-center text-body-strong text-musgo underline-offset-2 hover:underline focus-visible:underline md:min-h-10"
            >
              Escrever a primeira
            </RouterLink>
          </div>
          <template v-else>
            <ul class="mt-space-4 flex flex-col gap-space-6 lg:grid lg:grid-cols-2">
              <li
                v-for="resenha in resenhas"
                :key="resenha.id"
              >
                <CardResenha :resenha="resenha" />
              </li>
            </ul>
            <p
              v-if="falhouMaisResenhas"
              class="mt-space-4 text-caption text-grafite"
              role="alert"
            >
              Não foi possível carregar mais resenhas. Verifique sua conexão.
            </p>
            <BotaoTextual
              v-if="temMaisResenhas"
              :class="falhouMaisResenhas ? 'mt-space-1' : 'mt-space-4'"
              class="min-h-12 md:min-h-10"
              :disabled="carregandoResenhas"
              @click="pagina.carregarResenhas()"
            >
              {{ falhouMaisResenhas ? 'Tentar de novo' : 'Ver todas as resenhas' }}
            </BotaoTextual>
          </template>
        </section>
      </div>
    </article>
  </div>
</template>

<style scoped>
/* Um único fade de entrada no skeleton (pagina-do-livro.md §4.3 e §4.8); sob movimento reduzido, a
   regra global de `styles.css` zera a animação. */
.entrada {
  animation: surgir var(--duration-base) var(--easing-out);
}

@keyframes surgir {
  from {
    opacity: 0;
  }
}
</style>
