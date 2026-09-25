<script setup lang="ts">
import { PhUser } from '@phosphor-icons/vue'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoPrimario from '../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import CampoSenha from '../components/ui/CampoSenha.vue'
import CampoTexto from '../components/ui/CampoTexto.vue'
import LogoLeAi from '../components/ui/LogoLeAi.vue'
import LayoutAutenticacao from '../layouts/LayoutAutenticacao.vue'
import { ApiError } from '../services/api'
import { authService } from '../services/auth'
import { iniciarSessao } from '../session'

/**
 * Login (RF-AUT-02/03). Layout e cópia de docs/design/periodo-0/P0-NAV/login.md, com a edição de
 * F-AUT em docs/design/periodo-1/F-AUT/login.md ("Esqueci minha senha"). A coluna ilustrada, o
 * selo e os ícones nos campos vêm do protótipo de F-AUT, que é o desenho aprovado e foi além do
 * prompt (divergência registrada em feature-F-AUT.md).
 */

const router = useRouter()

const identificador = ref('')
const senha = ref('')

const erroIdentificador = ref('')
const erroSenha = ref('')
// Credencial inválida (§4.2): os dois campos ganham a borda, sem legenda própria — o banner já
// diz o que houve, e dizer duas vezes a mesma coisa não ajuda.
const bordaDeErroCredencial = ref(false)
const bannerErro = ref('')
// Bloqueio progressivo (§4.3) é alerta (ambar), não erro (rubi) — banner e botão diferentes.
const bloqueado = ref(false)
const enviando = ref(false)

// O servidor não devolve quando o bloqueio expira (sem cabeçalho Retry-After) e o protótipo
// proíbe contagem regressiva animada; editar qualquer campo é o sinal de que a pessoa quer
// tentar de novo, e é o único jeito de sair do bloqueio sem recarregar a página.
watch([identificador, senha], () => {
  if (bloqueado.value) {
    bloqueado.value = false
    bannerErro.value = ''
  }
})

function limparErros(): void {
  erroIdentificador.value = ''
  erroSenha.value = ''
  bordaDeErroCredencial.value = false
  bannerErro.value = ''
}

function validarCliente(): boolean {
  erroIdentificador.value = identificador.value.trim() ? '' : 'Informe seu e-mail ou nome de usuário.'
  erroSenha.value = senha.value ? '' : 'Informe sua senha.'
  return !erroIdentificador.value && !erroSenha.value
}

function tratarErro(erro: unknown): void {
  if (!(erro instanceof ApiError)) {
    bannerErro.value = 'Não foi possível acessar o servidor. Tente novamente.'
    return
  }
  if (erro.code === 'MUITAS_REQUISICOES') {
    bloqueado.value = true
    bannerErro.value = erro.message
    return
  }
  if (erro.code === 'NAO_AUTENTICADO') {
    bordaDeErroCredencial.value = true
    bannerErro.value = erro.message
    // Identificador fica; senha é limpa (login.md §4.2) — o mesmo padrão de qualquer login que
    // não revela qual dos dois campos era o errado.
    senha.value = ''
    return
  }
  bannerErro.value = erro.message
}

async function enviar(): Promise<void> {
  limparErros()
  if (!validarCliente()) {
    return
  }

  enviando.value = true
  try {
    const resultado = await authService.entrar({
      identificador: identificador.value.trim(),
      senha: senha.value,
    })
    iniciarSessao(resultado.sessao, resultado.usuario)
    await router.push('/estante')
  } catch (erro) {
    tratarErro(erro)
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <LayoutAutenticacao ilustrada>
    <div class="md:hidden">
      <LogoLeAi :altura="24" />
    </div>

    <h1 class="mt-space-10 text-display text-tinta md:mt-0">
      Entrar
    </h1>

    <BannerAviso
      v-if="bannerErro"
      :variante="bloqueado ? 'alerta' : 'erro'"
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
        :class="enviando ? 'opacity-60' : ''"
      >
        <div class="flex flex-col gap-space-5">
          <CampoTexto
            v-model="identificador"
            label="E-mail ou nome de usuário"
            autocomplete="username"
            :icone="PhUser"
            :erro="erroIdentificador"
            :borda-de-erro="bordaDeErroCredencial"
          />
          <CampoSenha
            v-model="senha"
            label="Senha"
            autocomplete="current-password"
            com-icone
            :erro="erroSenha"
            :borda-de-erro="bordaDeErroCredencial"
          />
        </div>
      </fieldset>

      <!-- Edição de F-AUT (login.md): abaixo da senha, à direita, antes do botão principal. -->
      <div class="mt-space-3 flex justify-end">
        <BotaoTextual
          class="min-h-12 md:min-h-0"
          href="/recuperar-senha"
          @click.prevent="router.push('/recuperar-senha')"
        >
          Esqueci minha senha
        </BotaoTextual>
      </div>

      <BotaoPrimario
        tipo="submit"
        class="mt-space-8"
        :carregando="enviando"
        :disabled="bloqueado"
      >
        {{ enviando ? 'Entrando' : 'Entrar' }}
      </BotaoPrimario>
      <p
        v-if="enviando"
        class="mt-space-3 text-caption text-grafite"
      >
        O servidor está iniciando. Isso pode levar alguns segundos.
      </p>
    </form>

    <p class="mt-space-5 text-body text-grafite">
      Ainda não tem conta?
      <BotaoTextual
        href="/cadastro"
        @click.prevent="router.push('/cadastro')"
      >
        Criar conta
      </BotaoTextual>
    </p>
  </LayoutAutenticacao>
</template>
