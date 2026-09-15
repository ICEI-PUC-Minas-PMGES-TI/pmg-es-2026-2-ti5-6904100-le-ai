<script setup lang="ts">
/**
 * Cabeçalho de 72px que toda tela autenticada herda (shell-de-navegacao.md §4 "Padrão de
 * header" e §5 "Área de conteúdo"). Sem sino na web: notificações estão fora do escopo do
 * cliente web (REQUISITOS.md §2.1) — o sino é só do app Flutter (Etapa 13).
 *
 * Simplificação assumida: o divisor inferior do header, que no protótipo só aparece quando o
 * conteúdo rola por baixo, sai fixo aqui (sem rastrear scroll). Ganho pequeno para o custo de
 * mais uma peça de estado; revisar se algum dia incomodar visualmente.
 */
defineProps<{
  titulo: string
}>()
</script>

<template>
  <header class="flex h-[72px] shrink-0 items-center border-b border-linha px-space-5 md:px-space-8">
    <h1 class="text-display text-tinta">
      {{ titulo }}
    </h1>
  </header>
</template>
