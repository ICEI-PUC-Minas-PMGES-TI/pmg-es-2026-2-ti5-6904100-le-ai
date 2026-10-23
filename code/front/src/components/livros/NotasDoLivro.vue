<script setup lang="ts">
import { PhStar } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { formatarNota } from '../../livros/formatos'
import { formatarInteiro } from '../../estatisticas/formatos'
import type { NotaDoLivro } from '../../services/acervo'

/**
 * `Nota geral` e `Nota dos leitores` lado a lado (pagina-do-livro.md §4.1 C, documento-de-design
 * §4.4): a da fonte externa e a média dos leitores do app, **nunca combinadas** num número só.
 *
 * Indicador ausente (RN-06.3) mantém o rótulo e mostra só `Sem nota`: sem estrela, sem `0,0`, sem
 * traço. Cada bloco é lido como um texto só ("Nota geral, 4,3 de 5, 412 avaliações"); o desenho
 * fica escondido do leitor de tela. As cores do escuro (§4.15) vêm dos aliases do tema.
 */
const props = defineProps<{
  notaGeral: NotaDoLivro | null
  notaDosLeitores: NotaDoLivro | null
}>()

interface Bloco {
  rotulo: string
  nota: string | null
  quantidade: string | null
}

const blocos = computed<Bloco[]>(() => [
  bloco('Nota geral', props.notaGeral, 'avaliação', 'avaliações'),
  bloco('Nota dos leitores', props.notaDosLeitores, 'leitor', 'leitores'),
])

function bloco(rotulo: string, nota: NotaDoLivro | null, singular: string, plural: string): Bloco {
  return nota === null
    ? { rotulo, nota: null, quantidade: null }
    : { rotulo, nota: formatarNota(nota.valor), quantidade: contagem(nota.quantidade, singular, plural) }
}

/** Com o milhar em pt-BR (`1.442 avaliações`): a nota geral passa de mil avaliações. */
function contagem(valor: number, singular: string, plural: string): string {
  return `${formatarInteiro(valor)} ${valor === 1 ? singular : plural}`
}

function leitura({ rotulo, nota, quantidade }: Bloco): string {
  return nota === null ? `${rotulo}, sem nota` : `${rotulo}, ${nota} de 5, ${quantidade}`
}
</script>

<template>
  <div class="flex rounded-md bg-papel-elevado p-space-5">
    <template
      v-for="(item, indice) in blocos"
      :key="item.rotulo"
    >
      <div
        v-if="indice > 0"
        class="mx-space-5 w-px shrink-0 self-stretch bg-linha"
        aria-hidden="true"
      />
      <div
        class="flex min-w-0 flex-1 flex-col"
        data-bloco-de-nota
      >
        <p class="sr-only">
          {{ leitura(item) }}
        </p>
        <span
          class="text-label text-grafite"
          aria-hidden="true"
        >{{ item.rotulo }}</span>
        <template v-if="item.nota !== null">
          <span
            class="mt-space-2 flex items-center gap-space-2"
            aria-hidden="true"
          >
            <PhStar
              :size="24"
              weight="fill"
              class="shrink-0 text-musgo"
            />
            <span class="font-mono text-num-display tabular-nums text-tinta">{{ item.nota }}</span>
          </span>
          <span
            class="mt-space-1 text-caption text-grafite"
            aria-hidden="true"
          >{{ item.quantidade }}</span>
        </template>
        <span
          v-else
          class="mt-space-2 text-caption text-grafite-suave"
          aria-hidden="true"
        >Sem nota</span>
      </div>
    </template>
  </div>
</template>
