<script setup lang="ts">
defineProps<{ rotulo: string }>()

const QUANTIDADE = 12
const NO_MOBILE = 6
</script>

<template>
  <ul
    class="aparecer grid grid-cols-2 gap-space-4 md:grid-cols-4 lg:grid-cols-6"
    aria-busy="true"
    :aria-label="rotulo"
  >
    <li
      v-for="posicao in QUANTIDADE"
      :key="posicao"
      class="flex-col gap-space-2"
      :class="posicao > NO_MOBILE ? 'hidden lg:flex' : 'flex'"
    >
      <span class="aspect-[2/3] w-full bg-capa-placeholder" />
      <span class="h-[18px] w-[85%] rounded-sm bg-capa-placeholder" />
      <span class="h-[13px] w-[55%] rounded-sm bg-capa-placeholder" />
    </li>
  </ul>
</template>

<style scoped>
.aparecer {
  animation: aparecer var(--duration-base) var(--easing-out);
}

@media (prefers-reduced-motion: reduce) {
  .aparecer {
    animation: none;
  }
}

@keyframes aparecer {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
