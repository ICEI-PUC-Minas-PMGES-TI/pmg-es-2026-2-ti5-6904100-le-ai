<script setup lang="ts">
import LogoLeAi from '../components/ui/LogoLeAi.vue'

/**
 * Quadro das telas de autenticação (entrar, criar conta, recuperar e redefinir senha): as quatro
 * são a mesma família e precisam ser reconhecíveis como tal (recuperar-senha.md §5). Coluna da
 * marca à esquerda só na web, que desaparece (não empilha) abaixo de 768px; à direita, a coluna
 * de no máximo 420px com o conteúdo da tela, que decide o próprio topo no mobile (logo ou seta).
 */
</script>

<template>
  <div class="flex min-h-screen w-full bg-papel">
    <div class="hidden w-[44%] flex-col justify-center bg-papel-elevado px-space-16 md:flex">
      <LogoLeAi :altura="32" />
      <p class="mt-space-6 text-title-lg text-tinta">
        Registre suas leituras e acompanhe as de quem você segue.
      </p>
      <p class="mt-space-4 text-body text-grafite">
        Estante, progresso, resenhas e feed em um lugar só.
      </p>
    </div>

    <div class="flex w-full flex-col items-center px-space-5 py-space-10 md:w-[56%] md:justify-center">
      <div class="w-full max-w-[420px]">
        <slot />
      </div>
    </div>
  </div>
</template>
