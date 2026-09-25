<script setup lang="ts">
import { PhAt, PhCaretRight, PhX } from '@phosphor-icons/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import AvatarLeitor from '../components/perfil/AvatarLeitor.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import EstadoVazio from '../components/ui/EstadoVazio.vue'
import { ApiError } from '../services/api'
import { perfilService, type PerfilResumo } from '../services/perfil'

/**
 * Buscar leitor (RF-SOC-03), a partir de docs/design/periodo-1/F-PERFIL/buscar-leitor.md. Zero
 * ou um resultado, só por username inteiro (RNF-SEC-19/44). A busca sai no envio, não a cada
 * tecla: digitar não é consulta, e o servidor limita a 30 buscas por minuto.
 *
 * - **O campo fica abaixo do header**, nas duas larguras, como o protótipo prevê abaixo de
 *   768px. O header é o do shell, com título e seta.
 * - **Sem biografia no card**: a busca devolve `PerfilResumo`, que não tem biografia.
 * - **Sem o estado de consulta parcial**: saber que `rafa` é parte de um nome exigiria o
 *   servidor dizer que existem nomes começando assim, que é a enumeração proibida. O vazio é um
 *   só, e a frase é sobre a busca, nunca sobre a existência da conta.
 */
const FORMATO = /^[A-Za-z0-9._]{3,30}$/

type Estado = 'aterrissagem' | 'buscando' | 'encontrado' | 'vazio' | 'erro'

const consulta = ref('')
const estado = ref<Estado>('aterrissagem')
const resultado = ref<PerfilResumo | null>(null)
const erroDeFormato = ref<string | null>(null)
const mensagemDeErro = ref('Não foi possível buscar agora. Verifique sua conexão e tente de novo.')
const coldStart = ref(false)
let buscaAtual = 0

async function buscar(): Promise<void> {
  const username = consulta.value.trim().replace(/^@/, '')
  if (username === '') {
    return
  }
  if (!FORMATO.test(username)) {
    erroDeFormato.value = 'Digite o nome de usuário completo: de 3 a 30 letras, números, ponto ou traço baixo.'
    return
  }
  erroDeFormato.value = null
  const minha = ++buscaAtual
  estado.value = 'buscando'
  coldStart.value = false
  const timer = setTimeout(() => {
    coldStart.value = true
  }, 3_000)
  try {
    const encontrados = await perfilService.buscarPorUsername(username)
    if (minha !== buscaAtual) {
      return
    }
    resultado.value = encontrados[0] ?? null
    estado.value = resultado.value ? 'encontrado' : 'vazio'
  } catch (erro) {
    if (minha !== buscaAtual) {
      return
    }
    // 429 é o limite de buscas: a frase do servidor diz o que fazer.
    mensagemDeErro.value =
      erro instanceof ApiError && erro.status === 429
        ? erro.message
        : 'Não foi possível buscar agora. Verifique sua conexão e tente de novo.'
    estado.value = 'erro'
  } finally {
    clearTimeout(timer)
    coldStart.value = false
  }
}

function limpar(): void {
  buscaAtual++
  consulta.value = ''
  erroDeFormato.value = null
  resultado.value = null
  estado.value = 'aterrissagem'
}
</script>

<template>
  <div class="max-w-[560px] pb-space-10 pt-space-6">
    <form
      role="search"
      novalidate
      @submit.prevent="buscar"
    >
      <div
        class="flex h-12 items-center gap-space-3 rounded-base bg-papel-elevado px-space-4 transition-colors duration-dur-fast md:h-11"
        :class="erroDeFormato ? 'border-[1.5px] border-rubi' : 'border border-linha focus-within:border-[1.5px] focus-within:border-musgo'"
      >
        <PhAt
          :size="20"
          weight="regular"
          class="shrink-0 text-grafite-suave"
          aria-hidden="true"
        />
        <input
          v-model="consulta"
          type="search"
          enterkeyhint="search"
          autocapitalize="off"
          autocomplete="off"
          spellcheck="false"
          placeholder="Nome de usuário exato"
          aria-label="Nome de usuário exato"
          :aria-invalid="erroDeFormato ? 'true' : undefined"
          :aria-describedby="erroDeFormato ? 'erro-busca' : undefined"
          :disabled="estado === 'buscando'"
          class="min-w-0 flex-1 bg-transparent text-body text-tinta outline-none placeholder:text-grafite-suave [&::-webkit-search-cancel-button]:hidden"
        >
        <button
          v-if="consulta"
          type="button"
          class="-mr-space-3 flex size-12 shrink-0 items-center justify-center rounded-base text-grafite focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo md:size-10"
          aria-label="Limpar"
          @click="limpar"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>
      <p
        v-if="erroDeFormato"
        id="erro-busca"
        class="mt-space-2 text-caption text-rubi"
      >
        {{ erroDeFormato }}
      </p>
    </form>

    <div
      class="mt-space-6"
      aria-live="polite"
    >
      <EstadoVazio
        v-if="estado === 'aterrissagem'"
        :icone="PhAt"
        titulo="Busque pelo nome de usuário"
        class="mx-auto mt-space-4 max-w-[300px] md:mt-space-10"
      >
        <p class="mt-space-3 text-body text-grafite">
          A busca por pessoas é exata: digite o nome de usuário inteiro, sem o arroba. Não existe lista de leitores para explorar.
        </p>
      </EstadoVazio>

      <template v-else-if="estado === 'buscando'">
        <div
          class="flex h-[72px] items-center gap-space-4 rounded-base bg-capa-placeholder/50 p-space-4"
          aria-busy="true"
          aria-label="Buscando"
        >
          <span class="size-12 rounded-full bg-capa-placeholder" />
          <span class="flex flex-1 flex-col gap-space-2">
            <span class="h-[17px] w-[45%] rounded-sm bg-capa-placeholder" />
            <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
          </span>
        </div>
        <p
          v-if="coldStart"
          class="mt-space-4 text-caption text-grafite"
          role="status"
        >
          O servidor está iniciando. Isso pode levar alguns segundos.
        </p>
      </template>

      <RouterLink
        v-else-if="estado === 'encontrado' && resultado"
        :to="`/leitores/${resultado.username}`"
        class="group flex items-center gap-space-4 rounded-base bg-papel-elevado p-space-4 shadow-1 transition-shadow duration-dur-fast hover:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        :aria-label="`${resultado.displayName}, arroba ${resultado.username}`"
      >
        <AvatarLeitor
          :url="resultado.avatarUrl"
          :tamanho="48"
        />
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-title-sm text-tinta transition-colors duration-dur-fast group-hover:text-musgo">{{ resultado.displayName }}</span>
          <span class="truncate text-caption text-grafite-suave">@{{ resultado.username }}</span>
        </span>
        <PhCaretRight
          :size="20"
          weight="regular"
          class="shrink-0 text-grafite-suave"
          aria-hidden="true"
        />
      </RouterLink>

      <EstadoVazio
        v-else-if="estado === 'vazio'"
        :icone="PhAt"
        titulo="Nenhum leitor com esse nome de usuário"
        class="mx-auto mt-space-4 max-w-[300px]"
      >
        <p class="mt-space-3 text-body text-grafite">
          Confira a grafia. A busca precisa do nome de usuário inteiro e exato.
        </p>
      </EstadoVazio>

      <BannerAviso
        v-else-if="estado === 'erro'"
        variante="erro"
      >
        {{ mensagemDeErro }}
        <BotaoTextual
          class="mt-space-2"
          @click="buscar"
        >
          Tentar de novo
        </BotaoTextual>
      </BannerAviso>
    </div>
  </div>
</template>
