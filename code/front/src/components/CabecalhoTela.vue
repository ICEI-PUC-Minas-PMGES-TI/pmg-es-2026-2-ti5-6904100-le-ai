<script setup lang="ts">
import { PhArrowLeft, PhX } from '@phosphor-icons/vue'
import { useRouter } from 'vue-router'

/**
 * Cabeçalho que toda tela autenticada herda (shell-de-navegacao.md §4 "Padrão de header" e §5
 * "Área de conteúdo"). Sem sino na web: notificações estão fora do escopo do cliente web
 * (REQUISITOS.md §2.1) — o sino é só do app Flutter.
 *
 * Barra de 72px (padrão): tela de detalhe ganha a seta `ArrowLeft` à esquerda do título
 * (cadastro-por-isbn.md §4). As ações contextuais da direita entram por
 * `<Teleport to="#cabecalho-acoes" defer>` a partir da própria tela.
 *
 * Com `rotuloVoltar`, a partir de 768px o cabeçalho segue os protótipos web de F-AUT e F-PERFIL:
 * sem barra, o link `← <rótulo>` em `musgo` acima do título e as ações na linha do título. Abaixo
 * de 768px fica a barra com a seta. Um grid mantém um único `#cabecalho-acoes` nas duas formas.
 *
 * Simplificação assumida: onde há divisor, ele sai fixo aqui (sem rastrear scroll).
 */
const props = withDefaults(
  defineProps<{
    titulo: string
    /** Destino da seta quando não há histórico para voltar (link aberto direto). */
    voltarPara?: string | null
    /**
     * Tela de formulário que se abandona (editar-perfil.md §4): `X` em vez da seta, com o mesmo
     * destino. Quem confirma o descarte é a guarda de saída da própria tela.
     */
    fechar?: boolean
    /** Texto do link de retorno da web (`Perfil`, `Configurações`, `Voltar`). */
    rotuloVoltar?: string | null
    semDivisor?: boolean
  }>(),
  { voltarPara: null, fechar: false, rotuloVoltar: null, semDivisor: false },
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
  <header
    class="grid h-[72px] shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-space-3 px-space-5 md:px-space-8"
    :class="[
      semDivisor ? '' : 'border-b border-linha',
      rotuloVoltar && voltarPara
        ? 'md:h-auto md:grid-cols-[minmax(0,1fr)_auto] md:gap-y-space-2 md:pb-space-2 md:pt-space-8'
        : '',
    ]"
  >
    <button
      v-if="voltarPara"
      type="button"
      class="-ml-space-3 flex size-12 shrink-0 items-center justify-center rounded-base text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
      :class="rotuloVoltar ? 'md:hidden' : ''"
      :aria-label="fechar ? 'Fechar' : 'Voltar'"
      @click="voltar"
    >
      <component
        :is="fechar ? PhX : PhArrowLeft"
        :size="24"
        weight="regular"
        aria-hidden="true"
      />
    </button>
    <button
      v-if="voltarPara && rotuloVoltar"
      type="button"
      class="-ml-space-1 hidden items-center gap-space-2 justify-self-start rounded-base px-space-1 text-body-strong text-musgo transition-colors duration-dur-fast hover:underline focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo md:col-span-2 md:row-start-1 md:flex"
      @click="voltar"
    >
      <PhArrowLeft
        :size="20"
        weight="regular"
        aria-hidden="true"
      />
      {{ rotuloVoltar }}
    </button>
    <h1
      class="min-w-0 truncate text-display text-tinta"
      :class="[
        voltarPara ? '' : 'col-span-2',
        rotuloVoltar && voltarPara ? 'md:col-span-1 md:col-start-1 md:row-start-2' : '',
        rotuloVoltar && voltarPara && !titulo ? 'md:hidden' : '',
      ]"
    >
      {{ titulo }}
    </h1>
    <div
      id="cabecalho-acoes"
      class="col-start-3 row-start-1 flex items-center justify-self-end"
      :class="rotuloVoltar && voltarPara ? 'md:col-start-2 md:row-start-2' : ''"
    />
  </header>
</template>
