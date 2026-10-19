<script setup lang="ts">
import { PhHeart } from '@phosphor-icons/vue'
import { ref, watch } from 'vue'

const props = defineProps<{
  ativo: boolean
  tamanho: number
}>()

const TOTAL_DE_PARTICULAS = 6
const ANGULOS_DAS_PARTICULAS = Array.from({ length: TOTAL_DE_PARTICULAS }, (_, i) => (360 / TOTAL_DE_PARTICULAS) * i)

const celebrando = ref(false)

watch(
  () => props.ativo,
  (ativo, antes) => {
    if (ativo && !antes) {
      celebrando.value = true
    }
  },
)
</script>

<template>
  <span
    class="relative inline-flex"
    :class="{ 'coracao-pulsando': celebrando }"
    @animationend.self="celebrando = false"
  >
    <PhHeart
      :size="tamanho"
      :weight="ativo ? 'fill' : 'regular'"
      aria-hidden="true"
    />
    <template v-if="celebrando">
      <span
        v-for="angulo in ANGULOS_DAS_PARTICULAS"
        :key="angulo"
        class="particula"
        :style="{ '--angulo': `${angulo}deg` }"
        aria-hidden="true"
      />
    </template>
  </span>
</template>

<style scoped>
.coracao-pulsando {
  animation: coracao-pulsar var(--duration-base) var(--easing-out);
}

.particula {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  margin: -2px;
  border-radius: 9999px;
  background-color: var(--color-musgo);
  pointer-events: none;
  animation: particula-soltar var(--duration-base) var(--easing-out) forwards;
}

.particula:nth-child(odd) {
  background-color: var(--color-musgo-vivo);
}

@keyframes coracao-pulsar {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes particula-soltar {
  0% {
    opacity: 1;
    transform: rotate(var(--angulo)) translateY(-10px) scale(1);
  }
  60% {
    opacity: 1;
    transform: rotate(var(--angulo)) translateY(-18px) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angulo)) translateY(-20px) scale(0);
  }
}
</style>
