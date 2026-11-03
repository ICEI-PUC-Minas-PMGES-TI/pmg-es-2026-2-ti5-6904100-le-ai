<script setup lang="ts">
/** Ação de apoio, ao lado de um botão primário: **outline** `musgo`, raio 12 (documento-de-design §4.1). */
defineProps<{ disabled?: boolean }>()
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="inline-flex h-12 w-full items-center justify-center gap-space-2 whitespace-nowrap rounded-base border border-musgo bg-transparent px-space-5 text-body-strong text-musgo transition-all duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 md:h-10 md:w-auto"
  >
    <slot />
  </button>
</template>
