<script setup lang="ts">
import { PhAt, PhCaretRight, PhX } from '@phosphor-icons/vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import leitorEncontrado from '../../assets/ilustracoes/leitor-encontrado.svg'
import leitorEncontradoEscura from '../../assets/ilustracoes/leitor-encontrado-escura.svg'
import nenhumLeitor from '../../assets/ilustracoes/nenhum-leitor.svg'
import AvatarLeitor from '../../components/perfil/AvatarLeitor.vue'
import ChipPrivacidade from '../../components/perfil/ChipPrivacidade.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import { ApiError } from '../../services/api'
import { perfilService, type PerfilResumo } from '../../services/perfil'

/**
 * Buscar leitor (RF-SOC-03), a partir do protótipo buscar-leitor. Zero ou um resultado, só por
 * username inteiro (RNF-SEC-19/44). A busca sai no envio, não a cada tecla: digitar não é
 * consulta, e o servidor limita a 30 buscas por minuto.
 *
 * - **O campo vai para a linha do título a partir de 768px** (Teleport para `#cabecalho-acoes`),
 *   como no protótipo web; abaixo disso fica no topo do conteúdo, sob a barra do shell.
 * - **Card de resultado** com chip de privacidade e biografia em duas linhas, e a ilustração de
 *   leitor logo abaixo; "nenhum leitor" troca o ícone pela arte do cachorro.
 * - **Sem o estado de consulta parcial**: saber que `rafa` é parte de um nome exigiria o
 *   servidor dizer que existem nomes começando assim, que é a enumeração proibida. O vazio é um
 *   só, e a frase é sobre a busca, nunca sobre a existência da conta.
 */
const FORMATO = /^[A-Za-z0-9._]{3,30}$/

const consultaLarga =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(min-width: 768px)')
    : null
const largo = ref(consultaLarga?.matches === true)
function acompanharLargura(evento: MediaQueryListEvent): void {
  largo.value = evento.matches
}
onMounted(() => consultaLarga?.addEventListener?.('change', acompanharLargura))
onBeforeUnmount(() => consultaLarga?.removeEventListener?.('change', acompanharLargura))

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
  <div class="mx-auto max-w-[560px] pb-space-10 pt-space-6 md:pt-space-16">
    <Teleport
      to="#cabecalho-acoes"
      defer
      :disabled="!largo"
    >
      <form
        role="search"
        novalidate
        :class="largo ? 'w-[360px] max-w-full' : ''"
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
            class="min-w-0 flex-1 bg-transparent text-body text-tinta outline-none placeholder:text-grafite-suave disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden"
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
    </Teleport>

    <div
      class="mt-space-6 md:mt-0"
      aria-live="polite"
    >
      <EstadoVazio
        v-if="estado === 'aterrissagem'"
        :icone="PhAt"
        solto
        titulo="Busque pelo nome de usuário"
        class="mx-auto mt-space-10 max-w-[300px] md:mt-0"
      >
        <p class="mt-space-3 text-body text-grafite">
          A busca por pessoas é exata: digite o nome de usuário inteiro, sem o arroba. Não existe lista de leitores para explorar.
        </p>
      </EstadoVazio>

      <template v-else-if="estado === 'buscando'">
        <div
          class="flex h-[72px] items-center gap-space-4 rounded-base bg-capa-placeholder p-space-4"
          aria-busy="true"
          aria-label="Buscando"
        >
          <span class="size-12 shrink-0 rounded-full bg-papel-elevado/60" />
          <span class="flex flex-1 flex-col gap-space-2">
            <span class="h-[17px] w-[45%] rounded-sm bg-papel-elevado/60" />
            <span class="h-[13px] w-[30%] rounded-sm bg-papel-elevado/60" />
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

      <template v-else-if="estado === 'encontrado' && resultado">
        <RouterLink
          :to="`/leitores/${resultado.username}`"
          class="group flex items-center gap-space-4 rounded-base bg-papel-elevado p-space-4 shadow-1 transition-shadow duration-dur-fast hover:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
          :aria-label="`${resultado.displayName}, arroba ${resultado.username}`"
        >
          <AvatarLeitor
            :url="resultado.avatarUrl"
            :nome="resultado.displayName"
            :tamanho="48"
          />
          <div class="flex min-w-0 flex-1 flex-col items-start">
            <span class="max-w-full truncate text-title-sm text-tinta transition-colors duration-dur-fast group-hover:text-musgo">{{ resultado.displayName }}</span>
            <span class="max-w-full truncate text-caption text-grafite-suave">@{{ resultado.username }}</span>
            <ChipPrivacidade
              :privacidade="resultado.privacidade"
              class="mt-space-2"
            />
            <span
              v-if="resultado.biografia"
              class="mt-space-2 line-clamp-2 text-caption text-grafite"
              data-teste="biografia"
            >{{ resultado.biografia }}</span>
          </div>
          <PhCaretRight
            :size="20"
            weight="regular"
            class="shrink-0 text-grafite-suave"
            aria-hidden="true"
          />
        </RouterLink>
        <img
          :src="leitorEncontrado"
          alt=""
          class="mx-auto mt-space-8 block h-auto w-[180px] max-w-full dark:hidden"
          data-teste="ilustracao-encontrado"
        >
        <!-- No escuro, a sombra do chão (`#f2f2f2` no original) vira `linha-noite`: a arte do
             protótipo deixava uma mancha clara sob o leitor. -->
        <img
          :src="leitorEncontradoEscura"
          alt=""
          class="mx-auto mt-space-8 hidden h-auto w-[180px] max-w-full dark:block"
        >
      </template>

      <EstadoVazio
        v-else-if="estado === 'vazio'"
        :ilustracao="nenhumLeitor"
        titulo="Nenhum leitor com esse nome de usuário"
        class="mx-auto mt-space-10 max-w-[300px] md:mt-0"
      >
        <p class="mt-space-3 text-body text-grafite">
          Confira a grafia. A busca precisa do nome de usuário inteiro e exato.
        </p>
      </EstadoVazio>

      <BannerAviso
        v-else-if="estado === 'erro'"
        variante="erro"
        triangulo
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
