<script setup lang="ts">
import ilustracaoClara from '../assets/ilustracoes/leitora-clara.svg'
import ilustracaoEscura from '../assets/ilustracoes/leitora-escura.svg'
import LogoLeAi from '../components/ui/LogoLeAi.vue'

/**
 * Quadro das telas de autenticação (entrar, criar conta, recuperar e redefinir senha): as quatro
 * são a mesma família e precisam ser reconhecíveis como tal (recuperar-senha.md §5). Coluna da
 * marca à esquerda só na web, que desaparece (não empilha) abaixo de 768px; à direita, a coluna
 * de no máximo 420px com o conteúdo da tela, que decide o próprio topo no mobile (logo ou seta).
 *
 * `ilustrada` é a coluna dos protótipos de F-AUT para login e cadastro (frase editorial com os
 * dois acentos, linha de apoio e a leitora do unDraw sobre um círculo `musgo-fundo`), que é o
 * desenho aprovado (docs/design/AGENTS.md §10). Recuperar e redefinir senha usam a frase curta
 * em Space Grotesk e a mesma leitora abaixo dela, mas sem o círculo, como nos protótipos delas.
 */
withDefaults(defineProps<{ ilustrada?: boolean; somenteMarca?: boolean }>(), {
  ilustrada: false,
  somenteMarca: false,
})
</script>

<template>
  <div class="flex min-h-screen w-full bg-papel">
    <!-- Telas de estado da conta (F-CONTA-2): só o lockup, sem a frase de boas-vindas, que soaria
         fora de lugar numa tela sobre excluir a conta (recuperar-conta.md §5). -->
    <div
      v-if="somenteMarca"
      class="hidden w-[44%] flex-col justify-center bg-papel-elevado px-space-16 md:flex"
    >
      <LogoLeAi :altura="32" />
    </div>
    <div
      v-else-if="ilustrada"
      class="hidden w-[44%] flex-col justify-center gap-space-6 bg-papel-elevado px-space-16 md:flex"
    >
      <LogoLeAi :altura="29" />
      <div class="max-w-[440px]">
        <p class="font-editorial text-[28px] font-semibold leading-[34px] text-tinta">
          Sua estante digital,<br>
          seu <span class="text-musgo">progresso</span> de leitura,<br>
          sua <span class="text-musgo">comunidade leitora</span>.
        </p>
        <p class="mt-space-3 font-editorial text-[18px] leading-[26px] text-grafite">
          Descubra livros, acompanhe suas leituras e conecte-se com leitores como você.
        </p>
      </div>
      <div class="grid place-items-center">
        <span
          aria-hidden="true"
          class="col-start-1 row-start-1 size-[250px] rounded-full bg-musgo-fundo opacity-55"
        />
        <img
          :src="ilustracaoClara"
          alt=""
          class="relative col-start-1 row-start-1 h-auto w-full max-w-[320px] dark:hidden"
        >
        <img
          :src="ilustracaoEscura"
          alt=""
          class="relative col-start-1 row-start-1 hidden h-auto w-full max-w-[320px] dark:block"
        >
      </div>
    </div>
    <div
      v-else
      class="hidden w-[44%] flex-col justify-center bg-papel-elevado px-space-16 md:flex"
    >
      <LogoLeAi :altura="32" />
      <p class="mt-space-6 max-w-[420px] text-pretty text-title-lg text-tinta">
        Registre suas leituras e acompanhe as de quem você segue.
      </p>
      <p class="mt-space-4 text-body text-grafite">
        Estante, progresso, resenhas e feed em um lugar só.
      </p>
      <img
        :src="ilustracaoClara"
        alt=""
        class="mt-space-12 h-auto w-[320px] max-w-full dark:hidden"
      >
      <img
        :src="ilustracaoEscura"
        alt=""
        class="mt-space-12 hidden h-auto w-[320px] max-w-full dark:block"
      >
    </div>

    <div class="flex w-full flex-col items-center px-space-5 py-space-10 md:w-[56%] md:justify-center">
      <div class="w-full max-w-[420px]">
        <!-- Selo da marca acima do título, só na web e só na variante ilustrada (protótipos de
             login e cadastro: 56px, `musgo-fundo`, símbolo de 26px). -->
        <div
          v-if="ilustrada"
          aria-hidden="true"
          class="mb-space-5 hidden size-14 items-center justify-center rounded-full bg-musgo-fundo md:flex"
        >
          <LogoLeAi
            :altura="26"
            somente-simbolo
          />
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>
