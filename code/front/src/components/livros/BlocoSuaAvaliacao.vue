<script setup lang="ts">
import { PhEyeSlash } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import { RouterLink, useRouter, type RouteLocationRaw } from 'vue-router'

import { formatarData, formatarNota } from '../../livros/formatos'
import type { LivroAvaliado, MinhaAvaliacaoDoLivro } from '../../livros/useMinhaAvaliacao'
import BotaoTextual from '../ui/BotaoTextual.vue'
import EstrelasNota from './EstrelasNota.vue'
import PainelDeNota from './PainelDeNota.vue'

/**
 * Bloco "Sua avaliação" da página do livro (pagina-do-livro.md §4.1, item 4, §4.2 e §5).
 *
 * - Estrelas de 24px com o valor ao lado, ou as cinco vazias com `Sem nota`. Nunca `0,0`.
 * - A linha de estrelas é um botão com nome ("Sua nota: 4,5. Alterar") que abre o painel.
 * - A resenha do próprio leitor aparece aqui, e não na lista: nem o `.md` nem o `.html` desenham
 *   esse estado, e a decisão está registrada em F-AVA.
 * - Carrega à parte: com o `leitura` lento ou fora, a página segue utilizável e só o bloco mostra
 *   o skeleton ou o erro com `Tentar de novo`.
 */
const props = defineProps<{
  avaliacao: MinhaAvaliacaoDoLivro
  livro: LivroAvaliado
  /** Editor de resenha deste livro, na aba de origem. */
  rotaDoEditor: RouteLocationRaw
}>()

const router = useRouter()
const painelAberto = ref(false)

function irParaOEditor(): void {
  painelAberto.value = false
  void router.push(props.rotaDoEditor)
}

const valor = computed(() => props.avaliacao.nota.value?.valor ?? null)

const rotuloDaNota = computed(() =>
  valor.value === null ? 'Sem nota. Dar nota' : `Sua nota: ${formatarNota(valor.value)}. Alterar`,
)
</script>

<template>
  <section aria-labelledby="titulo-sua-avaliacao">
    <h2
      id="titulo-sua-avaliacao"
      class="text-title-lg text-tinta"
    >
      Sua avaliação
    </h2>

    <div
      v-if="avaliacao.estado.value === 'carregando'"
      class="mt-space-3 h-6 w-48 rounded-sm bg-capa-placeholder"
      aria-hidden="true"
    />

    <div
      v-else-if="avaliacao.estado.value === 'erro'"
      class="mt-space-3 flex flex-wrap items-center gap-space-2"
    >
      <p class="text-body text-grafite">
        Não foi possível carregar sua avaliação.
      </p>
      <BotaoTextual @click="avaliacao.carregar()">
        Tentar de novo
      </BotaoTextual>
    </div>

    <template v-else>
      <button
        type="button"
        class="mt-space-3 flex min-h-12 cursor-pointer items-center rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:min-h-10"
        :aria-label="rotuloDaNota"
        @click="painelAberto = true"
      >
        <EstrelasNota :valor="valor" />
      </button>

      <div
        v-if="avaliacao.resenha.value"
        class="mt-space-3"
      >
        <!-- O dono vê o próprio texto mesmo com spoiler: o spoiler muda como quem lê a encontra. -->
        <p class="max-w-[68ch] whitespace-pre-line font-editorial text-body-lg text-tinta">
          {{ avaliacao.resenha.value.texto }}
        </p>
        <p class="mt-space-2 flex flex-wrap items-center gap-x-space-2 text-caption text-grafite-suave">
          <span>Publicada em {{ formatarData(avaliacao.resenha.value.criadoEm) }}</span>
          <span
            v-if="avaliacao.resenha.value.spoiler"
            class="inline-flex items-center gap-space-1 text-grafite"
          >
            <PhEyeSlash
              :size="16"
              weight="regular"
              aria-hidden="true"
            />
            Contém spoiler
          </span>
        </p>
        <RouterLink
          :to="rotaDoEditor"
          class="mt-space-2 inline-flex min-h-12 items-center text-body-strong text-musgo underline-offset-2 hover:underline focus-visible:underline md:min-h-10"
        >
          Editar resenha
        </RouterLink>
      </div>
      <RouterLink
        v-else
        :to="rotaDoEditor"
        class="mt-space-1 inline-flex min-h-12 items-center text-body-strong text-musgo underline-offset-2 hover:underline focus-visible:underline md:min-h-10"
      >
        Escrever resenha
      </RouterLink>
    </template>

    <PainelDeNota
      :aberta="painelAberto"
      :livro="livro"
      :avaliacao="avaliacao"
      com-escrever-resenha
      @fechar="painelAberto = false"
      @escrever-resenha="irParaOEditor"
    />
  </section>
</template>
