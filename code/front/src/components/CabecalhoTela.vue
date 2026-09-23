<script setup lang="ts">
import { PhArrowLeft } from '@phosphor-icons/vue'
import { useRouter } from 'vue-router'

/**
 * Cabeçalho de 72px que toda tela autenticada herda (shell-de-navegacao.md §4 "Padrão de
 * header" e §5 "Área de conteúdo"). Sem sino na web: notificações estão fora do escopo do
 * cliente web (REQUISITOS.md §2.1) — o sino é só do app Flutter (Etapa 13).
 *
 * Tela de detalhe ganha a seta `ArrowLeft` à esquerda do título (cadastro-por-isbn.md §4). As
 * ações contextuais da direita entram por `<Teleport to="#cabecalho-acoes" defer>` a partir da
 * própria tela, que é quem sabe o que oferecer (ex.: menu do livro pessoal abaixo de 768px).
 *
 * Simplificação assumida: o divisor inferior do header, que no protótipo só aparece quando o
 * conteúdo rola por baixo, sai fixo aqui (sem rastrear scroll). Ganho pequeno para o custo de
 * mais uma peça de estado; revisar se algum dia incomodar visualmente.
 */
const props = withDefaults(
  defineProps<{
    titulo: string
    /** Destino da seta quando não há histórico para voltar (link aberto direto). */
    voltarPara?: string | null
  }>(),
  { voltarPara: null },
)

const router = useRouter()

function voltar(): void {
  if (window.history.state?.back) {
    router.back()
  } else if (props.voltarPara) {
    void router.push(props.voltarPara)
  }
}
</script>

<template>
  <header class="flex h-[72px] shrink-0 items-center gap-space-3 border-b border-linha px-space-5 md:px-space-8">
    <button
      v-if="voltarPara"
      type="button"
      class="-ml-space-3 flex size-12 shrink-0 items-center justify-center rounded-base text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
      aria-label="Voltar"
      @click="voltar"
    >
      <PhArrowLeft
        :size="24"
        weight="regular"
        aria-hidden="true"
      />
    </button>
    <h1 class="min-w-0 truncate text-display text-tinta">
      {{ titulo }}
    </h1>
    <div
      id="cabecalho-acoes"
      class="ml-auto flex items-center"
    />
  </header>
</template>
