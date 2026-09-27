<script setup lang="ts">
import { PhWarning, PhWarningCircle } from '@phosphor-icons/vue'
import { computed } from 'vue'

/**
 * Duas variantes, nunca confundidas (login.md §4.2/§4.3 e §10): `erro` é `rubi` — o usuário
 * mandou algo inválido. `alerta` é `ambar` — bloqueio temporário, o usuário não errou nada.
 * Ícone e texto juntos: a diferença não pode depender só de cor (§9 acessibilidade). `triangulo`
 * põe o `Warning` também no erro, como os banners de falha de carregamento dos protótipos de
 * F-PERFIL.
 */
const props = defineProps<{
  variante: 'erro' | 'alerta'
  triangulo?: boolean
}>()

const Icone = computed(() => (props.variante === 'erro' && !props.triangulo ? PhWarningCircle : PhWarning))
</script>

<template>
  <div
    class="flex items-start gap-space-3 rounded-base p-space-4"
    :class="variante === 'erro' ? 'bg-rubi-fundo' : 'bg-ambar-fundo'"
    role="alert"
  >
    <component
      :is="Icone"
      :size="20"
      weight="regular"
      class="mt-0.5 shrink-0"
      :class="variante === 'erro' ? 'text-rubi' : 'text-ambar'"
      aria-hidden="true"
    />
    <p class="text-body text-tinta">
      <slot />
    </p>
  </div>
</template>
