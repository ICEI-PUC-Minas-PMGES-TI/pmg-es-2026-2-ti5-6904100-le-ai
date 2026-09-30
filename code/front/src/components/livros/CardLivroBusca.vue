<script setup lang="ts">
import { PhCaretDown, PhCaretRight, PhCaretUp } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import type { GrupoDeEdicoes } from '../../livros/agruparEdicoes'
import { formatarPaginas } from '../../livros/formatos'
import type { LivroOficialResumo } from '../../services/acervo'
import CapaLivro from './CapaLivro.vue'

/**
 * Card da busca, variante Busca do design §4.5, para um grupo de edições (RN-01). O card inteiro
 * abre a edição principal: o link do título se estica sobre o card, e o `N edições` fica por cima
 * dele, expandindo as outras edições logo abaixo, cada uma abrindo a sua. Nenhuma nota: ela só
 * existe a partir de F-ACV-NOTA.
 */
const props = defineProps<{ grupo: GrupoDeEdicoes }>()

const expandido = ref(false)
const livro = computed(() => props.grupo.principal)
const autores = computed(() => nomesDosAutores(livro.value))
const outras = computed(() => props.grupo.edicoes.slice(1))

function nomesDosAutores(edicao: LivroOficialResumo): string | null {
  return edicao.autores.length ? edicao.autores.map((autor) => autor.nome).join(', ') : null
}

/** `Pallas · 2003`: só o que existe. Sem editora nem ano, a linha some. */
function editoraEAno(edicao: LivroOficialResumo): string | null {
  const partes = [edicao.editora, edicao.anoPublicacao === null ? null : String(edicao.anoPublicacao)]
  const presentes = partes.filter((parte): parte is string => Boolean(parte))
  return presentes.length ? presentes.join(' · ') : null
}

function destino(id: string) {
  return { name: 'livro-oficial', params: { id }, query: { origem: 'descobrir' } }
}
</script>

<template>
  <div>
    <article class="relative flex gap-space-4 rounded-base py-space-4 transition-colors duration-dur-fast focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-musgo md:p-space-3 md:hover:bg-papel-elevado">
      <CapaLivro
        :url="livro.capa.url"
        :titulo="livro.titulo"
        :autor="autores"
        class="h-[120px] w-20"
      />
      <div class="flex min-w-0 flex-1 flex-col items-start">
        <h3 class="line-clamp-2 text-title-sm text-tinta">
          <RouterLink
            :to="destino(livro.id)"
            class="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {{ livro.titulo }}
          </RouterLink>
        </h3>
        <p
          v-if="autores"
          class="mt-space-1 text-body text-grafite"
        >
          {{ autores }}
        </p>
        <p
          v-if="editoraEAno(livro)"
          class="mt-space-1 text-caption text-grafite-suave"
        >
          {{ editoraEAno(livro) }}
        </p>
        <p class="text-caption text-grafite-suave">
          {{ formatarPaginas(livro.paginas) }}
        </p>
        <button
          v-if="outras.length"
          type="button"
          class="relative z-10 mt-space-2 inline-flex min-h-6 items-center gap-space-1 text-caption font-semibold text-musgo hover:underline focus-visible:underline focus-visible:outline-none"
          :aria-expanded="expandido"
          @click="expandido = !expandido"
        >
          {{ grupo.edicoes.length }} edições
          <component
            :is="expandido ? PhCaretUp : PhCaretDown"
            :size="16"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
    <!-- Recuo de 96px: a capa de 80 mais o `space-4` até o texto, alinhando com o título. -->
    <ul
      v-if="expandido"
      class="pb-space-3 pl-[96px] md:pl-[108px]"
    >
      <li
        v-for="edicao in outras"
        :key="edicao.id"
      >
        <RouterLink
          :to="destino(edicao.id)"
          class="flex min-h-12 items-center gap-space-3 rounded-base text-caption text-grafite hover:bg-papel-elevado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:min-h-10"
        >
          <CapaLivro
            :url="edicao.capa.url"
            :icone="false"
            class="h-12 w-8"
          />
          <span class="flex-1">{{ [editoraEAno(edicao), formatarPaginas(edicao.paginas)].filter(Boolean).join(' · ') }}</span>
          <PhCaretRight
            :size="16"
            weight="regular"
            class="text-grafite-suave"
            aria-hidden="true"
          />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
