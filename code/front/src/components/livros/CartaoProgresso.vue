<script setup lang="ts">
/**
 * Cartão de progresso de operação longa (cadastro-por-isbn.md §4.3): skeleton estático com um
 * único fade de entrada e uma linha de estado que troca de texto sem trocar o layout. Sem
 * spinner, sem porcentagem: o servidor não informa progresso. Nasceu no prompt e está pendente
 * de incorporação ao documento-de-design.
 */
defineProps<{ mensagem: string }>()
</script>

<template>
  <div class="aparecer rounded-md bg-papel-elevado p-space-5">
    <div
      class="flex flex-col gap-space-3"
      aria-hidden="true"
    >
      <div class="h-4 w-[70%] rounded-sm bg-linha" />
      <div class="h-3.5 w-[45%] rounded-sm bg-linha" />
      <div class="h-3.5 w-[35%] rounded-sm bg-linha" />
    </div>
    <Transition
      mode="out-in"
      enter-active-class="transition-opacity duration-dur-base"
      leave-active-class="transition-opacity duration-dur-base"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <p
        :key="mensagem"
        class="mt-space-4 text-caption text-grafite"
      >
        {{ mensagem }}
      </p>
    </Transition>
  </div>
</template>

<style scoped>
/*
 * A animação fica aqui, e não numa classe arbitrária do Tailwind no template: o CSS com escopo
 * renomeia o `@keyframes` e só reescreve o nome nas declarações deste bloco.
 */
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
