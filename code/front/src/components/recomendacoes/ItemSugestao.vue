<script setup lang="ts">
import { PhXCircle } from '@phosphor-icons/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import type { Sugestao } from '../../services/social'
import CapaLivro from '../livros/CapaLivro.vue'
import type { AcaoDaFolha } from '../ui/FolhaAcoes.vue'
import MenuDeAcoes from '../ui/MenuDeAcoes.vue'

/**
 * Item de sugestão (descobrir.md do Período 3, §5): o item de recomendação recebida com a linha
 * de motivo no lugar da atribuição e o `DotsThree` sempre visível. O motivo diz quantos leram,
 * nunca quem (RN-08), e vem pronto do servidor (RF-REC-11). Dois alvos: o item leva à página do
 * livro, o menu só descarta.
 */
const props = defineProps<{ sugestao: Sugestao }>()
defineEmits<{ descartar: [] }>()

const rotulo = computed(() => {
  const { livro, motivo } = props.sugestao
  const deQuem = livro.autor ? `${livro.titulo}, de ${livro.autor}.` : `${livro.titulo}.`
  return `${deQuem} ${motivo.texto}.`
})

const acoes: AcaoDaFolha[] = [
  {
    id: 'descartar',
    rotulo: 'Descartar sugestão',
    detalhe: 'Este livro não volta a aparecer nas sugestões.',
    icone: PhXCircle,
  },
]
</script>

<template>
  <div class="flex items-start gap-space-2">
    <RouterLink
      :to="{ name: 'livro-oficial', params: { id: sugestao.livro.id }, query: { origem: 'descobrir' } }"
      :aria-label="rotulo"
      class="flex min-w-0 flex-1 gap-space-4 rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
    >
      <CapaLivro
        :url="sugestao.livro.capaUrl"
        :titulo="sugestao.livro.titulo"
        :autor="sugestao.livro.autor"
        class="h-[90px] w-[60px] md:h-[120px] md:w-20"
      />
      <span class="flex min-w-0 flex-col">
        <span class="line-clamp-2 text-title-sm text-tinta">{{ sugestao.livro.titulo }}</span>
        <span
          v-if="sugestao.livro.autor"
          class="truncate text-body text-grafite"
        >{{ sugestao.livro.autor }}</span>
        <span class="mt-space-2 line-clamp-2 text-caption text-grafite">{{ sugestao.motivo.texto }}</span>
      </span>
    </RouterLink>
    <MenuDeAcoes
      class="-mr-space-3 -mt-space-3 md:-mr-space-1 md:-mt-space-1"
      :rotulo="`Mais ações para ${sugestao.livro.titulo}`"
      :acoes="acoes"
      largura-minima="280px"
      @escolher="$emit('descartar')"
    />
  </div>
</template>
