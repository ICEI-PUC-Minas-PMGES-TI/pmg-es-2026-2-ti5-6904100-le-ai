<script setup lang="ts">
import { PhAt, PhEnvelopeSimple, PhUser } from '@phosphor-icons/vue'
import { nextTick, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import PoliticaPublica from '../../components/auth/PoliticaPublica.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import CampoSenha from '../../components/ui/CampoSenha.vue'
import CampoTexto from '../../components/ui/CampoTexto.vue'
import LogoLeAi from '../../components/ui/LogoLeAi.vue'
import LayoutAutenticacao from '../../layouts/LayoutAutenticacao.vue'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { authService, type CadastroRequisicao } from '../../services/auth'
import { iniciarSessao } from '../../session'
import { SENHAS_DIFERENTES } from './validacaoDeSenha'

/**
 * Cadastro (RF-AUT-01). Layout e cópia de docs/design/periodo-0/P0-NAV/cadastro.md. A coluna
 * ilustrada, o selo e os ícones nos campos vêm do protótipo de F-AUT (desenho aprovado); a
 * validação ao sair do campo foi pedida no teste de aceite de 25/09. As duas divergências do
 * prompt estão registradas em feature-F-AUT.md.
 *
 * Regras de validação do cliente espelham exatamente as do servidor (CadastroRequisicao.java):
 * mesmos campos, mesmas mensagens. "Validação no cliente reforça a do servidor, nunca
 * substitui" (plano da feature) — por isso o servidor ainda é chamado normalmente, e o 409 de
 * conflito só o servidor sabe responder.
 */

const router = useRouter()

// Política de privacidade (RNF-SEC-42) como estado de tela inteira do próprio cadastro, e não
// outra rota: navegar desmontaria o formulário e a pessoa perderia o que digitou. Ao voltar, o
// foco retorna ao link que abriu (cadastro.md §9).
const vendoPolitica = ref(false)
const linkDaPolitica = ref<HTMLAnchorElement | null>(null)

function abrirPolitica(): void {
  vendoPolitica.value = true
}

async function fecharPolitica(): Promise<void> {
  vendoPolitica.value = false
  await nextTick()
  linkDaPolitica.value?.focus()
}

const email = ref('')
const username = ref('')
const displayName = ref('')
const dataNascimento = ref('')
const senha = ref('')
// Confirmação só no cliente (decisão do dono de 25/09, protótipo de F-AUT): não vai no corpo do
// POST /auth/register, que continua o mesmo contrato.
const confirmacaoSenha = ref('')

const erros = reactive<{
  email?: string
  username?: string
  displayName?: string
  dataNascimento?: string
  senha?: string
  confirmacaoSenha?: string
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
  erros.confirmacaoSenha = undefined
  bordaDeErroUsername.value = false
  bordaDeErroEmail.value = false
  bannerErro.value = ''
}

type Campo = 'email' | 'username' | 'displayName' | 'dataNascimento' | 'senha' | 'confirmacaoSenha'

const validadores: Record<Campo, () => string | undefined> = {
  email: () => {
    const aparado = email.value.trim()
    if (!aparado) {
      return 'Informe seu e-mail.'
    }
    return aparado.length > 254 || !EMAIL_REGEX.test(aparado) ? 'Informe um e-mail válido.' : undefined
  },
  username: () => {
    const aparado = username.value.trim()
    if (!aparado) {
      return 'Escolha um nome de usuário.'
    }
    return USERNAME_REGEX.test(aparado)
      ? undefined
      : 'Use de 3 a 30 caracteres, sem espaço: letras, números, ponto ou traço baixo.'
  },
  displayName: () => {
    const aparado = displayName.value.trim()
    if (!aparado) {
      return 'Informe seu nome de exibição.'
    }
    return aparado.length > 60 ? 'Use no máximo 60 caracteres.' : undefined
  },
  dataNascimento: () => {
    if (!dataNascimento.value) {
      return 'Informe sua data de nascimento.'
    }
    return maiorDeIdade(dataNascimento.value)
      ? undefined
      : 'É necessário ter 18 anos ou mais para criar uma conta.'
  },
  senha: () => {
    if (!senha.value) {
      return 'Escolha uma senha.'
    }
    if (senha.value.length < 8) {
      return 'Use pelo menos 8 caracteres.'
    }
    return senha.value.length > 72 ? 'A senha pode ter no máximo 72 caracteres.' : undefined
  },
  // Mesma mensagem de redefinir senha. Com a senha vazia o erro fica só nela, não nas duas.
  confirmacaoSenha: () =>
    senha.value && confirmacaoSenha.value !== senha.value ? SENHAS_DIFERENTES : undefined,
}

const CAMPOS = Object.keys(validadores) as Campo[]

/**
 * Validação ao sair do campo: o erro aparece quando a pessoa deixa o campo, não só no envio.
 * Depois de tocado, o campo revalida a cada digitação, para o erro sumir assim que é corrigido
 * (e não esperar outro blur). O botão continua ativo o tempo todo (cadastro.md §4.1).
 */
const tocados = new Set<Campo>()

function aoSair(campo: Campo): void {
  tocados.add(campo)
  erros[campo] = validadores[campo]()
}

watch([email, username, displayName, dataNascimento, senha, confirmacaoSenha], () => {
  for (const campo of tocados) {
    erros[campo] = validadores[campo]()
  }
})

function validarCliente(): boolean {
  for (const campo of CAMPOS) {
    tocados.add(campo)
    erros[campo] = validadores[campo]()
  }
  return CAMPOS.every((campo) => !erros[campo])
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
  <PoliticaPublica
    v-if="vendoPolitica"
    @voltar="fecharPolitica"
  />
  <LayoutAutenticacao
    v-else
    ilustrada
  >
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
      <!-- Durante o envio o formulário dá lugar a um indicador centralizado, como no protótipo
           (Cadastro · Enviando). Os valores ficam nos refs e voltam se o envio falhar. -->
      <div
        v-if="enviando"
        class="flex justify-center py-space-12"
        aria-hidden="true"
      >
        <span class="size-[36px] animate-spin rounded-full border-3 border-musgo-fundo border-t-musgo motion-reduce:animate-none" />
      </div>
      <fieldset
        v-else
        class="m-0 min-w-0 border-0 p-0"
      >
        <div class="flex flex-col gap-space-5">
          <CampoTexto
            v-model="email"
            type="email"
            label="E-mail"
            autocomplete="email"
            :icone="PhEnvelopeSimple"
            :erro="erros.email"
            :borda-de-erro="bordaDeErroEmail"
            @blur="aoSair('email')"
          />
          <CampoTexto
            v-model="username"
            label="Nome de usuário"
            autocomplete="username"
            :icone="PhAt"
            :erro="erros.username"
            :borda-de-erro="bordaDeErroUsername"
            @blur="aoSair('username')"
          />
          <CampoTexto
            v-model="displayName"
            label="Nome de exibição"
            autocomplete="name"
            :icone="PhUser"
            :erro="erros.displayName"
            @blur="aoSair('displayName')"
          />
          <CampoTexto
            v-model="dataNascimento"
            type="date"
            label="Data de nascimento"
            autocomplete="bday"
            :erro="erros.dataNascimento"
            @blur="aoSair('dataNascimento')"
          />
          <CampoSenha
            v-model="senha"
            label="Senha"
            autocomplete="new-password"
            helper="Mínimo de 8 caracteres"
            com-icone
            :erro="erros.senha"
            @blur="aoSair('senha')"
          />
          <CampoSenha
            v-model="confirmacaoSenha"
            label="Confirmar senha"
            autocomplete="new-password"
            com-icone
            :erro="erros.confirmacaoSenha"
            @blur="aoSair('confirmacaoSenha')"
          />
        </div>
      </fieldset>

      <BotaoPrimario
        tipo="submit"
        class="mt-space-8"
        :carregando="enviando"
        carregando-esmaecido
      >
        {{ enviando ? 'Criando conta' : 'Criar conta' }}
      </BotaoPrimario>
      <p
        v-if="enviando"
        class="mt-space-3 text-center text-caption text-grafite"
      >
        O servidor está iniciando. Isso pode levar alguns segundos.
      </p>
    </form>

    <!-- RNF-SEC-42 (edição de F-AUT, cadastro.md §4): informação, não aceite. Sem checkbox. O link
         fica inline no fim da frase, como no protótipo; o padding vertical só aumenta o alvo de toque. -->
    <p
      class="mt-space-5 text-center text-caption text-grafite md:text-left"
      :class="enviando ? 'pointer-events-none opacity-40' : ''"
    >
      Coletamos o mínimo de dados para manter sua conta. Veja o que guardamos e por quanto tempo na
      <a
        ref="linkDaPolitica"
        href="#politica-de-privacidade"
        class="py-space-3 font-semibold text-musgo underline-offset-2 transition-colors duration-dur-fast hover:underline focus-visible:underline md:py-0"
        :tabindex="enviando ? -1 : undefined"
        @click.prevent="abrirPolitica"
      >Política de privacidade</a>.
    </p>

    <p class="mt-space-5 flex flex-wrap justify-center gap-space-1 text-body text-grafite md:justify-start">
      <span>Já tem conta?</span>
      <BotaoTextual
        class="p-0!"
        href="/login"
        @click.prevent="router.push('/login')"
      >
        Entrar
      </BotaoTextual>
    </p>
  </LayoutAutenticacao>
</template>
