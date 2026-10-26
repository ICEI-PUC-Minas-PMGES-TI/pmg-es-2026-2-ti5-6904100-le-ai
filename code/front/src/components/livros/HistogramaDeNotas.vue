<script setup lang="ts">
import { PhStar } from '@phosphor-icons/vue'
import { computed, useId } from 'vue'

import { formatarNota } from '../../livros/formatos'
import { formatarInteiro } from '../../estatisticas/formatos'
import type { FaixaDaDistribuicao } from '../../services/acervo'

/**
 * Distribuição das notas dos leitores (pagina-do-livro.md §4.1 C e §5.2): onze linhas, de 5 a 0,
 * numa série só em `musgo`. **A faixa com mais leitores ocupa a trilha inteira** e as outras são
 * proporcionais a ela; sem percentual, sem eixo, sem legenda. Faixa vazia mostra a trilha vazia e
 * `nenhum`.
 *
 * Sem distribuição (o livro não tem nota dos leitores), nada aparece: nada de histograma zerado.
 * Cada linha é um item de lista lido como "5 estrelas, 12 leitores", sem depender da barra.
 */
const props = defineProps<{ distribuicao: FaixaDaDistribuicao[] }>()

const idDoRotulo = useId()

const faixas = computed(() => {
  const ordenadas = [...props.distribuicao].sort((a, b) => b.valor - a.valor)
  const maior = Math.max(0, ...ordenadas.map((faixa) => faixa.quantidade))
  return ordenadas.map((faixa) => {
    const valor = formatarNota(faixa.valor)
    const estrelas = faixa.valor === 0 || faixa.valor >= 2 ? 'estrelas' : 'estrela'
    const quantidade = faixa.quantidade === 0 ? 'nenhum' : `${formatarInteiro(faixa.quantidade)} ${faixa.quantidade === 1 ? 'leitor' : 'leitores'}`
    return {
      chave: faixa.valor,
      valor,
      quantidade,
      vazia: faixa.quantidade === 0,
      largura: maior === 0 ? 0 : Math.round((faixa.quantidade / maior) * 1000) / 10,
      leitura: `${valor} ${estrelas}, ${quantidade}`,
    }
  })
})
</script>

<template>
  <div v-if="faixas.length">
    <p
      :id="idDoRotulo"
      class="text-label text-grafite"
    >
      Distribuição das notas dos leitores
    </p>
    <ul
      class="mt-space-3 flex flex-col gap-space-1"
      :aria-labelledby="idDoRotulo"
    >
      <li
        v-for="faixa in faixas"
        :key="faixa.chave"
        class="flex h-5 items-center gap-space-2"
      >
        <span class="sr-only">{{ faixa.leitura }}</span>
        <span
          class="flex w-11 shrink-0 items-center justify-end gap-space-1 text-grafite"
          aria-hidden="true"
        >
          <span class="font-mono text-caption tabular-nums">{{ faixa.valor }}</span>
          <PhStar
            :size="16"
            weight="regular"
            class="shrink-0"
          />
        </span>
        <span
          class="h-2 flex-1 overflow-hidden rounded-full bg-musgo-fundo"
          aria-hidden="true"
        >
          <span
            v-if="!faixa.vazia"
            class="block h-full rounded-full bg-musgo"
            data-preenchimento
            :style="{ width: `${faixa.largura}%` }"
          />
        </span>
        <span
          class="w-22 shrink-0 text-right text-caption"
          :class="faixa.vazia ? 'text-grafite-suave' : 'text-grafite'"
          aria-hidden="true"
        >{{ faixa.quantidade }}</span>
      </li>
    </ul>
  </div>
</template>
