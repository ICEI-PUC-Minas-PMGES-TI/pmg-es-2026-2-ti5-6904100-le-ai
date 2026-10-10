<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'

import { textoSemMarcacao } from '../../markdown/resenha'
import type { ResenhaDoPerfil } from '../../services/leitura'
import BlocoDeSpoiler from '../livros/BlocoDeSpoiler.vue'
import CapaLivro from '../livros/CapaLivro.vue'
import EstrelasNota from '../livros/EstrelasNota.vue'
import ReacoesDaResenha from '../livros/ReacoesDaResenha.vue'

/**
 * Resenha no perfil (meu-perfil.md §4 e §5): capa, título, autor, estrelas com o valor e o trecho
 * de três linhas em Newsreader. Com spoiler, quem não é o autor vê o bloco oculto e revela por
 * ação; o texto não está no DOM antes disso (RF-AVA-03). Ao revelar, o foco vai para o texto,
 * para o leitor de tela continuar dali. O livro abre na aba Perfil.
 *
 * Reações (F-AVA-2): no perfil de outro leitor, os botões de curtir e descurtir; no meu perfil, só
 * as contagens, sem botão (meu-perfil.md §4 D). O trecho sai sem a marcação do Markdown, com cada
 * bloco numa linha; a resenha formatada fica na página do livro.
 */
const props = defineProps<{ resenha: ResenhaDoPerfil; proprio: boolean }>()

const revelada = ref(false)
const oculta = computed(() => props.resenha.spoiler && !props.proprio && !revelada.value)
const textoDaResenha = useTemplateRef<HTMLParagraphElement>('textoDaResenha')
const trecho = computed(() => textoSemMarcacao(props.resenha.texto))

async function revelar(): Promise<void> {
  revelada.value = true
  await nextTick()
  textoDaResenha.value?.focus()
}

const destino = computed(() =>
  props.resenha.livro.tipo === 'pessoal'
    ? { name: 'livro-pessoal', params: { id: props.resenha.livro.id } }
    : { name: 'livro-oficial', params: { id: props.resenha.livro.id }, query: { origem: 'perfil' } },
)
</script>

<template>
  <article class="flex gap-space-4 py-space-5">
    <RouterLink
      :to="destino"
      class="shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
      :aria-label="resenha.livro.titulo"
    >
      <CapaLivro
        class="h-[60px] w-10 md:h-[90px] md:w-[60px]"
        :url="resenha.livro.capaUrl"
        :titulo="resenha.livro.titulo"
        :autor="resenha.livro.autor"
        :rotulo="`Capa de ${resenha.livro.titulo}`"
      />
    </RouterLink>
    <div class="min-w-0 flex-1">
      <RouterLink
        :to="destino"
        class="line-clamp-2 text-title-sm text-tinta hover:underline focus-visible:underline"
      >
        {{ resenha.livro.titulo }}
      </RouterLink>
      <p
        v-if="resenha.livro.autor"
        class="text-caption text-grafite"
      >
        {{ resenha.livro.autor }}
      </p>
      <EstrelasNota
        v-if="resenha.nota !== null"
        class="mt-space-2"
        :valor="resenha.nota"
        tamanho="sm"
      />
      <BlocoDeSpoiler
        v-if="oculta"
        class="mt-space-3"
        @revelar="revelar"
      />
      <p
        v-else
        ref="textoDaResenha"
        tabindex="-1"
        class="mt-space-2 line-clamp-3 outline-none whitespace-pre-line font-editorial text-body text-grafite"
      >
        {{ trecho }}
      </p>
      <ReacoesDaResenha
        class="mt-space-3"
        :resenha-id="resenha.id"
        :reacoes="resenha"
        :somente-leitura="proprio"
      />
    </div>
  </article>
</template>
