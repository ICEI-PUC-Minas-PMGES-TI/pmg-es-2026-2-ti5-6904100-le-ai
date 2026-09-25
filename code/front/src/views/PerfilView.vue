<script setup lang="ts">
import { PhGear, PhGlobe, PhLock, PhWarningCircle } from '@phosphor-icons/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AvatarLeitor from '../components/perfil/AvatarLeitor.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import { perfilService, type Perfil } from '../services/perfil'

/**
 * Meu perfil (RF-SOC-01, RF-SOC-04), a partir de docs/design/periodo-1/F-PERFIL/meu-perfil.md.
 * Mobile: bloco de identidade centralizado e os contadores numa linha com divisor. Web: coluna
 * de identidade de 300px, com os contadores empilhados.
 *
 * **Sem estante, resenhas e o contador `livros lidos`** nesta entrega: vêm de `leitura`
 * (`listarEstantePerfil`, `listarResenhasPerfil`), ainda `planned`. Desenhar o vazio diria "você
 * não tem livros" a quem tem. A coluna direita da web e as duas seções entram com F-EST e F-AVA.
 * Busca de leitor, listas e solicitações chegam na etapa seguinte de F-PERFIL.
 */
const perfil = ref<Perfil | null>(null)
const carregando = ref(true)
const falhou = ref(false)

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

onMounted(carregar)

function contagem(valor: number, singular: string, plural: string): string {
  return `${valor} ${valor === 1 ? singular : plural}`
}
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

    <section
      v-else
      class="flex flex-col items-center text-center md:w-[300px] md:items-start md:text-left"
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

      <p
        v-if="perfil.privacidade === 'publico'"
        class="mt-space-3 inline-flex items-center gap-space-1 rounded-full bg-musgo-fundo px-space-3 py-space-1 text-caption font-semibold text-musgo"
      >
        <PhGlobe
          :size="16"
          weight="regular"
          aria-hidden="true"
        />
        Perfil público
      </p>
      <template v-else>
        <p class="mt-space-3 inline-flex items-center gap-space-1 rounded-full border border-linha bg-papel-elevado px-space-3 py-space-1 text-caption font-semibold text-grafite">
          <PhLock
            :size="16"
            weight="regular"
            aria-hidden="true"
          />
          Perfil privado
        </p>
        <p class="mt-space-2 text-caption text-grafite">
          Só quem você aceita vê sua estante e suas resenhas.
        </p>
      </template>

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

      <!-- Mobile: três números numa linha com divisor (§4); web: empilhados (§5). Aqui, dois. -->
      <dl class="mt-space-6 grid w-full grid-cols-2 divide-x divide-linha border-b border-linha pb-space-4 md:mt-space-6 md:grid-cols-1 md:divide-x-0 md:divide-y md:border-b-0 md:pb-0">
        <div
          class="flex flex-col-reverse items-center md:flex-row-reverse md:justify-end md:gap-space-3 md:py-space-3"
          :aria-label="contagem(perfil.contadores.seguidores, 'seguidor', 'seguidores')"
        >
          <dt class="text-caption text-grafite md:text-body">
            {{ perfil.contadores.seguidores === 1 ? 'seguidor' : 'seguidores' }}
          </dt>
          <dd class="font-mono text-num-inline tabular-nums text-tinta">
            {{ perfil.contadores.seguidores }}
          </dd>
        </div>
        <div
          class="flex flex-col-reverse items-center md:flex-row-reverse md:justify-end md:gap-space-3 md:py-space-3"
          :aria-label="`${perfil.contadores.seguidos} seguindo`"
        >
          <dt class="text-caption text-grafite md:text-body">
            seguindo
          </dt>
          <dd class="font-mono text-num-inline tabular-nums text-tinta">
            {{ perfil.contadores.seguidos }}
          </dd>
        </div>
      </dl>
    </section>
  </div>

  <Teleport
    to="#cabecalho-acoes"
    defer
  >
    <RouterLink
      to="/perfil/configuracoes"
      class="-mr-space-3 flex size-12 items-center justify-center rounded-base text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo md:hidden"
      aria-label="Configurações"
    >
      <PhGear
        :size="24"
        weight="regular"
        aria-hidden="true"
      />
    </RouterLink>
    <RouterLink
      to="/perfil/configuracoes"
      class="hidden h-10 items-center gap-space-2 rounded-base border border-linha px-space-5 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:flex"
    >
      <PhGear
        :size="20"
        weight="regular"
        aria-hidden="true"
      />
      Configurações
    </RouterLink>
  </Teleport>
</template>
