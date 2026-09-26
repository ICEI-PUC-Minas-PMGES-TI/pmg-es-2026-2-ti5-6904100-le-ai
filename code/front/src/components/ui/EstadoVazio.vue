<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Estado vazio com desenho intencional (documento-de-design §8): título e texto centralizados. O
 * ícone é decorativo; quem carrega o significado é o título.
 *
 * Três formas, conforme o protótipo de cada tela:
 * - padrão: ícone em círculo de 72px (telas de livros de F-ACV-CADASTRO);
 * - `solto`: ícone de 32px sem círculo, como nos protótipos de F-PERFIL;
 * - `ilustracao`: imagem no lugar do ícone (a arte de "nenhum leitor encontrado" da busca), com a
 *   largura que o protótipo dá.
 * Centralizar na vertical é de quem usa, porque depende da área útil de cada tela.
 */
withDefaults(
  defineProps<{
    icone?: Component
    titulo: string
    solto?: boolean
    ilustracao?: string
    /** Largura da ilustração em pixels de CSS. */
    larguraDaIlustracao?: number
  }>(),
  { icone: undefined, solto: false, ilustracao: undefined, larguraDaIlustracao: 160 },
)
</script>

<template>
  <div class="flex flex-col items-center text-center">
    <img
      v-if="ilustracao"
      :src="ilustracao"
      alt=""
      class="h-auto max-w-full"
      :style="{ width: `${larguraDaIlustracao}px` }"
    >
    <component
      :is="icone"
      v-else-if="icone && solto"
      :size="32"
      weight="regular"
      class="text-grafite-suave"
      aria-hidden="true"
    />
    <div
      v-else-if="icone"
      class="flex size-[72px] items-center justify-center rounded-full bg-papel-elevado"
    >
      <component
        :is="icone"
        :size="32"
        weight="regular"
        class="text-grafite-suave"
        aria-hidden="true"
      />
    </div>
    <h2
      class="text-title text-tinta"
      :class="solto || ilustracao ? 'mt-space-5' : 'mt-space-6'"
    >
      {{ titulo }}
    </h2>
    <slot />
  </div>
</template>
