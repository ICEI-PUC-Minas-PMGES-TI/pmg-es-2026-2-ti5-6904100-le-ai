<script setup lang="ts">
import { computed } from 'vue'

/**
 * CTA principal da tela (documento-de-design §4.1): sempre pill, sempre `musgo`/`papel`, altura
 * fixa de 40px na web (48px é a medida do widget mobile — plataforma diferente, não breakpoint).
 * `hover` em `musgo-vivo`, o token de hover e press do acento.
 */
const props = withDefaults(
  defineProps<{
    /**
     * Estado de envio (ex.: cold start, RNF-ERR-09). Bloqueia o clique mas **mantém o `musgo`
     * pleno**: é trabalho em andamento, não botão indisponível (login.md e cadastro.md de P0-NAV,
     * cadastro-por-isbn.md §4.3). Quem troca o texto ("Entrando", "Buscando") é a tela via slot.
     */
    carregando?: boolean
    /** Desabilitado por outro motivo (ex.: bloqueio progressivo, RNF-SEC-29). */
    disabled?: boolean
    /**
     * Aparência do desabilitado. `esmaecida` (padrão) é o `musgo` com opacidade reduzida do
     * bloqueio do login (login.md §4.3); `neutra` é fundo `linha` com texto `grafite-suave`, para
     * o botão que ainda espera a entrada ficar completa (cadastro-por-isbn.md §4.1).
     */
    aparenciaDesabilitada?: 'esmaecida' | 'neutra'
    tipo?: 'button' | 'submit'
  }>(),
  {
    carregando: false,
    disabled: false,
    aparenciaDesabilitada: 'esmaecida',
    tipo: 'button',
  },
)

const estado = computed(() => {
  if (props.carregando) {
    return 'cursor-progress bg-musgo text-papel'
  }
  if (props.disabled) {
    return props.aparenciaDesabilitada === 'neutra'
      ? 'cursor-not-allowed bg-linha text-grafite-suave'
      : 'cursor-not-allowed bg-musgo text-papel opacity-60'
  }
  return 'bg-musgo text-papel hover:bg-musgo-vivo active:scale-[0.98]'
})
</script>

<template>
  <button
    :type="tipo"
    :disabled="disabled || carregando"
    :aria-busy="carregando ? 'true' : undefined"
    class="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-full px-space-5 text-body-strong transition-all duration-dur-fast"
    :class="estado"
  >
    <slot />
  </button>
</template>
