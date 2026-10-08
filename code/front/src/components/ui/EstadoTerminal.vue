<script setup lang="ts">
import { onMounted, ref, type Component } from 'vue'

/**
 * Estado terminal de tela inteira: ícone de 32px, título, texto e ações, no lugar do formulário
 * (confirmação neutra da recuperação, senha alterada, link que não vale mais). Sem ilustração,
 * sem confete: o acento é o ícone (redefinir-senha.md §4.5 e §7, recuperar-senha.md §4.4).
 *
 * O foco vai para o título ao montar, para o leitor de tela anunciar a troca e não deixar o foco
 * perdido no formulário que sumiu (redefinir-senha.md §9).
 */
withDefaults(
  defineProps<{
    icone: Component
    titulo: string
    /**
     * `ambar` para o link que não vale mais; `grafite` para a confirmação que não comemora nada
     * (exclusão solicitada, excluir-conta.md §4.8); `musgo` para o resto.
     */
    tom?: 'musgo' | 'ambar' | 'grafite'
    /**
     * A partir de 768px, ações à esquerda com a largura do conteúdo (protótipo de alterar senha,
     * "Senha alterada" na web). Sem ela, as ações ficam centralizadas como nas outras telas.
     */
    acoesAEsquerdaNaWeb?: boolean
  }>(),
  { tom: 'musgo', acoesAEsquerdaNaWeb: false },
)

const cabecalho = ref<HTMLHeadingElement | null>(null)

onMounted(() => {
  cabecalho.value?.focus()
})
</script>

<template>
  <section aria-live="polite">
    <component
      :is="icone"
      :size="32"
      weight="regular"
      :class="{ ambar: 'text-ambar', grafite: 'text-grafite', musgo: 'text-musgo' }[tom]"
      aria-hidden="true"
    />
    <h1
      ref="cabecalho"
      tabindex="-1"
      class="mt-space-5 text-title-lg text-tinta outline-none"
    >
      {{ titulo }}
    </h1>
    <div class="mt-space-4 flex flex-col gap-space-4 text-body text-grafite">
      <slot />
    </div>
    <div
      class="mt-space-8 flex flex-col items-center gap-space-4"
      :class="acoesAEsquerdaNaWeb ? 'md:items-start' : ''"
    >
      <slot name="acoes" />
    </div>
  </section>
</template>
