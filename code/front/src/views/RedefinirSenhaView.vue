<script setup lang="ts">
import { PhCheckCircle, PhClockCounterClockwise, PhInfo } from '@phosphor-icons/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoPrimario from '../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import CampoSenha from '../components/ui/CampoSenha.vue'
import EstadoTerminal from '../components/ui/EstadoTerminal.vue'
import LogoLeAi from '../components/ui/LogoLeAi.vue'
import LayoutAutenticacao from '../layouts/LayoutAutenticacao.vue'
import { ApiError, novaChaveIdempotencia } from '../services/api'
import { authService } from '../services/auth'
import { encerrarSessao, getToken } from '../session'
import { validarSenhaNova } from './validacaoDeSenha'

/**
 * Redefinir senha pelo link do e-mail (RF-AUT-04). Layout e cópia de
 * docs/design/periodo-1/F-AUT/redefinir-senha.md.
 *
 * **O token vem no fragmento** (`/redefinir-senha#token=...`), que o navegador não manda ao
 * servidor da web nem põe no `Referer`. Lido uma vez ao montar e apagado da barra de endereço,
 * para não ficar no histórico nem aparecer num print. Nada da conta aparece na tela.
 *
 * Link sem token, vencido, usado ou adulterado é o mesmo estado de tela inteira (§4.6).
 */

type Estado = 'formulario' | 'sucesso' | 'linkInvalido'

const route = useRoute()
const router = useRouter()

const token = ref<string | null>(null)
const estado = ref<Estado>('formulario')
const novaSenha = ref('')
const confirmacao = ref('')
const erroNova = ref('')
const erroConfirmacao = ref('')
const bannerErro = ref('')
const salvando = ref(false)

let ultimaIntencao: { corpo: string; chave: string } | null = null

onMounted(() => {
  const lido = new URLSearchParams(route.hash.replace(/^#/, '')).get('token')
  token.value = lido && lido.trim() ? lido : null
  if (token.value === null) {
    estado.value = 'linkInvalido'
    return
  }
  void router.replace({ path: route.path, hash: '' })
})

// Com erro de política o botão fica desabilitado até a pessoa mexer na senha (§4.2).
const botaoDesabilitado = computed(() => Boolean(erroNova.value))

function aoDigitarNova(valor: string): void {
  novaSenha.value = valor
  erroNova.value = ''
  bannerErro.value = ''
}

function aoDigitarConfirmacao(valor: string): void {
  confirmacao.value = valor
  erroConfirmacao.value = ''
}

function chaveDaIntencao(corpo: string): string {
  if (ultimaIntencao?.corpo !== corpo) {
    ultimaIntencao = { corpo, chave: novaChaveIdempotencia() }
  }
  return ultimaIntencao.chave
}

async function salvar(): Promise<void> {
  const erros = validarSenhaNova(novaSenha.value, confirmacao.value)
  erroNova.value = erros.nova
  erroConfirmacao.value = erros.confirmacao
  if (erros.nova || erros.confirmacao || token.value === null) {
    return
  }

  const dados = { token: token.value, novaSenha: novaSenha.value }
  salvando.value = true
  try {
    await authService.redefinirSenha(dados, chaveDaIntencao(JSON.stringify(dados)))
    // O servidor revogou todas as renovações da conta. Se este navegador tinha sessão (de outra
    // conta ou da mesma), ela não renova mais; limpar agora evita que o login mande para dentro.
    if (getToken() !== null) {
      encerrarSessao()
    }
    estado.value = 'sucesso'
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 410) {
      estado.value = 'linkInvalido'
      return
    }
    if (erro instanceof ApiError && erro.status === 400) {
      // A mensagem é a da política do servidor (senha curta ou comum), que é a do protótipo.
      erroNova.value = erro.message
      return
    }
    bannerErro.value =
      erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <LayoutAutenticacao>
    <div class="mt-space-2 md:hidden">
      <LogoLeAi :altura="24" />
    </div>

    <EstadoTerminal
      v-if="estado === 'sucesso'"
      class="mt-space-10 md:mt-0"
      :icone="PhCheckCircle"
      titulo="Senha alterada"
    >
      <p>Você já pode entrar com a senha nova. Por segurança, encerramos a sessão nos outros aparelhos.</p>
      <template #acoes>
        <BotaoPrimario @click="router.push('/login')">
          Entrar
        </BotaoPrimario>
      </template>
    </EstadoTerminal>

    <EstadoTerminal
      v-else-if="estado === 'linkInvalido'"
      class="mt-space-10 md:mt-0"
      :icone="PhClockCounterClockwise"
      tom="ambar"
      titulo="Este link não vale mais"
    >
      <p>
        O link de recuperação vale por 1 hora e só pode ser usado uma vez. Peça um link novo para
        continuar.
      </p>
      <template #acoes>
        <BotaoPrimario @click="router.push('/recuperar-senha')">
          Pedir novo link
        </BotaoPrimario>
        <BotaoTextual
          class="min-h-12 md:min-h-0"
          href="/login"
          @click.prevent="router.push('/login')"
        >
          Voltar para entrar
        </BotaoTextual>
      </template>
    </EstadoTerminal>

    <template v-else>
      <h1 class="mt-space-10 text-display text-tinta md:mt-0">
        Criar uma senha nova
      </h1>
      <p class="mt-space-4 text-body text-grafite">
        Escolha a senha que você vai usar para entrar.
      </p>

      <BannerAviso
        v-if="bannerErro"
        variante="erro"
        class="mt-space-6"
      >
        {{ bannerErro }}
      </BannerAviso>

      <form
        novalidate
        class="mt-space-8 md:mt-space-6"
        @submit.prevent="salvar"
      >
        <fieldset
          :disabled="salvando"
          class="m-0 min-w-0 border-0 p-0"
          :class="salvando ? 'opacity-50' : ''"
        >
          <div class="flex flex-col gap-space-5">
            <CampoSenha
              :model-value="novaSenha"
              label="Nova senha"
              autocomplete="new-password"
              :erro="erroNova"
              erro-antes-do-helper
              helper="Mínimo de 8 caracteres. Evite senhas comuns, como sequências e o seu nome."
              @update:model-value="aoDigitarNova"
            />
            <CampoSenha
              :model-value="confirmacao"
              label="Confirmar nova senha"
              autocomplete="new-password"
              :erro="erroConfirmacao"
              erro-antes-do-helper
              @update:model-value="aoDigitarConfirmacao"
            />
          </div>
        </fieldset>
        <!-- Depois da confirmação e fora do esmaecido do envio, como no protótipo. -->
        <p class="mt-space-4 flex items-start gap-space-2 text-caption text-grafite">
          <PhInfo
            :size="16"
            weight="regular"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          Ao salvar, você sai do aplicativo nos outros aparelhos.
        </p>

        <BotaoPrimario
          tipo="submit"
          class="mt-space-8"
          :carregando="salvando"
          carregando-esmaecido
          :disabled="botaoDesabilitado"
        >
          {{ salvando ? 'Salvando' : 'Salvar senha' }}
        </BotaoPrimario>
        <p
          v-if="salvando"
          class="mt-space-3 text-center text-caption text-grafite"
        >
          O servidor está iniciando. Isso pode levar alguns segundos.
        </p>
      </form>
    </template>
  </LayoutAutenticacao>
</template>
