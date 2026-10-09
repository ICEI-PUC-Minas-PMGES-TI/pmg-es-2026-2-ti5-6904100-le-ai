<script setup lang="ts">
import { PhThumbsDown, PhThumbsUp } from '@phosphor-icons/vue'
import { watch } from 'vue'

import { useReacao } from '../../livros/useReacao'
import type { EstadoDasReacoes, LeituraService, TipoDeReacao, ViaDeAcesso } from '../../services/leitura'
import AvisoFlutuante from '../ui/AvisoFlutuante.vue'

/**
 * Linha de reações da resenha (F-AVA-2, pagina-do-livro.md §4.2 e §9). Dois botões, `ThumbsUp` e
 * `ThumbsDown`, com a contagem de cada um sempre à parte (RF-AVA-08): nunca saldo nem percentual,
 * e zero aparece como `0 descurtidas`, que é contagem real. Só um fica ativo; tocar no outro troca,
 * tocar no ativo retira. O ativo muda o peso do ícone (`fill`), não só a cor.
 *
 * `somenteLeitura` é a variante da resenha do próprio leitor (livro pessoal, meu perfil e "Sua
 * avaliação"): ícones de 16px e as contagens em `caption`, sem botão.
 *
 * Aparece mesmo com o corpo da resenha oculto por spoiler.
 */
const props = defineProps<{
  resenhaId: string
  reacoes: EstadoDasReacoes
  somenteLeitura?: boolean
  /** Via de RN-15 quando a resenha é do dono de um livro pessoal aberto por terceiro. */
  via?: ViaDeAcesso
  servico?: Pick<LeituraService, 'reagir' | 'removerReacao'>
}>()

const { estado, erro, tocar, redefinir } = useReacao(props.resenhaId, props.reacoes, {
  via: props.via,
  servico: props.servico,
})

watch(
  () => props.reacoes,
  (novas) => redefinir(novas),
)

function rotulo(total: number, tipo: TipoDeReacao): string {
  return `${total} ${tipo}${total === 1 ? '' : 's'}`
}

const botoes = [
  { tipo: 'curtida', icone: PhThumbsUp, acao: 'Curtir resenha' },
  { tipo: 'descurtida', icone: PhThumbsDown, acao: 'Descurtir resenha' },
] as const

function total(tipo: TipoDeReacao): number {
  return tipo === 'curtida' ? estado.value.curtidas : estado.value.descurtidas
}
</script>

<template>
  <p
    v-if="somenteLeitura"
    class="flex flex-wrap items-center gap-x-space-4 gap-y-space-1 text-caption text-grafite"
  >
    <span
      v-for="botao in botoes"
      :key="botao.tipo"
      class="inline-flex items-center gap-space-1"
    >
      <component
        :is="botao.icone"
        :size="16"
        weight="regular"
        aria-hidden="true"
      />
      {{ rotulo(total(botao.tipo), botao.tipo) }}
    </span>
  </p>
  <div
    v-else
    class="flex flex-wrap items-center gap-space-4"
  >
    <button
      v-for="botao in botoes"
      :key="botao.tipo"
      type="button"
      class="inline-flex min-h-12 cursor-pointer items-center gap-space-2 rounded-base px-space-3 py-space-2 text-caption transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo motion-reduce:transition-none"
      :class="estado.minhaReacao === botao.tipo ? 'font-semibold text-musgo' : 'text-grafite'"
      :aria-pressed="estado.minhaReacao === botao.tipo"
      :aria-label="`${botao.acao}, ${rotulo(total(botao.tipo), botao.tipo)}`"
      @click="tocar(botao.tipo)"
    >
      <component
        :is="botao.icone"
        :size="20"
        :weight="estado.minhaReacao === botao.tipo ? 'fill' : 'regular'"
        aria-hidden="true"
      />
      <span aria-hidden="true">{{ rotulo(total(botao.tipo), botao.tipo) }}</span>
    </button>
  </div>
  <AvisoFlutuante
    :aberto="erro !== null"
    tom="rubi"
    @fechar="erro = null"
  >
    {{ erro }}
  </AvisoFlutuante>
</template>
