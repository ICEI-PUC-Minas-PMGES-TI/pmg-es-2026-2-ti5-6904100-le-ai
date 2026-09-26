<script setup lang="ts">
import { PhEyeSlash } from '@phosphor-icons/vue'
import { ref } from 'vue'

import { formatarData } from '../../livros/formatos'
import type { ResenhaDoLivro } from '../../services/acervo'
import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'

/**
 * Resenha de outro leitor na página do livro (pagina-do-livro.md §4.1 e §4.6). Com spoiler, o
 * texto **não está no DOM** até o toque em "Mostrar mesmo assim": nem borrado nem escondido por
 * CSS, que o leitor de tela e o "copiar" encontrariam. O texto vai por interpolação, com escape
 * (RNF-SEC-14).
 *
 * Sem `@username`, estrelas e contagem, que o contrato do Período 1 não traz (divergência
 * registrada na feature). No mobile é item de lista; a partir de 1024px vira card.
 */
const props = defineProps<{ resenha: ResenhaDoLivro }>()

const revelada = ref(false)
</script>

<template>
  <article class="flex flex-col lg:rounded-md lg:border lg:border-transparent lg:bg-papel-elevado lg:p-space-5 lg:transition-colors lg:duration-dur-fast lg:hover:border-linha">
    <header class="flex items-center gap-space-3">
      <AvatarLeitor
        :url="props.resenha.autorAvatarUrl ?? null"
        :tamanho="40"
        :nome="props.resenha.autorNome"
      />
      <h3 class="min-w-0 truncate text-title-sm text-tinta">
        {{ props.resenha.autorNome }}
      </h3>
    </header>
    <div
      v-if="props.resenha.spoiler && !revelada"
      class="mt-space-3 flex min-h-24 flex-col items-center justify-center gap-space-2 rounded-base border border-linha bg-papel-elevado p-space-4 text-center lg:bg-papel"
    >
      <PhEyeSlash
        :size="20"
        weight="regular"
        class="text-grafite"
        aria-hidden="true"
      />
      <p class="text-caption text-grafite">
        Esta resenha contém spoiler
      </p>
      <BotaoTextual
        class="min-h-12 md:min-h-10"
        @click="revelada = true"
      >
        Mostrar mesmo assim
      </BotaoTextual>
    </div>
    <p
      v-else
      class="mt-space-3 whitespace-pre-line font-editorial text-body-lg text-tinta"
    >
      {{ props.resenha.texto }}
    </p>
    <p class="mt-space-2 text-caption text-grafite-suave">
      {{ formatarData(props.resenha.criadoEm) }}
    </p>
  </article>
</template>
