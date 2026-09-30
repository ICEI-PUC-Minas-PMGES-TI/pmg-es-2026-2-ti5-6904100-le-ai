<script setup lang="ts">
import { PhArrowLeft, PhEnvelopeSimple } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import CampoTexto from '../../components/ui/CampoTexto.vue'
import EstadoTerminal from '../../components/ui/EstadoTerminal.vue'
import LayoutAutenticacao from '../../layouts/LayoutAutenticacao.vue'
import { ApiError } from '../../services/api'
import { authService } from '../../services/auth'

/**
 * Recuperar senha (RF-AUT-04). Layout e cópia de docs/design/periodo-1/F-AUT/recuperar-senha.md.
 *
 * **Anti-enumeração (RNF-SEC-28) manda no desenho inteiro.** O servidor responde o mesmo `202`
 * exista ou não a conta, e a tela mostra para ele a mesma confirmação neutra, com o e-mail que a
 * pessoa digitou, não um dado confirmado. Os outros desfechos também não dependem da conta:
 * `429` é o alerta de limite, `400` é formato, e falha de rede é erro de verdade. Esta última não
 * vira confirmação, porque a pessoa esperaria um e-mail que não saiu.
 */

const router = useRouter()

const email = ref('')
const erroEmail = ref('')
const limiteExcedido = ref(false)
const bannerErro = ref('')
const enviando = ref(false)
const enviadoPara = ref<string | null>(null)

// Formato, não existência: a validação do cliente não sabe nem pode saber se a conta existe.
const FORMATO_DE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const botaoDesabilitado = computed(() => Boolean(erroEmail.value) || limiteExcedido.value)

function validarFormato(): boolean {
  const valor = email.value.trim()
  erroEmail.value = FORMATO_DE_EMAIL.test(valor) ? '' : 'Digite um e-mail completo, como nome@provedor.com.'
  return !erroEmail.value
}

function aoSairDoCampo(): void {
  if (email.value.trim()) {
    validarFormato()
  }
}

function aoDigitar(valor: string): void {
  email.value = valor
  // Corrigir o campo ou esperar é o jeito de tentar de novo; não há contagem regressiva (§4.5).
  erroEmail.value = ''
  limiteExcedido.value = false
}

async function enviar(): Promise<void> {
  if (!validarFormato()) {
    return
  }
  const digitado = email.value.trim()
  bannerErro.value = ''
  enviando.value = true
  try {
    await authService.solicitarRecuperacao(digitado)
    enviadoPara.value = digitado
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 429) {
      limiteExcedido.value = true
      return
    }
    if (erro instanceof ApiError && erro.status === 400) {
      erroEmail.value = 'Digite um e-mail completo, como nome@provedor.com.'
      return
    }
    bannerErro.value =
      erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
  } finally {
    enviando.value = false
  }
}

function enviarDeNovo(): void {
  // Devolve o formulário com o e-mail preenchido (§4.4).
  enviadoPara.value = null
}

function irParaLogin(): void {
  void router.push('/login')
}
</script>

<template>
  <LayoutAutenticacao>
    <!-- Na confirmação neutra da web o protótipo começa pelo ícone: voltar já é o botão primário.
         No celular a seta fica, como no artboard mobile. -->
    <BotaoTextual
      class="-ml-space-3 min-h-12 gap-space-2 md:ml-0 md:min-h-0 md:px-0!"
      :class="enviadoPara !== null ? 'md:hidden' : ''"
      href="/login"
      aria-label="Voltar para entrar"
      @click.prevent="irParaLogin"
    >
      <PhArrowLeft
        :size="20"
        weight="regular"
        aria-hidden="true"
      />
      <span class="hidden md:inline">Voltar para entrar</span>
    </BotaoTextual>

    <EstadoTerminal
      v-if="enviadoPara !== null"
      class="mt-space-10 md:mt-0"
      :icone="PhEnvelopeSimple"
      titulo="Verifique seu e-mail"
    >
      <p>
        Se existir uma conta com {{ enviadoPara }}, enviamos um link para criar uma senha nova. O link
        vale por 1 hora.
      </p>
      <p>Não chegou? Confira a caixa de spam antes de pedir outro link.</p>
      <template #acoes>
        <BotaoPrimario @click="irParaLogin">
          Voltar para entrar
        </BotaoPrimario>
        <BotaoTextual
          class="min-h-12 md:min-h-0"
          @click="enviarDeNovo"
        >
          Enviar de novo
        </BotaoTextual>
      </template>
    </EstadoTerminal>

    <template v-else>
      <h1 class="mt-space-10 text-display text-tinta md:mt-space-6">
        Recuperar senha
      </h1>
      <p class="mt-space-4 text-body text-grafite">
        Informe o e-mail da sua conta. Se existir uma conta com ele, você recebe um link para criar uma
        senha nova.
      </p>

      <BannerAviso
        v-if="limiteExcedido"
        variante="alerta"
        class="mt-space-6"
      >
        Muitas solicitações. Tente de novo em alguns minutos.
      </BannerAviso>
      <BannerAviso
        v-else-if="bannerErro"
        variante="erro"
        class="mt-space-6"
      >
        {{ bannerErro }}
      </BannerAviso>

      <form
        novalidate
        class="mt-space-8 md:mt-space-6"
        @submit.prevent="enviar"
      >
        <fieldset
          :disabled="enviando"
          class="m-0 min-w-0 border-0 p-0"
          :class="enviando ? 'opacity-50' : ''"
          @focusout="aoSairDoCampo"
        >
          <CampoTexto
            :model-value="email"
            label="E-mail"
            type="email"
            autocomplete="email"
            :erro="erroEmail"
            erro-antes-do-helper
            helper="O link vale por 1 hora e só pode ser usado uma vez."
            @update:model-value="aoDigitar"
          />
        </fieldset>

        <BotaoPrimario
          tipo="submit"
          class="mt-space-8"
          :carregando="enviando"
          carregando-esmaecido
          :disabled="botaoDesabilitado"
        >
          {{ enviando ? 'Enviando' : 'Enviar link' }}
        </BotaoPrimario>
        <p
          v-if="enviando"
          class="mt-space-3 text-center text-caption text-grafite"
        >
          O servidor está iniciando. Isso pode levar alguns segundos.
        </p>
      </form>

      <!-- Some durante o envio, como no protótipo (Recuperar senha · Enviando). -->
      <div
        v-if="!enviando"
        class="mt-space-5 flex justify-center md:hidden"
      >
        <BotaoTextual
          class="min-h-12"
          href="/login"
          @click.prevent="irParaLogin"
        >
          Voltar para entrar
        </BotaoTextual>
      </div>
    </template>
  </LayoutAutenticacao>
</template>
