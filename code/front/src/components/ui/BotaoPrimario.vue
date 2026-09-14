<script setup lang="ts">
/**
 * CTA principal da tela (documento-de-design §4.1): sempre pill, sempre `musgo`/`papel`, altura
 * fixa de 40px na web (48px é a medida do widget mobile — plataforma diferente, não breakpoint).
 */
withDefaults(
  defineProps<{
    /**
     * Estado de envio (ex.: cold start, RNF-ERR-09). Desabilita o botão; quem troca o texto
     * ("Entrando", "Criando conta") é a tela via slot — o componente não conhece a copy de cada
     * tela (prompts de protótipo §8).
     */
    carregando?: boolean
    /** Desabilitado por outro motivo (ex.: bloqueio progressivo, RNF-SEC-29). */
    disabled?: boolean
    tipo?: 'button' | 'submit'
  }>(),
  {
    carregando: false,
    disabled: false,
    tipo: 'button',
  },
)
</script>

<template>
  <button
    :type="tipo"
    :disabled="disabled || carregando"
    :aria-busy="carregando ? 'true' : undefined"
    class="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-full bg-musgo px-space-5 text-body-strong text-papel transition-all duration-dur-fast active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
  >
    <slot />
  </button>
</template>
