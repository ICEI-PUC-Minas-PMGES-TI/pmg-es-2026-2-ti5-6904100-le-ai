<script setup lang="ts">
import { PhCamera, PhGlobe, PhLock } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, type Component } from 'vue'
import { onBeforeRouteLeave, useRouter, type RouteLocationRaw } from 'vue-router'

import AvatarLeitor from '../components/perfil/AvatarLeitor.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoPrimario from '../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import CampoAreaTexto from '../components/ui/CampoAreaTexto.vue'
import CampoTexto from '../components/ui/CampoTexto.vue'
import DialogoConfirmacao from '../components/ui/DialogoConfirmacao.vue'
import { ApiError, novaChaveIdempotencia } from '../services/api'
import { enviarAvatar, publicIdDaUrl, validarAvatar } from '../services/avatar'
import { perfilService, type Avatar, type EditarPerfil, type Perfil, type Privacidade } from '../services/perfil'
import { atualizarUsuario } from '../session'

/**
 * Editar perfil (RF-SOC-01/04), a partir de docs/design/periodo-1/F-PERFIL/editar-perfil.md.
 * Nome de exibição, biografia, avatar e privacidade; o username não muda.
 *
 * - **Avatar:** validado pelos bytes, enviado direto ao Cloudinary, e só a URL e o `publicId`
 *   vão ao `identidade`, que confere a origem sem baixar (RNF-SEC-20/38). O upload não trava os
 *   campos de texto; recusa ou falha volta a foto anterior (§4.3).
 * - **Sair com alterações** passa sempre pelo modal (§4.7), pela guarda de saída da rota: vale
 *   para o `X`, para `Cancelar`, para as abas e para o voltar do navegador.
 * - **Biografia com contador de 1000**, divergindo do protótipo, que dispensava contador por
 *   falta de limite: o servidor tem teto técnico de 1000, e esconder o limite deixaria a pessoa
 *   descobrir no erro. O limite de produto continua pendente.
 */
const LIMITE_DO_NOME = 60
const LIMITE_DA_BIOGRAFIA = 1000

const router = useRouter()

const original = ref<Perfil | null>(null)
const carregando = ref(true)
const falhouCarga = ref(false)

const campos = reactive({ nome: '', biografia: '', privacidade: 'publico' as Privacidade })
const nomeTocado = ref(false)
const errosDoServidor = reactive<{ nome?: string; biografia?: string }>({})

const avatar = ref<Avatar | null>(null)
let avatarOriginal: Avatar | null = null
const previa = ref<string | null>(null)
const enviandoAvatar = ref(false)
const erroDoAvatar = ref<string | null>(null)
const seletor = ref<HTMLInputElement | null>(null)
let envioAtual = 0

const banner = ref<string | null>(null)
const salvando = ref(false)
const coldStart = ref(false)
let coldStartTimer: ReturnType<typeof setTimeout> | undefined

const confirmandoDescarte = ref(false)
let destinoPendente: RouteLocationRaw | null = null
let saidaLiberada = false

// A chave acompanha a intenção: reenviar o mesmo conteúdo reaproveita a chave (RNF-ERR-04).
let chave: string | null = null
let conteudoDaChave: string | null = null

const erroDoNome = computed(() => {
  if (errosDoServidor.nome) {
    return errosDoServidor.nome
  }
  if (nomeTocado.value && campos.nome.trim() === '') {
    return 'Informe um nome de exibição.'
  }
  if (campos.nome.trim().length > LIMITE_DO_NOME) {
    return `Use no máximo ${LIMITE_DO_NOME} caracteres.`
  }
  return undefined
})

const nomeValido = computed(() => campos.nome.trim() !== '' && campos.nome.trim().length <= LIMITE_DO_NOME)

const podeSalvar = computed(
  () =>
    original.value !== null &&
    nomeValido.value &&
    campos.biografia.length <= LIMITE_DA_BIOGRAFIA &&
    !enviandoAvatar.value &&
    !salvando.value,
)

function dadosDoFormulario(): EditarPerfil {
  const biografia = campos.biografia.trim()
  return {
    displayName: campos.nome.trim(),
    biografia: biografia === '' ? null : biografia,
    avatar: avatar.value,
    privacidade: campos.privacidade,
  }
}

const modificado = computed(() => {
  const perfil = original.value
  if (!perfil) {
    return false
  }
  const dados = dadosDoFormulario()
  return (
    dados.displayName !== perfil.displayName ||
    dados.biografia !== (perfil.biografia ?? null) ||
    dados.privacidade !== perfil.privacidade ||
    (dados.avatar?.url ?? null) !== (perfil.avatarUrl ?? null) ||
    enviandoAvatar.value
  )
})

const avisoDePrivado = computed(() => {
  const perfil = original.value
  if (!perfil || perfil.privacidade !== 'publico' || campos.privacidade !== 'privado') {
    return null
  }
  const total = perfil.contadores.seguidores
  if (total === 0) {
    return null
  }
  return total === 1
    ? 'Seu 1 seguidor atual continua seguindo você. Para tirar alguém, use a lista de seguidores.'
    : `Seus ${total} seguidores atuais continuam seguindo você. Para tirar alguém, use a lista de seguidores.`
})

const opcoes: { valor: Privacidade; titulo: string; descricao: string; icone: Component }[] = [
  {
    valor: 'publico',
    titulo: 'Público',
    descricao: 'Qualquer leitor vê sua estante, suas notas e suas resenhas.',
    icone: PhGlobe,
  },
  {
    valor: 'privado',
    titulo: 'Privado',
    descricao: 'Só quem você aceitar vê sua estante, suas notas e suas resenhas.',
    icone: PhLock,
  },
]

async function carregar(): Promise<void> {
  carregando.value = true
  falhouCarga.value = false
  try {
    const perfil = await perfilService.obterMeuPerfil()
    original.value = perfil
    campos.nome = perfil.displayName
    campos.biografia = perfil.biografia ?? ''
    campos.privacidade = perfil.privacidade
    const publicId = perfil.avatarUrl ? publicIdDaUrl(perfil.avatarUrl) : null
    avatarOriginal = perfil.avatarUrl && publicId ? { url: perfil.avatarUrl, publicId } : null
    avatar.value = avatarOriginal
  } catch {
    falhouCarga.value = true
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)

onBeforeUnmount(() => {
  clearTimeout(coldStartTimer)
  envioAtual++
  liberarPrevia()
})

function liberarPrevia(): void {
  if (previa.value) {
    URL.revokeObjectURL(previa.value)
    previa.value = null
  }
}

function escolherFoto(): void {
  seletor.value?.click()
}

async function aoEscolherArquivo(evento: Event): Promise<void> {
  const entrada = evento.target as HTMLInputElement
  const arquivo = entrada.files?.[0]
  entrada.value = ''
  if (!arquivo) {
    return
  }
  const meu = ++envioAtual
  erroDoAvatar.value = null
  const recusa = await validarAvatar(arquivo)
  if (meu !== envioAtual) {
    return
  }
  if (recusa) {
    erroDoAvatar.value = `Não foi possível usar essa imagem. ${recusa}`
    return
  }

  liberarPrevia()
  previa.value = URL.createObjectURL(arquivo)
  enviandoAvatar.value = true
  try {
    const enviado = await enviarAvatar(arquivo)
    if (meu === envioAtual) {
      avatar.value = enviado
    }
  } catch (erro) {
    if (meu === envioAtual) {
      erroDoAvatar.value = erro instanceof Error ? erro.message : 'Não foi possível enviar a foto. Tente de novo.'
    }
  } finally {
    if (meu === envioAtual) {
      enviandoAvatar.value = false
      liberarPrevia()
    }
  }
}

function removerFoto(): void {
  envioAtual++
  enviandoAvatar.value = false
  liberarPrevia()
  erroDoAvatar.value = null
  avatar.value = null
}

async function salvar(): Promise<void> {
  nomeTocado.value = true
  if (!podeSalvar.value) {
    return
  }
  const dados = dadosDoFormulario()
  const conteudo = JSON.stringify(dados)
  if (conteudo !== conteudoDaChave) {
    chave = novaChaveIdempotencia()
    conteudoDaChave = conteudo
  }

  banner.value = null
  errosDoServidor.nome = undefined
  errosDoServidor.biografia = undefined
  salvando.value = true
  coldStart.value = false
  coldStartTimer = setTimeout(() => {
    coldStart.value = true
  }, 3_000)

  try {
    const salvo = await perfilService.atualizarMeuPerfil(dados, chave!)
    atualizarUsuario({ id: salvo.id, username: salvo.username, displayName: salvo.displayName })
    saidaLiberada = true
    await voltarAoPerfil()
  } catch (erro) {
    tratarErro(erro)
  } finally {
    clearTimeout(coldStartTimer)
    coldStart.value = false
    salvando.value = false
  }
}

function tratarErro(erro: unknown): void {
  if (!(erro instanceof ApiError)) {
    banner.value = 'Não foi possível acessar o servidor. Tente novamente.'
    return
  }
  if (erro.status === 422) {
    // Avatar recusado pelo servidor: volta a foto anterior, o resto do formulário fica (§4.3).
    avatar.value = avatarOriginal
    erroDoAvatar.value = erro.message
    return
  }
  const porCampo = erro.campos ?? {}
  if (porCampo.displayName || porCampo.biografia) {
    errosDoServidor.nome = porCampo.displayName
    errosDoServidor.biografia = porCampo.biografia
    return
  }
  banner.value = erro.message
}

async function voltarAoPerfil(): Promise<void> {
  if (window.history.state?.back) {
    router.back()
  } else {
    await router.replace('/perfil')
  }
}

onBeforeRouteLeave((destino) => {
  if (saidaLiberada || !modificado.value) {
    return true
  }
  if (salvando.value) {
    return false
  }
  destinoPendente = destino.fullPath
  confirmandoDescarte.value = true
  return false
})

async function descartar(): Promise<void> {
  confirmandoDescarte.value = false
  saidaLiberada = true
  await router.push(destinoPendente ?? '/perfil')
}
</script>

<template>
  <div class="pb-space-16 pt-space-6">
    <div
      v-if="carregando"
      class="flex max-w-[560px] flex-col gap-space-6 md:grid md:grid-cols-[160px_1fr] md:gap-space-8"
      aria-busy="true"
      aria-label="Carregando perfil"
    >
      <span class="mx-auto size-24 rounded-full bg-capa-placeholder md:mx-0 md:size-[120px]" />
      <div class="flex flex-col gap-space-5">
        <span class="h-11 rounded-base bg-capa-placeholder" />
        <span class="h-11 rounded-base bg-capa-placeholder" />
        <span class="h-[120px] rounded-base bg-capa-placeholder" />
        <span class="h-[72px] rounded-base bg-capa-placeholder" />
        <span class="h-[72px] rounded-base bg-capa-placeholder" />
      </div>
    </div>

    <BannerAviso
      v-else-if="falhouCarga"
      variante="erro"
    >
      Não foi possível carregar seu perfil. Verifique sua conexão e tente de novo.
      <BotaoTextual
        class="mt-space-2"
        @click="carregar"
      >
        Tentar de novo
      </BotaoTextual>
    </BannerAviso>

    <form
      v-else-if="original"
      novalidate
      class="max-w-[560px]"
      @submit.prevent="salvar"
    >
      <BannerAviso
        v-if="banner"
        variante="erro"
        class="mb-space-6"
      >
        {{ banner }}
      </BannerAviso>

      <div class="flex flex-col gap-space-6 md:grid md:grid-cols-[160px_1fr] md:gap-space-8">
        <!-- Avatar: centralizado no mobile, coluna de 160px na web (§5). -->
        <div class="flex flex-col items-center border-b border-linha pb-space-6 md:items-start md:border-0 md:pb-0">
          <div class="relative">
            <AvatarLeitor
              class="md:hidden"
              :url="previa ?? avatar?.url ?? null"
              :tamanho="96"
            />
            <AvatarLeitor
              class="hidden md:flex"
              :url="previa ?? avatar?.url ?? null"
              :tamanho="120"
            />
            <span
              v-if="enviandoAvatar"
              class="absolute inset-0 flex items-center justify-center rounded-full bg-tinta/40 text-caption font-semibold text-papel"
              role="status"
            >
              Enviando
            </span>
          </div>
          <input
            ref="seletor"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="sr-only"
            tabindex="-1"
            aria-hidden="true"
            @change="aoEscolherArquivo"
          >
          <BotaoTextual
            class="mt-space-3 min-h-12 gap-space-2 md:min-h-10"
            :disabled="enviandoAvatar || salvando"
            @click="escolherFoto"
          >
            <PhCamera
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
            Trocar foto
          </BotaoTextual>
          <BotaoTextual
            v-if="avatar && !enviandoAvatar"
            class="min-h-12 text-caption md:min-h-10"
            tom="grafite"
            :disabled="salvando"
            @click="removerFoto"
          >
            Remover foto
          </BotaoTextual>
        </div>

        <fieldset
          :disabled="salvando"
          class="m-0 flex min-w-0 flex-col gap-space-6 border-0 p-0"
        >
          <BannerAviso
            v-if="erroDoAvatar"
            variante="erro"
            class="md:-mt-space-2"
          >
            {{ erroDoAvatar }}
          </BannerAviso>

          <div class="flex flex-col gap-space-2">
            <span
              id="rotulo-username"
              class="text-label text-grafite"
            >Nome de usuário</span>
            <p
              class="flex h-12 items-center justify-between rounded-base border border-linha bg-papel-elevado px-space-4 text-body text-grafite-suave md:h-11"
              aria-labelledby="rotulo-username"
              aria-describedby="helper-username"
            >
              @{{ original.username }}
              <PhLock
                :size="20"
                weight="regular"
                aria-hidden="true"
              />
            </p>
            <p
              id="helper-username"
              class="text-caption text-grafite"
            >
              O nome de usuário não muda.
            </p>
          </div>

          <CampoTexto
            id="campo-nome"
            v-model="campos.nome"
            label="Nome de exibição"
            required
            autocomplete="name"
            :helper="`${campos.nome.trim().length}/${LIMITE_DO_NOME}`"
            :erro="erroDoNome"
            @update:model-value="nomeTocado = true; errosDoServidor.nome = undefined"
          />

          <CampoAreaTexto
            id="campo-biografia"
            v-model="campos.biografia"
            label="Biografia"
            helper="Aparece no seu perfil em até três linhas."
            :erro="errosDoServidor.biografia"
            :limite="LIMITE_DA_BIOGRAFIA"
            :aviso="LIMITE_DA_BIOGRAFIA - 100"
          />
        </fieldset>
      </div>

      <fieldset
        :disabled="salvando"
        class="m-0 mt-space-8 border-0 border-t border-linha p-0 pt-space-6"
        role="radiogroup"
        aria-labelledby="titulo-privacidade"
      >
        <h2
          id="titulo-privacidade"
          class="text-title-lg text-tinta"
        >
          Privacidade
        </h2>
        <div class="mt-space-4 grid gap-space-3 md:grid-cols-2 md:gap-space-4">
          <label
            v-for="opcao in opcoes"
            :key="opcao.valor"
            class="flex cursor-pointer items-start gap-space-3 rounded-base p-space-4 transition-colors duration-dur-fast has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-musgo"
            :class="campos.privacidade === opcao.valor ? 'border-[1.5px] border-musgo bg-musgo-fundo' : 'border border-linha hover:bg-linha'"
          >
            <input
              v-model="campos.privacidade"
              type="radio"
              name="privacidade"
              :value="opcao.valor"
              class="mt-0.5 size-5 shrink-0 accent-musgo"
            >
            <component
              :is="opcao.icone"
              :size="20"
              weight="regular"
              class="mt-0.5 shrink-0 text-tinta"
              aria-hidden="true"
            />
            <span class="flex flex-col gap-space-1">
              <span class="text-body-strong text-tinta">{{ opcao.titulo }}</span>
              <span class="text-caption text-grafite">{{ opcao.descricao }}</span>
            </span>
          </label>
        </div>
      </fieldset>

      <BannerAviso
        v-if="avisoDePrivado"
        variante="alerta"
        class="mt-space-4"
      >
        {{ avisoDePrivado }}
      </BannerAviso>
      <p
        v-if="coldStart"
        class="mt-space-4 text-caption text-grafite"
        role="status"
      >
        O servidor está iniciando. Isso pode levar alguns segundos.
      </p>
    </form>

    <DialogoConfirmacao
      :aberta="confirmandoDescarte"
      titulo="Descartar alterações?"
      rotulo-confirmar="Descartar"
      rotulo-cancelar="Continuar editando"
      @confirmar="descartar"
      @cancelar="confirmandoDescarte = false"
    >
      O que você mudou nesta tela não vai ser salvo.
    </DialogoConfirmacao>
  </div>

  <Teleport
    to="#cabecalho-acoes"
    defer
  >
    <!-- Mobile: `Salvar` textual (§4); web: `Cancelar` e o pill `Salvar` (§5). -->
    <BotaoTextual
      class="-mr-space-3 min-h-12 px-space-3 text-body-strong md:hidden"
      :tom="salvando ? 'grafite' : 'musgo'"
      :disabled="!podeSalvar"
      @click="salvar"
    >
      {{ salvando ? 'Salvando' : 'Salvar' }}
    </BotaoTextual>
    <div class="hidden items-center gap-space-4 md:flex">
      <BotaoTextual
        class="min-h-10"
        tom="grafite"
        :disabled="salvando"
        @click="voltarAoPerfil"
      >
        Cancelar
      </BotaoTextual>
      <BotaoPrimario
        class="w-auto px-space-8"
        :disabled="!podeSalvar && !salvando"
        :carregando="salvando"
        @click="salvar"
      >
        {{ salvando ? 'Salvando' : 'Salvar' }}
      </BotaoPrimario>
    </div>
  </Teleport>
</template>
