<script setup lang="ts">
/**
 * Ação destrutiva (documento-de-design §4.1 e §7.8): **outline** `rubi`, nunca preenchido, raio
 * 12. Só aparece depois de uma confirmação ou como o gatilho dela (RNF-USA-04).
 */
withDefaults(
  defineProps<{
    carregando?: boolean
    disabled?: boolean
  }>(),
  { carregando: false, disabled: false },
)
</script>

<template>
  <button
    type="button"
    :disabled="disabled || carregando"
    :aria-busy="carregando ? 'true' : undefined"
    class="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-base border border-rubi bg-transparent px-space-5 text-body-strong text-rubi transition-all duration-dur-fast hover:bg-rubi-fundo focus-visible:border-[1.5px] focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
  >
    <slot />
  </button>
</template>
