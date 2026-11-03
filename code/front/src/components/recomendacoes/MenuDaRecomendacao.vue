<script setup lang="ts">
import { PhUserCircle, PhXCircle } from '@phosphor-icons/vue'
import { computed } from 'vue'

import { ACAO_DESCARTAR, ACAO_VER_PERFIL } from '../../recomendacoes/useDescarteDeRecomendacao'
import type { RecomendacaoRecebida } from '../../services/social'
import type { AcaoDaFolha } from '../ui/FolhaAcoes.vue'
import MenuDeAcoes from '../ui/MenuDeAcoes.vue'

const props = defineProps<{ recomendacao: RecomendacaoRecebida }>()
defineEmits<{ escolher: [acao: string] }>()

const rotulo = computed(
  () => `Mais ações para ${props.recomendacao.livro.titulo}, recomendado por ${props.recomendacao.remetente.nomeExibicao}`,
)
const acoes = computed<AcaoDaFolha[]>(() => [
  { id: ACAO_VER_PERFIL, rotulo: `Ver perfil de ${props.recomendacao.remetente.nomeExibicao}`, icone: PhUserCircle },
  {
    id: ACAO_DESCARTAR,
    rotulo: 'Descartar recomendação',
    detalhe: 'Quem recomendou não fica sabendo.',
    icone: PhXCircle,
  },
])
</script>

<template>
  <MenuDeAcoes
    class="-mr-space-3 -mt-space-3 md:-mr-space-1 md:-mt-space-1"
    :rotulo="rotulo"
    :acoes="acoes"
    @escolher="$emit('escolher', $event)"
  />
</template>
