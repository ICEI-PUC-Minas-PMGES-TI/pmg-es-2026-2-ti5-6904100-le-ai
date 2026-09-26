<script setup lang="ts">
import { PhBooks } from '@phosphor-icons/vue'
import { ref, useId } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * Estante e Resenhas do perfil (meu-perfil.md e perfil-de-outro-leitor.md), sempre no estado
 * vazio do artboard "sem estante e sem resenhas": o serviço `leitura` ainda não expõe
 * `listarEstantePerfil` nem `listarResenhasPerfil` (decisão do dono de 25/09/2026). Quando ele
 * existir, as capas e as resenhas entram no lugar dos vazios, sem mexer na estrutura.
 *
 * Abaixo de 768px, as duas seções empilhadas, cada uma com o próprio título; a partir de 768px,
 * as abas Estante/Resenhas da coluna direita, com uma seção visível por vez.
 *
 * Quem usa decide se mostra: no perfil de outro leitor com conteúdo restrito (RN-08), as seções
 * não aparecem, e sim o bloco "Este perfil é privado".
 */
const props = defineProps<{
  /** Perfil do próprio leitor: textos na segunda pessoa e o CTA "Buscar livros". */
  proprio: boolean
  /** Primeiro nome do dono do perfil, para os textos do perfil de outro leitor. */
  nome?: string
}>()

type Aba = 'estante' | 'resenhas'

const aba = ref<Aba>('estante')
const id = useId()

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'estante', rotulo: 'Estante' },
  { chave: 'resenhas', rotulo: 'Resenhas' },
]

const textoDaEstante = props.proprio
  ? 'Os livros que você adicionar aparecem aqui.'
  : `${props.nome ?? 'Este leitor'} ainda não tem livros na estante.`
const textoDasResenhas = props.proprio
  ? 'Suas resenhas aparecem aqui depois que você escrever a primeira.'
  : `${props.nome ?? 'Este leitor'} ainda não escreveu resenhas.`

/** Setas trocam de aba, como pede o padrão de abas da WAI-ARIA. */
function aoTeclar(evento: KeyboardEvent): void {
  if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') {
    return
  }
  evento.preventDefault()
  aba.value = aba.value === 'estante' ? 'resenhas' : 'estante'
  document.getElementById(`${id}-aba-${aba.value}`)?.focus()
}
</script>

<template>
  <div>
    <div
      class="hidden gap-space-6 border-b border-linha md:flex"
      role="tablist"
      aria-label="Estante e resenhas"
    >
      <button
        v-for="item in ABAS"
        :id="`${id}-aba-${item.chave}`"
        :key="item.chave"
        type="button"
        role="tab"
        :aria-selected="aba === item.chave"
        :aria-controls="`${id}-painel-${item.chave}`"
        :tabindex="aba === item.chave ? 0 : -1"
        class="-mb-px border-b-2 py-space-3 text-body-strong transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        :class="aba === item.chave ? 'border-musgo text-musgo' : 'border-transparent text-grafite hover:text-tinta'"
        @click="aba = item.chave"
        @keydown="aoTeclar"
      >
        {{ item.rotulo }}
      </button>
    </div>

    <!-- `md:hidden` e não `hidden`: abaixo de 768px as duas seções aparecem, uma sobre a outra. -->
    <section
      :id="`${id}-painel-estante`"
      role="tabpanel"
      :aria-labelledby="`${id}-aba-estante`"
      :class="aba === 'estante' ? '' : 'md:hidden'"
    >
      <div class="flex items-baseline justify-between md:hidden">
        <h2 class="text-title-lg text-tinta">
          Estante
        </h2>
        <RouterLink
          v-if="proprio"
          to="/estante"
          class="rounded-sm text-caption font-semibold text-musgo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        >
          Ver tudo
        </RouterLink>
      </div>
      <div class="mt-space-5 flex flex-col items-center gap-space-6 py-space-4 text-center md:mt-0 md:pt-space-12">
        <PhBooks
          :size="32"
          weight="regular"
          class="text-grafite-suave"
          aria-hidden="true"
        />
        <p class="max-w-[360px] text-body text-grafite">
          {{ textoDaEstante }}
        </p>
        <RouterLink
          v-if="proprio"
          to="/descobrir"
          class="flex h-12 items-center justify-center rounded-full bg-musgo px-space-6 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
        >
          Buscar livros
        </RouterLink>
      </div>
    </section>

    <section
      :id="`${id}-painel-resenhas`"
      role="tabpanel"
      :aria-labelledby="`${id}-aba-resenhas`"
      class="mt-space-12 md:mt-0"
      :class="aba === 'resenhas' ? '' : 'md:hidden'"
    >
      <h2 class="text-title-lg text-tinta md:hidden">
        Resenhas
      </h2>
      <p class="mx-auto mt-space-4 max-w-[360px] text-center text-body text-grafite md:mt-0 md:pt-space-12">
        {{ textoDasResenhas }}
      </p>
    </section>
  </div>
</template>
