<script setup lang="ts">
import { PhCaretRight, PhGear, PhMagnifyingGlass, PhUserPlus, PhWarningCircle } from '@phosphor-icons/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AvatarLeitor from '../components/perfil/AvatarLeitor.vue'
import ChipPrivacidade from '../components/perfil/ChipPrivacidade.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import { contagem } from '../perfil/textos'
import { perfilService, type Perfil } from '../services/perfil'

/**
 * Meu perfil (RF-SOC-01, RF-SOC-04, RF-SOC-08), a partir de
 * docs/design/periodo-1/F-PERFIL/meu-perfil.md. Mobile: identidade centralizada e contadores numa
 * linha com divisor. Web: coluna de identidade de 300px com os contadores empilhados, e a linha
 * de solicitações no topo da coluna direita.
 *
 * **Sem estante, resenhas e o contador `livros lidos`** nesta entrega: vêm de `leitura`
 * (`listarEstantePerfil`, `listarResenhasPerfil`), ainda `planned`. Desenhar o vazio diria "você
 * não tem livros" a quem tem. As abas da coluna direita entram com F-EST e F-AVA.
 *
 * Sem sino na web, o perfil é o único lugar em que um pedido para seguir aparece (§1): a contagem
 * vem de uma página de um item da caixa, e falhar nela só esconde a linha.
 */
const perfil = ref<Perfil | null>(null)
const carregando = ref(true)
const falhou = ref(false)
const pedidosPendentes = ref(0)

async function carregar(): Promise<void> {
  carregando.value = true
  falhou.value = false
  try {
    perfil.value = await perfilService.obterMeuPerfil()
  } catch {
    falhou.value = true
  } finally {
    carregando.value = false
  }
}

async function contarPedidos(): Promise<void> {
  try {
    pedidosPendentes.value = (await perfilService.listarSolicitacoes(0, 1)).totalElements
  } catch {
    pedidosPendentes.value = 0
  }
}

onMounted(() => {
  void carregar()
  void contarPedidos()
})

const LINK_DE_CONTADOR =
  'flex min-h-12 flex-col-reverse items-center justify-center rounded-base transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:min-h-0 md:flex-row-reverse md:justify-end md:gap-space-3 md:py-space-3'
</script>

<template>
  <div class="pb-space-10 pt-space-6">
    <div
      v-if="carregando"
      class="flex flex-col items-center gap-space-3 md:w-[300px] md:items-start"
      aria-busy="true"
      aria-label="Carregando perfil"
    >
      <span class="size-24 rounded-full bg-capa-placeholder md:size-[120px]" />
      <span class="mt-space-1 h-8 w-[55%] rounded-sm bg-capa-placeholder" />
      <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
      <span class="h-[15px] w-[80%] rounded-sm bg-capa-placeholder" />
      <span class="mt-space-4 h-12 w-full rounded-base bg-capa-placeholder" />
    </div>

    <div
      v-else-if="falhou || !perfil"
      class="flex items-start gap-space-3 rounded-base bg-rubi-fundo p-space-4"
      role="alert"
    >
      <PhWarningCircle
        :size="20"
        weight="regular"
        class="mt-0.5 shrink-0 text-rubi"
        aria-hidden="true"
      />
      <div class="flex flex-col items-start gap-space-2">
        <p class="text-body text-tinta">
          Não foi possível carregar seu perfil. Verifique sua conexão e tente de novo.
        </p>
        <BotaoTextual @click="carregar">
          Tentar de novo
        </BotaoTextual>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col gap-space-6 md:grid md:grid-cols-[300px_minmax(0,720px)] md:gap-space-12"
    >
      <section
        class="flex flex-col items-center text-center md:items-start md:text-left"
        aria-label="Seu perfil"
      >
        <AvatarLeitor
          class="md:hidden"
          :url="perfil.avatarUrl"
          :tamanho="96"
        />
        <AvatarLeitor
          class="hidden md:flex"
          :url="perfil.avatarUrl"
          :tamanho="120"
        />
        <h2 class="mt-space-4 text-display text-tinta md:text-title-lg">
          {{ perfil.displayName }}
        </h2>
        <p class="mt-space-1 text-caption text-grafite-suave">
          @{{ perfil.username }}
        </p>
        <ChipPrivacidade
          class="mt-space-3"
          :privacidade="perfil.privacidade"
        />
        <p
          v-if="perfil.privacidade === 'privado'"
          class="mt-space-2 text-caption text-grafite"
        >
          Só quem você aceita vê sua estante e suas resenhas.
        </p>

        <!-- Texto de usuário: interpolação do Vue, com escape (RNF-SEC-14). -->
        <p
          v-if="perfil.biografia"
          class="mt-space-4 line-clamp-3 whitespace-pre-line text-body text-grafite"
        >
          {{ perfil.biografia }}
        </p>

        <RouterLink
          to="/perfil/editar"
          class="mt-space-5 flex h-12 w-full max-w-[240px] items-center justify-center rounded-base border border-linha text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10 md:max-w-none"
        >
          Editar perfil
        </RouterLink>

        <!-- Mobile: números numa linha com divisor (§4); web: empilhados (§5). Levam às listas. -->
        <nav
          class="mt-space-6 grid w-full grid-cols-2 divide-x divide-linha border-b border-linha pb-space-4 md:grid-cols-1 md:divide-x-0 md:divide-y md:border-b-0 md:pb-0"
          aria-label="Conexões"
        >
          <RouterLink
            to="/perfil/conexoes?aba=seguidores"
            :class="LINK_DE_CONTADOR"
            :aria-label="contagem(perfil.contadores.seguidores, 'seguidor', 'seguidores')"
          >
            <span class="text-caption text-grafite md:text-body">
              {{ perfil.contadores.seguidores === 1 ? 'seguidor' : 'seguidores' }}
            </span>
            <span class="font-mono text-num-inline tabular-nums text-tinta">
              {{ perfil.contadores.seguidores }}
            </span>
          </RouterLink>
          <RouterLink
            to="/perfil/conexoes?aba=seguidos"
            :class="LINK_DE_CONTADOR"
            :aria-label="`${perfil.contadores.seguidos} seguindo`"
          >
            <span class="text-caption text-grafite md:text-body">
              seguindo
            </span>
            <span class="font-mono text-num-inline tabular-nums text-tinta">
              {{ perfil.contadores.seguidos }}
            </span>
          </RouterLink>
        </nav>
      </section>

      <div>
        <!-- §4.3: sem badge vermelho nem ponto pulsando; o número está escrito com unidade. -->
        <RouterLink
          v-if="pedidosPendentes > 0"
          to="/perfil/solicitacoes"
          class="flex items-center gap-space-3 rounded-base bg-musgo-fundo p-space-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        >
          <PhUserPlus
            :size="20"
            weight="regular"
            class="shrink-0 text-musgo"
            aria-hidden="true"
          />
          <span class="flex-1 text-body text-tinta">
            {{ contagem(pedidosPendentes, 'solicitação', 'solicitações') }} para seguir você
          </span>
          <PhCaretRight
            :size="20"
            weight="regular"
            class="shrink-0 text-musgo"
            aria-hidden="true"
          />
        </RouterLink>
      </div>
    </div>
  </div>

  <Teleport
    to="#cabecalho-acoes"
    defer
  >
    <!-- Mobile: lupa e engrenagem (§4); web: dois botões secundários (§5). A lupa busca pessoas. -->
    <div class="-mr-space-3 flex items-center md:hidden">
      <RouterLink
        to="/perfil/buscar"
        class="flex size-12 items-center justify-center rounded-base text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
        aria-label="Buscar leitor"
      >
        <PhMagnifyingGlass
          :size="24"
          weight="regular"
          aria-hidden="true"
        />
      </RouterLink>
      <RouterLink
        to="/perfil/configuracoes"
        class="flex size-12 items-center justify-center rounded-base text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
        aria-label="Configurações"
      >
        <PhGear
          :size="24"
          weight="regular"
          aria-hidden="true"
        />
      </RouterLink>
    </div>
    <div class="hidden items-center gap-space-3 md:flex">
      <RouterLink
        to="/perfil/buscar"
        class="flex h-10 items-center gap-space-2 rounded-base border border-linha px-space-5 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
      >
        <PhMagnifyingGlass
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        Buscar leitor
      </RouterLink>
      <RouterLink
        to="/perfil/configuracoes"
        class="flex h-10 items-center gap-space-2 rounded-base border border-linha px-space-5 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
      >
        <PhGear
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        Configurações
      </RouterLink>
    </div>
  </Teleport>
</template>
