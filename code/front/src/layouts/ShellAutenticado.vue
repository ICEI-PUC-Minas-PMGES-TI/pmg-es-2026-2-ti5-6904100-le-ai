<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { rotuloVoltarDaTela } from '../cabecalho'
import CabecalhoTela from '../components/CabecalhoTela.vue'
import SidebarNavegacao from '../components/SidebarNavegacao.vue'
import { ABAS, abaAtiva } from '../router/abas'

/**
 * Quadro de toda tela autenticada (shell-de-navegacao.md). Sidebar retrátil a partir de 768px
 * (`SidebarNavegacao`); abaixo disso os mesmos quatro itens viram barra inferior fixa, aqui
 * mesmo — ela não ganhou componente próprio porque não tem estado (sem expandir/retrair, sem
 * tooltip): é só os itens na horizontal, e duplicar um componente por causa de um `<nav>`
 * diferente seria mais peça do que o layout pede.
 *
 * Sem menu hamburguer em size nenhum (§10): acima de 768px é sidebar, abaixo é barra inferior.
 */

const route = useRoute()
const titulo = computed(() => (typeof route.meta.titulo === 'string' ? route.meta.titulo : ''))
const ativa = computed(() => abaAtiva(route))
// Tela de detalhe (meta.voltar) ganha a seta; sem histórico, ela leva à aba de origem ou ao destino
// que a rota declarar (o editor de resenha volta à página do livro).
const voltarPara = computed(() =>
  route.meta.voltar ? (route.meta.voltarPara?.(route) ?? ativa.value ?? '/estante') : null,
)
const semBarraInferior = computed(() => route.meta.semBarraInferior === true)
// A tela pode trocar o rótulo pelo que só ela sabe (`Listas de Rafael`, F-LST).
const rotuloDaTela = rotuloVoltarDaTela()
const rotuloVoltar = computed(() => rotuloDaTela.value ?? route.meta.voltarComRotulo ?? null)

function itemAtivo(rota: string): boolean {
  return ativa.value === rota
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-papel">
    <SidebarNavegacao />

    <div class="relative flex min-w-0 flex-1 flex-col">
      <CabecalhoTela
        :titulo="titulo"
        :titulo-curto="route.meta.tituloCurto ?? null"
        :voltar-para="voltarPara"
        :fechar="route.meta.fechar === true"
        :rotulo-voltar="rotuloVoltar"
        :sem-divisor="route.meta.semDivisor === true"
      />
      <main
        class="flex-1 overflow-y-auto px-space-5 md:px-space-8 md:pb-0"
        :class="semBarraInferior ? '' : 'pb-[calc(64px+env(safe-area-inset-bottom))]'"
      >
        <RouterView />
      </main>
      <!-- Avisos flutuantes (`ui/AvisoFlutuante`) entram aqui por Teleport: no rodapé acima da
           barra inferior no mobile e no canto inferior esquerdo da área de conteúdo na web, com a
           sidebar expandida ou retraída (lista.md §4.4 e §5). -->
      <div
        id="avisos-flutuantes"
        class="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-space-3 px-space-4 md:px-space-8"
        :class="semBarraInferior ? 'pb-space-4 md:pb-space-6' : 'pb-[calc(64px+env(safe-area-inset-bottom)+16px)] md:pb-space-6'"
      />
    </div>

    <nav
      v-if="!semBarraInferior"
      class="fixed inset-x-0 bottom-0 z-10 flex h-16 border-t border-linha bg-papel-elevado pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navegação principal"
    >
      <RouterLink
        v-for="item in ABAS"
        :key="item.rota"
        :to="item.rota"
        class="flex flex-1 flex-col items-center justify-center gap-space-1"
      >
        <component
          :is="item.icone"
          :size="24"
          :weight="itemAtivo(item.rota) ? 'fill' : 'regular'"
          :class="itemAtivo(item.rota) ? 'text-musgo' : 'text-grafite'"
          aria-hidden="true"
        />
        <span
          class="text-caption"
          :class="itemAtivo(item.rota) ? 'font-semibold text-musgo' : 'text-grafite'"
        >{{ item.rotulo }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
