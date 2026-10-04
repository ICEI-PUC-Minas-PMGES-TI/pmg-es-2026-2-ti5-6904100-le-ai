<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'

import BannerAviso from '../ui/BannerAviso.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import ItemRecomendacao from './ItemRecomendacao.vue'
import { socialService, type RecomendacaoRecebida } from '../../services/social'

// O mobile mostra três; a web, quatro em duas colunas. Uma página de quatro serve aos dois.
const TAMANHO_DA_SECAO = 4
const VISIVEIS_NO_MOBILE = 3

const estado = ref<'carregando' | 'pronta' | 'erro'>('carregando')
const recomendacoes = shallowRef<RecomendacaoRecebida[]>([])

async function carregar(): Promise<void> {
  estado.value = 'carregando'
  try {
    recomendacoes.value = (await socialService.listarRecebidas(0, TAMANHO_DA_SECAO)).items
    estado.value = 'pronta'
  } catch {
    estado.value = 'erro'
  }
}

onMounted(carregar)
</script>

<template>
  <section aria-labelledby="titulo-recomendacoes">
    <div class="flex items-baseline justify-between gap-space-4">
      <h2
        id="titulo-recomendacoes"
        class="text-title-lg text-tinta"
      >
        Recomendações recebidas
      </h2>
      <RouterLink
        v-if="estado === 'pronta' && recomendacoes.length > 0"
        to="/descobrir/recomendacoes"
        class="inline-flex min-h-12 items-center text-body-strong text-musgo underline-offset-2 hover:underline focus-visible:underline md:min-h-10"
      >
        Ver todas
      </RouterLink>
    </div>

    <ul
      v-if="estado === 'carregando'"
      class="entrada mt-space-3 divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0"
      aria-busy="true"
      aria-label="Carregando recomendações"
    >
      <li
        v-for="n in VISIVEIS_NO_MOBILE"
        :key="n"
        class="flex gap-space-4 py-space-4 md:p-space-4"
      >
        <span class="h-[90px] w-[60px] shrink-0 bg-capa-placeholder md:h-[120px] md:w-20" />
        <span class="flex flex-1 flex-col gap-space-2">
          <span class="h-[17px] w-[70%] rounded-sm bg-capa-placeholder" />
          <span class="h-[15px] w-[45%] rounded-sm bg-capa-placeholder" />
          <span class="h-[13px] w-[55%] rounded-sm bg-capa-placeholder" />
        </span>
      </li>
    </ul>

    <BannerAviso
      v-else-if="estado === 'erro'"
      variante="erro"
      triangulo
      class="mt-space-3"
    >
      Não foi possível carregar suas recomendações. Verifique sua conexão e tente de novo.
      <BotaoTextual
        class="mt-space-2"
        @click="carregar"
      >
        Tentar de novo
      </BotaoTextual>
    </BannerAviso>

    <p
      v-else-if="recomendacoes.length === 0"
      class="mt-space-2 text-body text-grafite"
    >
      Livros que outros leitores recomendarem para você aparecem aqui.
    </p>

    <ul
      v-else
      class="mt-space-3 divide-y divide-linha md:mt-space-4 md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0"
    >
      <li
        v-for="(recomendacao, indice) in recomendacoes"
        :key="recomendacao.id"
        class="py-space-4 md:rounded-base md:p-space-4 md:transition-colors md:duration-dur-fast md:hover:bg-papel-elevado"
        :class="indice >= VISIVEIS_NO_MOBILE ? 'hidden md:block' : ''"
      >
        <ItemRecomendacao
          :recomendacao="recomendacao"
          capa-grande
        />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.entrada {
  animation: surgir var(--duration-base) var(--easing-out);
}

@keyframes surgir {
  from {
    opacity: 0;
  }
}
</style>
