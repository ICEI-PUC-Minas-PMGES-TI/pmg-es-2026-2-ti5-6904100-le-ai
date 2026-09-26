<script setup lang="ts">
import { PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CardLivroBusca from '../components/livros/CardLivroBusca.vue'
import FiltroAssuntos from '../components/livros/FiltroAssuntos.vue'
import FimDaLista from '../components/perfil/FimDaLista.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoPrimario from '../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import EstadoVazio from '../components/ui/EstadoVazio.vue'
import { useBuscaDeLivros } from '../livros/useBuscaDeLivros'

/**
 * Aba Descobrir (RF-ACV-01, RF-ACV-02), a partir do protótipo `descobrir.html`.
 *
 * - **A partir de 768px o campo vai para a linha do título** (Teleport para `#cabecalho-acoes`,
 *   no padrão de `BuscarLeitorView`), com 560px; abaixo disso é a segunda linha do header.
 * - **A partir de 768px**, painel de assuntos de 240px à esquerda, contagem à direita acima, e os
 *   resultados em grid de duas colunas; abaixo disso, faixa de chips, contagem à esquerda e lista
 *   de uma coluna com divisor.
 * - `q` e `assunto` ficam na URL (`router.replace`), para a busca voltar igual ao sair da página
 *   do livro e ao recarregar. A rolagem, essa, recomeça do topo.
 * - A aterrissagem é magra no Período 1, por decisão (§5.5): sem foco automático, sem bloco de
 *   vazio, sem espaço reservado.
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

const busca = useBuscaDeLivros({
  inicial: { q: textoDaQuery(route.query.q), assunto: textoDaQuery(route.query.assunto) },
  aoBuscar: ({ q, assunto }) => {
    void router.replace({ query: { ...route.query, q: q ?? undefined, assunto: assunto ?? undefined } })
  },
})
const {
  consulta,
  assunto,
  assuntos,
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

function aoDigitar(evento: Event): void {
  busca.alterarConsulta((evento.target as HTMLInputElement).value)
}
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
        :class="largo ? 'w-[560px] max-w-full' : ''"
        @submit.prevent
      >
        <div class="flex h-12 items-center gap-space-3 rounded-base border border-linha bg-papel-elevado px-space-4 transition-colors duration-dur-fast focus-within:border-[1.5px] focus-within:border-musgo md:h-11">
          <PhMagnifyingGlass
            :size="20"
            weight="regular"
            class="shrink-0 text-grafite-suave"
            aria-hidden="true"
          />
          <input
            :value="consulta"
            type="search"
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
            @click="busca.limparConsulta()"
          >
            <PhX
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
          </button>
        </div>
      </form>
    </Teleport>

    <div class="mt-space-4 flex flex-col md:mt-space-3 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-x-space-8 md:gap-y-space-3">
      <FiltroAssuntos
        v-if="assuntos.length"
        :assuntos="assuntos"
        :ativo="assunto"
        class="md:col-start-1 md:row-start-2 md:self-start"
        @alternar="busca.alternarAssunto"
      />

      <p
        v-if="estado === 'resultados'"
        class="mt-space-2 text-caption text-grafite md:col-span-2 md:row-start-1 md:mt-0 md:text-right"
        aria-live="polite"
      >
        {{ totalItens === 1 ? '1 livro encontrado' : `${totalItens} livros encontrados` }}
      </p>

      <section
        class="md:col-start-2 md:row-start-2"
        aria-label="Resultados da busca"
      >
        <div
          v-if="estado === 'buscando'"
          class="entrada mt-space-2 md:mt-0"
          aria-busy="true"
          aria-label="Buscando"
        >
          <p
            v-if="coldStart"
            class="mb-space-3 text-caption text-grafite"
            role="status"
          >
            O servidor está iniciando. Isso pode levar alguns segundos.
          </p>
          <ul class="divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0">
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
            @carregar="busca.carregarMais()"
          />
        </template>

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
          <BotaoTextual
            class="mt-space-2"
            @click="busca.tentarDeNovo()"
          >
            Tentar de novo
          </BotaoTextual>
        </BannerAviso>
      </section>
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
