<script setup lang="ts">
/**
 * Desenho do `switch` (preferencias-de-notificacao.md do Período 3, reaproveitado em
 * configuracoes.md): trilho de 52 x 32px. Ligado, trilho `musgo` e botão de 24px em `papel`;
 * desligado, trilho `papel-elevado` com contorno de 2px `grafite-suave` e botão de 16px encostado à
 * esquerda. Só o desenho: quem tem `role="switch"` e `aria-checked` é a linha inteira, que é a
 * área clicável, por isso o trilho fica fora da árvore de acessibilidade. Mesmas medidas do
 * `LinhaDeInterruptor` do app.
 */
defineProps<{ ligado: boolean }>()
</script>

<template>
  <span
    class="relative inline-block h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors duration-dur-fast"
    :class="ligado ? 'border-musgo bg-musgo' : 'border-grafite-suave bg-papel-elevado'"
    aria-hidden="true"
  >
    <span
      class="absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-dur-fast"
      :class="ligado ? 'left-[22px] size-6 bg-papel' : 'left-[6px] size-4 bg-grafite-suave'"
    />
  </span>
</template>
