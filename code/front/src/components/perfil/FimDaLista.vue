<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import BotaoTextual from '../ui/BotaoTextual.vue'

/**
 * Marca do fim da lista paginada: quando entra na tela, pede a próxima página. Sem
 * `IntersectionObserver` (navegador antigo, teste), vira o botão `Carregar mais`, e o botão também
 * aparece quando a página seguinte falhou, para a pessoa tentar de novo.
 */
const props = defineProps<{ falhou: boolean }>()
const emit = defineEmits<{ carregar: [] }>()

const marca = ref<HTMLElement | null>(null)
const observa = typeof IntersectionObserver !== 'undefined'
let observador: IntersectionObserver | null = null

onMounted(() => {
  if (!observa || !marca.value) {
    return
  }
  observador = new IntersectionObserver((entradas) => {
    if (entradas.some((entrada) => entrada.isIntersecting) && !props.falhou) {
      emit('carregar')
    }
  })
  observador.observe(marca.value)
})

onBeforeUnmount(() => observador?.disconnect())
</script>

<template>
  <div
    ref="marca"
    class="flex flex-col items-center gap-space-2 py-space-4"
  >
    <p
      v-if="falhou"
      class="text-caption text-grafite"
      role="alert"
    >
      Não foi possível carregar mais. Verifique sua conexão.
    </p>
    <BotaoTextual
      v-if="!observa || falhou"
      class="min-h-12 md:min-h-10"
      @click="emit('carregar')"
    >
      {{ falhou ? 'Tentar de novo' : 'Carregar mais' }}
    </BotaoTextual>
  </div>
</template>
