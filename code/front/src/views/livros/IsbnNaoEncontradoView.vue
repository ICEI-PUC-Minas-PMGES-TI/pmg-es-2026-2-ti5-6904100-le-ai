<script setup lang="ts">
import { PhMagnifyingGlass } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'

/**
 * ISBN não encontrado (RF-ACV-06). Estrutura e copy de
 * docs/design/periodo-1/F-ACV-CADASTRO/isbn-nao-encontrado.md §4, §5 e §8. Não é erro: as fontes
 * responderam que não conhecem o ISBN, e a tela negocia a troca para o cadastro pessoal, que tem
 * outras regras (RN-03). Sem `rubi`, sem banner, sem "tentar de novo".
 */
const route = useRoute()
const router = useRouter()

const origem = computed(() => String(route.params.origem ?? 'descobrir'))
const isbn = computed(() => (typeof route.query.isbn === 'string' && /^[0-9]{13}$/.test(route.query.isbn) ? route.query.isbn : null))

function cadastrarPessoal(): void {
  void router.push({ name: 'livro-pessoal-novo', params: { origem: origem.value } })
}

/** Volta ao cadastro com o valor digitado, pronto para correção, e não em branco (§4.1 item 12). */
function conferir(): void {
  const digitado = typeof route.query.digitado === 'string' ? route.query.digitado : (isbn.value ?? undefined)
  void router.replace({ name: 'cadastro-isbn', params: { origem: origem.value }, query: { isbn: digitado } })
}
</script>

<template>
  <div
    class="mx-auto w-full max-w-[640px] pb-space-12 pt-space-8"
    role="status"
  >
    <EstadoVazio
      :icone="PhMagnifyingGlass"
      titulo="Não encontramos este livro"
    >
      <template v-if="isbn">
        <p class="mt-space-3 max-w-[300px] text-body text-grafite md:max-w-[420px]">
          Procuramos em todas as nossas fontes e nenhuma conhece o ISBN {{ isbn }}.
        </p>
        <p class="mt-space-2 font-mono text-num-inline tabular-nums text-grafite-suave">
          {{ isbn }}
        </p>
      </template>
      <p
        v-else
        class="mt-space-3 max-w-[300px] text-body text-grafite md:max-w-[420px]"
      >
        Procuramos em todas as nossas fontes e nenhuma conhece esse ISBN.
      </p>
    </EstadoVazio>

    <section class="mt-space-8 rounded-md bg-papel-elevado p-space-5">
      <h2 class="text-body-strong text-tinta">
        Cadastrar como livro pessoal?
      </h2>
      <p class="mt-space-3 text-body text-grafite">
        Um livro pessoal é só seu: ele não entra na busca do acervo e ninguém mais pode adicioná-lo à
        estante. Sua nota e sua resenha continuam valendo normalmente.
      </p>
      <div class="mt-space-5 flex justify-center">
        <BotaoPrimario
          class="md:w-auto md:px-space-8 md:hover:bg-musgo-vivo"
          @click="cadastrarPessoal"
        >
          Cadastrar livro pessoal
        </BotaoPrimario>
      </div>
    </section>

    <div class="mt-space-5 flex justify-center">
      <BotaoTextual
        class="min-h-12 md:min-h-10"
        @click="conferir"
      >
        Conferir o ISBN
      </BotaoTextual>
    </div>
  </div>
</template>
