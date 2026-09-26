<!--
  Esqueleto da identidade de um leitor numa lista, como nos protótipos de carregando de
  seguidores-e-seguidos e solicitacoes-de-seguir: círculo do avatar e três barras (nome,
  @username e biografia). O placeholder da ação fica com quem usa, porque muda por tela.
-->
<template>
  <span
    class="flex min-w-0 flex-1 items-center gap-space-4"
    aria-hidden="true"
  >
    <span class="size-12 shrink-0 rounded-full bg-capa-placeholder" />
    <span class="flex flex-1 flex-col gap-space-2">
      <span class="h-[17px] w-[40%] rounded-sm bg-capa-placeholder" />
      <span class="h-[13px] w-[25%] rounded-sm bg-capa-placeholder" />
      <span class="h-[13px] w-[65%] rounded-sm bg-capa-placeholder" />
    </span>
  </span>
</template>
