<script setup lang="ts">
import { ref } from 'vue'

import type { AlvoDaDenuncia, OpcoesDoDenunciar } from '../../moderacao/useDenunciar'
import AvisoFlutuante from '../ui/AvisoFlutuante.vue'
import DialogoDenunciar from './DialogoDenunciar.vue'

/**
 * Denúncia com o toast de confirmação (denunciar.md §4.8): a tela de origem só diz o alvo, e o
 * aviso sobrevive ao fechamento do dialog. `alvo` nulo fecha.
 */
defineProps<{ alvo: AlvoDaDenuncia | null; servico?: OpcoesDoDenunciar['servico'] }>()
const emit = defineEmits<{ fechar: [] }>()

const enviada = ref(false)

function aoEnviar(): void {
  enviada.value = true
  emit('fechar')
}
</script>

<template>
  <DialogoDenunciar
    v-if="alvo"
    :key="alvo.tipo + alvo.id"
    :alvo="alvo"
    :servico="servico"
    @enviada="aoEnviar"
    @fechar="emit('fechar')"
  />
  <AvisoFlutuante
    :aberto="enviada"
    @fechar="enviada = false"
  >
    Denúncia enviada. A moderação vai analisar.
  </AvisoFlutuante>
</template>
