<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoPrimario from '../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import CampoSenha from '../components/ui/CampoSenha.vue'
import CampoTexto from '../components/ui/CampoTexto.vue'
import LogoLeAi from '../components/ui/LogoLeAi.vue'
import LayoutAutenticacao from '../layouts/LayoutAutenticacao.vue'
import { ApiError, novaChaveIdempotencia } from '../services/api'
import { authService, type CadastroRequisicao } from '../services/auth'
import { iniciarSessao } from '../session'

/**
 * Cadastro (RF-AUT-01). Layout e cópia de docs/design/periodo-0/P0-NAV/cadastro.md.
 *
 * Regras de validação do cliente espelham exatamente as do servidor (CadastroRequisicao.java):
 * mesmos campos, mesmas mensagens. "Validação no cliente reforça a do servidor, nunca
 * substitui" (plano da feature) — por isso o servidor ainda é chamado normalmente, e o 409 de
 * conflito só o servidor sabe responder.
 */

const router = useRouter()

const email = ref('')
const username = ref('')
const displayName = ref('')
const dataNascimento = ref('')
const senha = ref('')

const erros = reactive<{
  email?: string
  username?: string
  displayName?: string
  dataNascimento?: string
  senha?: string
}>({})
// Conflito de e-mail/username (409) explica o erro no banner; o campo só ganha a borda, sem
// repetir a mensagem (login.md §4.2 vale aqui também: dizer a mesma coisa duas vezes não ajuda).
const bordaDeErroUsername = ref(false)
const bordaDeErroEmail = ref(false)
const bannerErro = ref('')
const enviando = ref(false)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[A-Za-z0-9._]{3,30}$/

/** Mesma regra do MaiorDeIdadeValidator do backend: Period.between em anos, fronteira inclusiva. */
function maiorDeIdade(dataIso: string): boolean {
  const nascimento = new Date(`${dataIso}T00:00:00`)
  if (Number.isNaN(nascimento.getTime())) {
    return false
  }
  const hoje = new Date()
  if (nascimento > hoje) {
    return false
  }
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const aniversarioJaPassou =
    hoje.getMonth() > nascimento.getMonth()
    || (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() >= nascimento.getDate())
  if (!aniversarioJaPassou) {
    idade -= 1
  }
  return idade >= 18
}

function limparErros(): void {
  erros.email = undefined
  erros.username = undefined
  erros.displayName = undefined
  erros.dataNascimento = undefined
  erros.senha = undefined
  bordaDeErroUsername.value = false
  bordaDeErroEmail.value = false
  bannerErro.value = ''
}

function validarCliente(): boolean {
  const emailAparado = email.value.trim()
  if (!emailAparado) {
    erros.email = 'Informe seu e-mail.'
  } else if (emailAparado.length > 254 || !EMAIL_REGEX.test(emailAparado)) {
    erros.email = 'Informe um e-mail válido.'
  }

  const usernameAparado = username.value.trim()
  if (!usernameAparado) {
    erros.username = 'Escolha um nome de usuário.'
  } else if (!USERNAME_REGEX.test(usernameAparado)) {
    erros.username = 'Use de 3 a 30 caracteres, sem espaço: letras, números, ponto ou traço baixo.'
  }

  const displayNameAparado = displayName.value.trim()
  if (!displayNameAparado) {
    erros.displayName = 'Informe seu nome de exibição.'
  } else if (displayNameAparado.length > 60) {
    erros.displayName = 'Use no máximo 60 caracteres.'
  }

  if (!dataNascimento.value) {
    erros.dataNascimento = 'Informe sua data de nascimento.'
  } else if (!maiorDeIdade(dataNascimento.value)) {
    erros.dataNascimento = 'É necessário ter 18 anos ou mais para criar uma conta.'
  }

  if (!senha.value) {
    erros.senha = 'Escolha uma senha.'
  } else if (senha.value.length < 8) {
    erros.senha = 'Use pelo menos 8 caracteres.'
  } else if (senha.value.length > 72) {
    erros.senha = 'A senha pode ter no máximo 72 caracteres.'
  }

  return (
    !erros.email && !erros.username && !erros.displayName && !erros.dataNascimento && !erros.senha
  )
}

function tratarErro(erro: unknown): void {
  if (!(erro instanceof ApiError)) {
    bannerErro.value = 'Não foi possível acessar o servidor. Tente novamente.'
    return
  }
  if (erro.code === 'CONFLITO') {
    bannerErro.value = erro.message
    // O servidor tem três mensagens de conflito possíveis (username, e-mail, ou a genérica de
    // corrida perdida no índice); só sabemos marcar o campo quando a mensagem menciona um deles.
    if (erro.message.includes('usuário')) {
      bordaDeErroUsername.value = true
    } else if (erro.message.includes('e-mail')) {
      bordaDeErroEmail.value = true
    }
    return
  }
  // REQUISICAO_INVALIDA (400) do servidor não distingue qual campo falhou — só uma mensagem
  // genérica. A validação do cliente acima já cobre os casos nomeados no protótipo (senha
  // curta, menor de idade); isto aqui é o retentivo honesto para o que ela não previu.
  bannerErro.value = erro.message
}

/**
 * A chave é da intenção (RNF-ERR-04): o mesmo formulário reenviado repete a chave, e um cadastro
 * que deu certo no servidor mas perdeu a resposta volta como replay, não como `409` de e-mail em
 * uso. Qualquer campo alterado é outra intenção e ganha chave nova.
 */
let ultimaIntencao: { corpo: string; chave: string } | null = null

function chaveDoCadastro(dados: CadastroRequisicao): string {
  const corpo = JSON.stringify(dados)
  if (ultimaIntencao?.corpo !== corpo) {
    ultimaIntencao = { corpo, chave: novaChaveIdempotencia() }
  }
  return ultimaIntencao.chave
}

async function enviar(): Promise<void> {
  limparErros()
  if (!validarCliente()) {
    return
  }

  enviando.value = true
  try {
    const dados = {
      email: email.value.trim(),
      username: username.value.trim(),
      displayName: displayName.value.trim(),
      dataNascimento: dataNascimento.value,
      senha: senha.value,
    }
    const usuarioCriado = await authService.cadastrar(dados, chaveDoCadastro(dados))
    // O cadastro não emite token (RF-AUT-03 é do login). Entrar na sequência é o que faz a tela
    // "sair autenticada, dentro do shell de navegação", como o prompt pede (cadastro.md §1),
    // sem obrigar quem acabou de se cadastrar a preencher a senha de novo.
    const resultado = await authService.entrar({
      identificador: usuarioCriado.username,
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
  <LayoutAutenticacao>
    <div class="md:hidden">
      <LogoLeAi :altura="24" />
    </div>

    <h1 class="mt-space-10 text-display text-tinta md:mt-0">
      Criar conta
    </h1>

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
      @submit.prevent="enviar"
    >
      <fieldset
        :disabled="enviando"
        class="m-0 min-w-0 border-0 p-0"
        :class="enviando ? 'opacity-60' : ''"
      >
        <div class="flex flex-col gap-space-5">
          <CampoTexto
            v-model="email"
            type="email"
            label="E-mail"
            autocomplete="email"
            :erro="erros.email"
            :borda-de-erro="bordaDeErroEmail"
          />
          <CampoTexto
            v-model="username"
            label="Nome de usuário"
            autocomplete="username"
            :erro="erros.username"
            :borda-de-erro="bordaDeErroUsername"
          />
          <CampoTexto
            v-model="displayName"
            label="Nome de exibição"
            autocomplete="name"
            :erro="erros.displayName"
          />
          <CampoTexto
            v-model="dataNascimento"
            type="date"
            label="Data de nascimento"
            autocomplete="bday"
            :erro="erros.dataNascimento"
          />
          <CampoSenha
            v-model="senha"
            label="Senha"
            autocomplete="new-password"
            helper="Mínimo de 8 caracteres"
            :erro="erros.senha"
          />
        </div>
      </fieldset>

      <BotaoPrimario
        tipo="submit"
        class="mt-space-8"
        :carregando="enviando"
      >
        {{ enviando ? 'Criando conta' : 'Criar conta' }}
      </BotaoPrimario>
      <p
        v-if="enviando"
        class="mt-space-3 text-caption text-grafite"
      >
        O servidor está iniciando. Isso pode levar alguns segundos.
      </p>
    </form>

    <p class="mt-space-5 text-body text-grafite">
      Já tem conta?
      <BotaoTextual
        href="/login"
        @click.prevent="router.push('/login')"
      >
        Entrar
      </BotaoTextual>
    </p>
  </LayoutAutenticacao>
</template>
