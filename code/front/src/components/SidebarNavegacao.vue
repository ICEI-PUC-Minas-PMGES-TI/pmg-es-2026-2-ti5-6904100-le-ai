<script setup lang="ts">
import { PhShieldCheck, PhSidebarSimple } from '@phosphor-icons/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { ABAS, abaAtiva } from '../router/abas'
import { useSession } from '../session'
import LogoLeAi from './ui/LogoLeAi.vue'

/**
 * Sidebar retrátil da web (shell-de-navegacao.md §5) — só aparece a partir de 768px; abaixo
 * disso a navegação vira a barra inferior embutida em `ShellAutenticado.vue`. Fica de fora do
 * fluxo `position: fixed`: é um irmão flex do conteúdo, então a largura muda e o conteúdo
 * reflui sozinho, sem `margin` calculado à mão.
 */

const route = useRoute()
const colapsada = ref(false)

/**
 * "Nasce retraída" entre 768 e 1024px (§5.4) — checado uma vez na montagem, não reativo a
 * redimensionar a janela depois: a sidebar não deve se mover sozinha (§4 "Animação... acontece
 * uma vez por acionamento").
 */
onMounted(() => {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    colapsada.value = window.matchMedia('(min-width: 768px) and (max-width: 1023.98px)').matches
  }
})

function alternar(): void {
  colapsada.value = !colapsada.value
}

const ativa = computed(() => abaAtiva(route))

function itemAtivo(rota: string): boolean {
  return ativa.value === rota
}

/**
 * F-MOD: o quinto item, `Moderação`, só para a conta de administrador, depois de um divisor
 * (painel-de-moderacao.md §5). É exceção por papel às quatro áreas do shell; quem protege o painel
 * é o servidor.
 */
const { ehAdmin } = useSession()
const moderacaoAtiva = computed(() => route.path === '/moderacao' || route.path.startsWith('/moderacao/'))
</script>

<template>
  <nav
    class="hidden h-full shrink-0 flex-col border-r border-linha bg-papel-elevado transition-[width] duration-dur-base ease-in-out motion-reduce:transition-none md:flex"
    :class="colapsada ? 'w-[72px]' : 'w-[248px]'"
    aria-label="Navegação principal"
  >
    <div class="flex h-[72px] shrink-0 items-center px-space-5">
      <LogoLeAi
        v-if="!colapsada"
        :altura="24"
      />
      <button
        type="button"
        class="flex size-space-8 shrink-0 items-center justify-center rounded-base text-grafite transition-colors duration-dur-fast hover:text-tinta"
        :class="colapsada ? 'mx-auto' : 'ml-auto'"
        :aria-label="colapsada ? 'Expandir menu' : 'Retrair menu'"
        :aria-expanded="!colapsada"
        @click="alternar"
      >
        <PhSidebarSimple
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
      </button>
    </div>

    <div class="mt-space-4 flex flex-col gap-space-1 px-space-3">
      <RouterLink
        v-for="item in ABAS"
        :key="item.rota"
        :to="item.rota"
        class="group relative flex h-11 items-center rounded-base transition-colors duration-dur-fast"
        :class="[
          colapsada ? 'justify-center' : 'gap-space-3 px-space-4',
          itemAtivo(item.rota) ? 'bg-musgo-fundo' : 'hover:bg-linha',
        ]"
      >
        <component
          :is="item.icone"
          :size="20"
          :weight="itemAtivo(item.rota) ? 'fill' : 'regular'"
          :class="itemAtivo(item.rota) ? 'text-musgo' : 'text-grafite'"
          aria-hidden="true"
        />
        <span
          v-if="!colapsada"
          class="text-body-strong"
          :class="itemAtivo(item.rota) ? 'text-musgo' : 'text-grafite'"
        >{{ item.rotulo }}</span>
        <!-- Colapsada: o rótulo vira tooltip ao hover (§5.2). opacity-0 não some da árvore de
             acessibilidade, então continua sendo o nome acessível do link mesmo sem o hover. -->
        <span
          v-else
          class="pointer-events-none absolute left-full z-10 ml-space-2 whitespace-nowrap rounded-sm bg-papel-elevado px-space-3 py-space-2 text-caption text-tinta opacity-0 shadow-2 transition-opacity duration-dur-fast group-hover:opacity-100"
        >{{ item.rotulo }}</span>
      </RouterLink>

      <template v-if="ehAdmin">
        <div
          class="mx-space-4 my-space-3 h-px bg-linha"
          aria-hidden="true"
        />
        <RouterLink
          to="/moderacao"
          class="group relative flex h-11 items-center rounded-base transition-colors duration-dur-fast"
          :class="[
            colapsada ? 'justify-center' : 'gap-space-3 px-space-4',
            moderacaoAtiva ? 'bg-musgo-fundo' : 'hover:bg-linha',
          ]"
        >
          <PhShieldCheck
            :size="20"
            :weight="moderacaoAtiva ? 'fill' : 'regular'"
            :class="moderacaoAtiva ? 'text-musgo' : 'text-grafite'"
            aria-hidden="true"
          />
          <span
            v-if="!colapsada"
            class="text-body-strong"
            :class="moderacaoAtiva ? 'text-musgo' : 'text-grafite'"
          >Moderação</span>
          <span
            v-else
            class="pointer-events-none absolute left-full z-10 ml-space-2 whitespace-nowrap rounded-sm bg-papel-elevado px-space-3 py-space-2 text-caption text-tinta opacity-0 shadow-2 transition-opacity duration-dur-fast group-hover:opacity-100"
          >Moderação</span>
        </RouterLink>
      </template>
    </div>
  </nav>
</template>
