<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import CapaLivro from '../livros/CapaLivro.vue'
import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import { tempoDeEspera } from '../../perfil/textos'
import type { RecomendacaoRecebida } from '../../services/social'

const props = withDefaults(
  defineProps<{
    recomendacao: RecomendacaoRecebida
    /** Lista completa: mensagem inteira. Na seção do Descobrir ela corta em duas linhas. */
    completa?: boolean
    capaGrande?: boolean
  }>(),
  { completa: false, capaGrande: false },
)

const tempo = computed(() => tempoDeEspera(props.recomendacao.criadoEm))
const rotulo = computed(() => {
  const { livro, remetente, mensagem } = props.recomendacao
  const deQuem = livro.autor ? `${livro.titulo}, de ${livro.autor}.` : `${livro.titulo}.`
  const atribuicao = `${remetente.nomeExibicao} te recomendou ${tempo.value}`
  return mensagem ? `${deQuem} ${atribuicao}: ${mensagem}` : `${deQuem} ${atribuicao}.`
})
</script>

<template>
  <div class="flex items-start gap-space-2">
    <RouterLink
      :to="{ name: 'livro-oficial', params: { id: recomendacao.livro.id }, query: { origem: 'descobrir' } }"
      :aria-label="rotulo"
      class="flex min-w-0 flex-1 gap-space-4 rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
    >
      <CapaLivro
        :url="recomendacao.livro.capaUrl"
        :titulo="recomendacao.livro.titulo"
        :autor="recomendacao.livro.autor"
        class="h-[90px] w-[60px]"
        :class="capaGrande ? 'md:h-[120px] md:w-20' : ''"
      />
      <span class="flex min-w-0 flex-col">
        <span class="line-clamp-2 text-title-sm text-tinta">{{ recomendacao.livro.titulo }}</span>
        <span
          v-if="recomendacao.livro.autor"
          class="truncate text-body text-grafite"
        >{{ recomendacao.livro.autor }}</span>
        <span class="mt-space-2 flex items-start gap-space-2 text-caption">
          <AvatarLeitor
            :url="recomendacao.remetente.avatarUrl"
            :nome="recomendacao.remetente.nomeExibicao"
            :tamanho="20"
          />
          <span>
            <span class="font-semibold text-tinta">{{ recomendacao.remetente.nomeExibicao }}</span>
            <span class="text-grafite"> te recomendou</span>
            <span class="text-grafite-suave"> · {{ tempo }}</span>
          </span>
        </span>
        <span
          v-if="recomendacao.mensagem"
          class="mt-space-2 whitespace-pre-line text-body text-grafite"
          :class="completa ? '' : 'line-clamp-2'"
        >{{ recomendacao.mensagem }}</span>
      </span>
    </RouterLink>
    <slot name="acoes" />
  </div>
</template>
