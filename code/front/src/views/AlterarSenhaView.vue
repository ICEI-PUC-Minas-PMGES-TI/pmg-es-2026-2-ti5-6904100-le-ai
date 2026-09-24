<script setup lang="ts">
import { PhCheckCircle, PhInfo } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoPrimario from '../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import CampoSenha from '../components/ui/CampoSenha.vue'
import EstadoTerminal from '../components/ui/EstadoTerminal.vue'
import { ApiError, novaChaveIdempotencia } from '../services/api'
import { authService } from '../services/auth'
import { iniciarSessao, useSession } from '../session'
import { validarSenhaNova } from './validacaoDeSenha'

/**
 * Alterar senha (RF-AUT-05). Layout e cópia de docs/design/periodo-1/F-AUT/alterar-senha.md.
 *
 * O servidor devolve `422` tanto para senha atual errada quanto para senha nova comum, com o
 * mesmo código: o que separa os dois é a mensagem, e só a da política fala em senha comum. Senha
 * atual errada vira banner com o campo limpo (§4.2); política vira erro no campo novo (§4.3).
 */

const router = useRouter()
const { usuario } = useSession()

const senhaAtual = ref('')
const novaSenha = ref('')
const confirmacao = ref('')
const bordaDeErroAtual = ref(false)
const erroNova = ref('')
const erroConfirmacao = ref('')
const bannerErro = ref('')
const salvando = ref(false)
const alterada = ref(false)

let ultimaIntencao: { corpo: string; chave: string } | null = null

const botaoDesabilitado = computed(() => Boolean(erroNova.value))

function limparErros(): void {
  bordaDeErroAtual.value = false
  erroNova.value = ''
  erroConfirmacao.value = ''
  bannerErro.value = ''
}

function chaveDaIntencao(corpo: string): string {
  if (ultimaIntencao?.corpo !== corpo) {
    ultimaIntencao = { corpo, chave: novaChaveIdempotencia() }
  }
  return ultimaIntencao.chave
}

function tratarErro(erro: unknown): void {
  if (!(erro instanceof ApiError)) {
    bannerErro.value = 'Não foi possível acessar o servidor. Tente novamente.'
    return
  }
  if (erro.status === 422 && erro.message.includes('comum')) {
    erroNova.value = erro.message
    return
  }
  if (erro.status === 422) {
    bannerErro.value = erro.message
    bordaDeErroAtual.value = true
    senhaAtual.value = ''
    return
  }
  if (erro.status === 400) {
    erroNova.value = erro.message
    return
  }
  bannerErro.value = erro.message
}

async function salvar(): Promise<void> {
  limparErros()
  if (!senhaAtual.value) {
    bordaDeErroAtual.value = true
    bannerErro.value = 'Informe sua senha atual.'
    return
  }
  const erros = validarSenhaNova(novaSenha.value, confirmacao.value)
  erroNova.value = erros.nova
  erroConfirmacao.value = erros.confirmacao
  if (erros.nova || erros.confirmacao || usuario.value === null) {
    return
  }

  const dados = { senhaAtual: senhaAtual.value, novaSenha: novaSenha.value }
  salvando.value = true
  try {
    const novaSessao = await authService.alterarSenha(
      dados,
      usuario.value,
      chaveDaIntencao(JSON.stringify(dados)),
    )
    if (novaSessao) {
      iniciarSessao(novaSessao.sessao, novaSessao.usuario)
    }
    alterada.value = true
  } catch (erro) {
    tratarErro(erro)
  } finally {
    salvando.value = false
  }
}

function voltarParaConfiguracoes(): void {
  void router.push('/perfil/configuracoes')
}
</script>

<template>
  <div class="max-w-[480px] pb-space-10 pt-space-6">
    <EstadoTerminal
      v-if="alterada"
      class="pt-space-4"
      :icone="PhCheckCircle"
      titulo="Senha alterada"
    >
      <p>Sua senha foi trocada. Encerramos a sessão nos outros aparelhos, e aqui você continua conectado.</p>
      <template #acoes>
        <BotaoPrimario @click="voltarParaConfiguracoes">
          Voltar para configurações
        </BotaoPrimario>
      </template>
    </EstadoTerminal>

    <form
      v-else
      novalidate
      @submit.prevent="salvar"
    >
      <BannerAviso
        v-if="bannerErro"
        variante="erro"
        class="mb-space-6"
      >
        {{ bannerErro }}
      </BannerAviso>

      <fieldset
        :disabled="salvando"
        class="m-0 min-w-0 border-0 p-0"
        :class="salvando ? 'opacity-60' : ''"
      >
        <CampoSenha
          v-model="senhaAtual"
          label="Senha atual"
          autocomplete="current-password"
          :borda-de-erro="bordaDeErroAtual"
          @update:model-value="bordaDeErroAtual = false"
        />

        <!-- Separa provar quem você é de escolher a senha nova (§4). -->
        <hr class="my-space-8 border-0 border-t border-linha">

        <div class="flex flex-col gap-space-5">
          <CampoSenha
            v-model="novaSenha"
            label="Nova senha"
            autocomplete="new-password"
            :erro="erroNova"
            helper="Mínimo de 8 caracteres. Evite senhas comuns, como sequências e o seu nome."
            @update:model-value="erroNova = ''"
          />
          <CampoSenha
            v-model="confirmacao"
            label="Confirmar nova senha"
            autocomplete="new-password"
            :erro="erroConfirmacao"
            @update:model-value="erroConfirmacao = ''"
          />
        </div>

        <p class="mt-space-4 flex items-start gap-space-2 text-caption text-grafite">
          <PhInfo
            :size="16"
            weight="regular"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          Ao salvar, você sai do aplicativo nos outros aparelhos.
        </p>
      </fieldset>

      <BotaoPrimario
        tipo="submit"
        class="mt-space-8"
        :carregando="salvando"
        :disabled="botaoDesabilitado"
      >
        {{ salvando ? 'Salvando' : 'Salvar nova senha' }}
      </BotaoPrimario>
      <p
        v-if="salvando"
        class="mt-space-3 text-caption text-grafite"
      >
        O servidor está iniciando. Isso pode levar alguns segundos.
      </p>
      <div class="mt-space-4 flex justify-center">
        <BotaoTextual
          class="min-h-12 md:min-h-0"
          tom="grafite"
          :disabled="salvando"
          @click="voltarParaConfiguracoes"
        >
          Cancelar
        </BotaoTextual>
      </div>
    </form>
  </div>
</template>
