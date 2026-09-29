<script setup lang="ts">
import { PhTrash, PhWarning } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { formatarData } from '../../livros/formatos'
import { precisaDeAvisoDeRitmo } from '../../progresso/regras'
import { TEXTOS_DAS_ATUALIZACOES, rotuloPaginas, rotuloTempo } from '../../progresso/textos'
import type { Progresso } from '../../services/leitura'

const props = defineProps<{
  itens: readonly Progresso[]
  somenteLeitura: boolean
}>()

const emit = defineEmits<{ excluir: [progresso: Progresso] }>()

const comAvisoDeRitmo = computed(
  () => new Set(props.itens.filter((item) => precisaDeAvisoDeRitmo(props.itens, item.id)).map((item) => item.id)),
)

const avisoDoItem = (item: Progresso) =>
  comAvisoDeRitmo.value.has(item.id)
    ? TEXTOS_DAS_ATUALIZACOES.avisoRitmo(item.paginasLidas, item.minutos, item.paginaAnterior)
    : null

const corDoExcluir = (item: Progresso) => (comAvisoDeRitmo.value.has(item.id) ? 'text-ambar' : 'text-grafite')

const dataDoItem = (item: Progresso) => formatarData(`${item.dataLocal}T00:00:00`)

const classeDoIcone =
  'flex size-12 shrink-0 items-center justify-center rounded-base transition-colors duration-dur-fast motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo'
</script>

<template>
  <div>
    <div
      class="hidden overflow-x-auto md:block"
      data-tabela
    >
      <table class="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr class="border-b border-linha text-label text-grafite">
            <th
              scope="col"
              class="py-space-3 pr-space-4 font-normal"
            >
              {{ TEXTOS_DAS_ATUALIZACOES.cabecalhoData }}
            </th>
            <th
              scope="col"
              class="py-space-3 pr-space-4 font-normal"
            >
              {{ TEXTOS_DAS_ATUALIZACOES.cabecalhoPagina }}
            </th>
            <th
              scope="col"
              class="py-space-3 pr-space-4 font-normal"
            >
              {{ TEXTOS_DAS_ATUALIZACOES.cabecalhoPaginasLidas }}
            </th>
            <th
              scope="col"
              class="py-space-3 pr-space-4 font-normal"
            >
              {{ TEXTOS_DAS_ATUALIZACOES.cabecalhoTempo }}
            </th>
            <th
              v-if="!somenteLeitura"
              scope="col"
              class="w-28"
            >
              <span class="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template
            v-for="item in itens"
            :key="item.id"
          >
            <tr
              class="group h-14 border-linha transition-colors duration-dur-fast hover:bg-papel-elevado motion-reduce:transition-none"
              :class="avisoDoItem(item) ? '' : 'border-b'"
              data-linha
            >
              <td class="pr-space-4 text-body text-grafite">
                {{ dataDoItem(item) }}
              </td>
              <td class="pr-space-4 text-num-inline text-tinta">
                {{ item.pagina }}
              </td>
              <td class="pr-space-4 text-body text-grafite">
                {{ rotuloPaginas(item.paginasLidas) }}
              </td>
              <td class="pr-space-4 text-body text-grafite">
                {{ item.minutos > 0 ? rotuloTempo(item.minutos) : '' }}
              </td>
              <td v-if="!somenteLeitura">
                <div class="flex justify-end">
                  <button
                    type="button"
                    :class="[classeDoIcone, corDoExcluir(item)]"
                    class="group-hover:text-rubi"
                    :aria-label="TEXTOS_DAS_ATUALIZACOES.rotuloExcluir(item.pagina)"
                    data-excluir
                    @click="emit('excluir', item)"
                  >
                    <PhTrash
                      :size="20"
                      weight="regular"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </td>
            </tr>
            <tr
              v-if="avisoDoItem(item)"
              class="border-b border-linha"
            >
              <td
                :colspan="somenteLeitura ? 4 : 5"
                class="pb-space-3"
              >
                <p
                  class="flex items-start gap-space-2 text-caption text-ambar"
                  data-aviso-ritmo
                >
                  <PhWarning
                    :size="16"
                    weight="regular"
                    class="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  {{ avisoDoItem(item) }}
                </p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <ul
      class="md:hidden"
      data-lista
    >
      <li
        v-for="item in itens"
        :key="item.id"
        class="border-b border-linha py-space-4"
        data-linha
      >
        <div class="flex items-center gap-space-3">
          <div class="min-w-0 flex-1">
            <p class="text-num-inline text-tinta">
              {{ TEXTOS_DAS_ATUALIZACOES.itemPagina(item.pagina) }}
            </p>
            <p class="text-caption text-grafite-suave">
              {{ dataDoItem(item) }}
            </p>
          </div>
          <p class="text-caption text-grafite">
            {{ TEXTOS_DAS_ATUALIZACOES.itemDetalhe(item.paginasLidas, item.minutos) }}
          </p>
          <template v-if="!somenteLeitura">
            <button
              type="button"
              :class="[classeDoIcone, corDoExcluir(item)]"
              class="-mr-space-3"
              :aria-label="TEXTOS_DAS_ATUALIZACOES.rotuloExcluir(item.pagina)"
              data-excluir
              @click="emit('excluir', item)"
            >
              <PhTrash
                :size="20"
                weight="regular"
                aria-hidden="true"
              />
            </button>
          </template>
        </div>
        <p
          v-if="avisoDoItem(item)"
          class="mt-space-2 flex items-start gap-space-2 text-caption text-ambar"
          data-aviso-ritmo
        >
          <PhWarning
            :size="16"
            weight="regular"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          {{ avisoDoItem(item) }}
        </p>
      </li>
    </ul>
  </div>
</template>
