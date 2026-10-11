<script setup lang="ts">
import type { AvisoDoDescarte } from '../../recomendacoes/useDescarteDeRecomendacao'
import AvisoFlutuante from '../ui/AvisoFlutuante.vue'

defineProps<{ aviso: AvisoDoDescarte | null }>()
defineEmits<{ tentarDeNovo: []; fechar: [] }>()
</script>

<template>
  <AvisoFlutuante
    :aberto="aviso !== null"
    :tom="aviso?.falhou ? 'rubi' : 'musgo'"
    :acao="aviso?.falhou ? 'Tentar de novo' : undefined"
    @acao="$emit('tentarDeNovo')"
    @fechar="$emit('fechar')"
  >
    {{ aviso?.texto }}
  </AvisoFlutuante>
</template>
