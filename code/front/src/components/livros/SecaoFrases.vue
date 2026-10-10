<script setup lang="ts">
import { PhPlus, PhQuotes } from '@phosphor-icons/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter, type RouteLocationRaw } from 'vue-router'

import { rotuloDeFrases, TEXTOS_DAS_FRASES as T } from '../../livros/frases'
import { leituraService, type Frase, type LeituraService, type PaginaFrases } from '../../services/leitura'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import AdicionarFrase, { type LivroDaFrase } from './AdicionarFrase.vue'
import FraseCitada from './FraseCitada.vue'

/**
 * Seção `Frases e trechos` da página do livro (pagina-do-livro.md §5.4, F-AVA-2): título com a
 * contagem, as três frases mais recentes de todos os leitores (RN-08 no servidor) e, ao fim,
 * `Ver todas as frases` e `Adicionar frase`. Sem excluir aqui: isso mora na lista completa.
 *
 * Carrega à parte, como "Sua avaliação": com o `leitura` lento ou fora, a página abre igual. No
 * livro pessoal, a página só monta a seção para o dono (RN-15).
 */
const props = defineProps<{
  livro: LivroDaFrase
  rotaDasFrases: RouteLocationRaw
  servico?: Pick<LeituraService, 'listarFrases' | 'criarFrase'>
}>()

const servico = computed(() => props.servico ?? leituraService)
const router = useRouter()

const estado = ref<'carregando' | 'pronta' | 'erro'>('carregando')
const pagina = ref<PaginaFrases | null>(null)
const adicionando = ref(false)

const total = computed(() => pagina.value?.paginacao.totalItens ?? 0)
const cabeMais = computed(() => (pagina.value ? pagina.value.minhasFrases < pagina.value.limitePorLivro : false))

async function carregar(): Promise<void> {
  estado.value = 'carregando'
  try {
    pagina.value = await servico.value.listarFrases(props.livro.id, 1, 3)
    estado.value = 'pronta'
  } catch {
    estado.value = 'erro'
  }
}

watch(() => props.livro.id, carregar, { immediate: true })

/** A frase nova entra em primeiro; a mais antiga das três sai da seção e fica na lista completa. */
function aoSalvar(frase: Frase): void {
  adicionando.value = false
  if (pagina.value) {
    pagina.value = {
      ...pagina.value,
      itens: [frase, ...pagina.value.itens].slice(0, 3),
      paginacao: { ...pagina.value.paginacao, totalItens: pagina.value.paginacao.totalItens + 1 },
      minhasFrases: pagina.value.minhasFrases + 1,
    }
  }
}

function verMinhas(): void {
  adicionando.value = false
  void router.push(props.rotaDasFrases)
}
</script>

<template>
  <section aria-labelledby="titulo-frases">
    <div class="flex items-baseline gap-space-3">
      <h2
        id="titulo-frases"
        class="text-title-lg text-tinta"
      >
        {{ T.titulo }}
      </h2>
      <span
        v-if="estado === 'pronta' && total > 0"
        class="text-caption text-grafite"
      >{{ rotuloDeFrases(total) }}</span>
    </div>

    <div
      v-if="estado === 'carregando'"
      class="mt-space-4 flex flex-col gap-space-2 border-l-2 border-capa-placeholder pl-space-4"
      aria-hidden="true"
    >
      <div class="h-[17px] w-[95%] rounded-sm bg-capa-placeholder" />
      <div class="h-[17px] w-[55%] rounded-sm bg-capa-placeholder" />
      <div class="h-[13px] w-[35%] rounded-sm bg-capa-placeholder" />
    </div>

    <div
      v-else-if="estado === 'erro'"
      class="mt-space-3 flex flex-wrap items-center gap-space-2"
    >
      <p class="text-body text-grafite">
        {{ T.erroCarga }}
      </p>
      <BotaoTextual @click="carregar">
        {{ T.tentarDeNovo }}
      </BotaoTextual>
    </div>

    <div
      v-else-if="total === 0"
      class="mt-space-4 flex flex-col items-start gap-space-3"
    >
      <PhQuotes
        :size="32"
        weight="regular"
        class="text-grafite-suave"
        aria-hidden="true"
      />
      <p class="text-title-sm text-tinta">
        {{ T.vazioTitulo }}
      </p>
      <p class="max-w-[280px] text-body text-grafite">
        {{ T.vazioTexto }}
      </p>
      <BotaoPrimario
        class="h-12 md:h-10 md:w-auto"
        @click="adicionando = true"
      >
        {{ T.vazioBotao }}
      </BotaoPrimario>
    </div>

    <template v-else>
      <ul class="mt-space-4 flex max-w-[68ch] flex-col gap-space-5">
        <li
          v-for="frase in pagina?.itens"
          :key="frase.id"
        >
          <FraseCitada :frase="frase" />
        </li>
      </ul>
      <div class="mt-space-4 flex flex-wrap items-center justify-between gap-space-3">
        <RouterLink
          :to="rotaDasFrases"
          class="inline-flex min-h-12 items-center text-body-strong text-musgo underline-offset-2 hover:underline focus-visible:underline md:min-h-10"
        >
          {{ T.verTodas }}
        </RouterLink>
        <BotaoTextual
          v-if="cabeMais"
          class="min-h-12 gap-space-2 md:min-h-10"
          @click="adicionando = true"
        >
          <PhPlus
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
          {{ T.adicionar }}
        </BotaoTextual>
      </div>
    </template>

    <AdicionarFrase
      :aberta="adicionando"
      :livro="livro"
      :minhas-frases="pagina?.minhasFrases ?? 0"
      :limite="pagina?.limitePorLivro ?? 10"
      :servico="props.servico"
      @salva="aoSalvar"
      @fechar="adicionando = false"
      @ver-minhas="verMinhas"
    />
  </section>
</template>
