<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import BotaoTextual from '../ui/BotaoTextual.vue'

/**
 * Marca do fim da lista paginada: quando entra na tela, pede a próxima página. Sem
 * `IntersectionObserver` (navegador antigo, teste), vira o botão `Carregar mais`, e o botão também
 * aparece quando a página seguinte falhou, para a pessoa tentar de novo.
 *
 * O observador só avisa quando a marca **entra** na tela. Se a página nova não a empurrar para
 * fora (lista curta, edições agrupadas num card só, monitor alto), ele não avisaria de novo e a
 * paginação pararia. Com `carregando`, cada carga que termina reobserva a marca, o que gera um
 * aviso com o estado atual: ainda visível, pede a seguinte.
 */
const props = defineProps<{ falhou: boolean; carregando?: boolean }>()
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

watch(
  () => props.carregando,
  (agora, antes) => {
    if (antes && !agora && observador && marca.value) {
      observador.unobserve(marca.value)
      observador.observe(marca.value)
    }
  },
)

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
