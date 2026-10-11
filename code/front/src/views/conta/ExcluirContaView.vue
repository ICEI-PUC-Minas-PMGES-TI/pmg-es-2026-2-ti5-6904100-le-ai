<script setup lang="ts">
import { PhAt, PhClockCounterClockwise, PhEyeSlash, PhInfo, PhTrash } from '@phosphor-icons/vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoDestrutivo from '../../components/ui/BotaoDestrutivo.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import CampoSenha from '../../components/ui/CampoSenha.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import { dataLimiteAPartirDeHoje, dataPorExtenso } from '../../contaEmExclusao'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { authService } from '../../services/auth'
import { encerrarSessao, useSession } from '../../session'

/**
 * Excluir conta (F-CONTA-2, RF-AUT-07). Layout e cópia de
 * docs/design/periodo-2/F-CONTA-2/excluir-conta.md. Três travas antes do pedido: senha, caixa de
 * confirmação e o dialog destrutivo. A data limite é calculada no aparelho (hoje mais 30 dias)
 * antes do pedido; a tela final mostra a que o servidor devolveu.
 *
 * Ao receber o `202`, a sessão local é apagada **antes** de mostrar `Exclusão solicitada`, e a
 * navegação substitui o histórico: voltar não reabre tela autenticada (§9).
 */

const router = useRouter()
const { usuario } = useSession()

const email = ref<string | null>(null)
onMounted(async () => {
  try {
    email.value = (await authService.buscarUsuarioAtual()).email
  } catch {
    // Sem o e-mail, a consequência 4 fala só do nome de usuário.
  }
})

const dataLimite = dataPorExtenso(dataLimiteAPartirDeHoje())

const senha = ref('')
const entendeu = ref(false)
const confirmando = ref(false)
const excluindo = ref(false)
const erro = ref<'senha' | 'limite' | 'envio' | null>(null)

// A mesma chave enquanto a intenção for a mesma: reenviar depois de um erro não cria dois pedidos.
let ultimaIntencao: { senha: string; chave: string } | null = null
function chaveDaIntencao(): string {
  if (ultimaIntencao?.senha !== senha.value) {
    ultimaIntencao = { senha: senha.value, chave: novaChaveIdempotencia() }
  }
  return ultimaIntencao.chave
}

const podeExcluir = computed(
  () => senha.value.length > 0 && entendeu.value && erro.value !== 'limite' && !excluindo.value,
)

const identificadores = computed(() => {
  const username = usuario.value ? `@${usuario.value.username}` : 'seu nome de usuário'
  return email.value ? `${username} e ${email.value}` : username
})

function aoDigitar(): void {
  if (erro.value === 'senha') {
    erro.value = null
  }
}

async function excluir(): Promise<void> {
  confirmando.value = false
  excluindo.value = true
  erro.value = null
  try {
    const resposta = await authService.solicitarExclusao(senha.value, chaveDaIntencao())
    // O servidor já revogou as renovações; aqui some o que restou neste navegador.
    encerrarSessao()
    // `reagirAoFimDaSessao` pede o login ao ver a sessão acabar; esta navegação substitui aquela.
    await nextTick()
    await router.replace({
      path: '/conta/exclusao-solicitada',
      query: { ate: resposta.exclusaoPrevistaEm },
    })
  } catch (falha) {
    if (falha instanceof ApiError && falha.status === 422) {
      erro.value = 'senha'
      senha.value = ''
    } else if (falha instanceof ApiError && falha.status === 429) {
      erro.value = 'limite'
    } else {
      erro.value = 'envio'
    }
  } finally {
    excluindo.value = false
  }
}

function voltar(): void {
  void router.push('/perfil/configuracoes')
}
</script>

<template>
  <div class="max-w-[560px] pb-space-10 pt-space-6 md:pt-space-10">
    <h2 class="hidden text-title-lg text-tinta md:block">
      Excluir sua conta
    </h2>
    <p class="text-body-lg text-tinta md:mt-space-4">
      Você pode pedir a exclusão agora e mudar de ideia em até 30 dias.
    </p>

    <ul class="mt-space-6 flex flex-col gap-space-5">
      <li class="flex gap-space-3">
        <PhEyeSlash
          :size="20"
          weight="regular"
          class="mt-0.5 shrink-0 text-grafite"
          aria-hidden="true"
        />
        <div>
          <p class="text-body-strong text-tinta">
            Oculta a partir de agora
          </p>
          <p class="mt-space-1 text-body text-grafite">
            Seu perfil, sua estante, suas resenhas, frases, comentários e listas deixam de aparecer para os outros leitores assim que você confirmar. Nada é apagado neste momento.
          </p>
        </div>
      </li>
      <li class="flex gap-space-3">
        <PhClockCounterClockwise
          :size="20"
          weight="regular"
          class="mt-0.5 shrink-0 text-grafite"
          aria-hidden="true"
        />
        <div>
          <p class="text-body-strong text-tinta">
            30 dias para voltar atrás
          </p>
          <p class="mt-space-1 text-body text-grafite">
            Até {{ dataLimite }}, basta entrar com seu e-mail e senha para cancelar a exclusão. Tudo volta como estava.
          </p>
        </div>
      </li>
      <li class="flex gap-space-3">
        <PhTrash
          :size="20"
          weight="regular"
          class="mt-0.5 shrink-0 text-grafite"
          aria-hidden="true"
        />
        <div>
          <p class="text-body-strong text-tinta">
            Depois do prazo, é definitivo
          </p>
          <p class="mt-space-1 text-body text-grafite">
            Sua conta e tudo o que você registrou, como leituras, progresso, notas, resenhas, desafios e quem você segue, são apagados e não podem ser recuperados.
          </p>
        </div>
      </li>
      <li class="flex gap-space-3">
        <PhAt
          :size="20"
          weight="regular"
          class="mt-0.5 shrink-0 text-grafite"
          aria-hidden="true"
        />
        <div>
          <p class="text-body-strong text-tinta">
            Nome de usuário e e-mail reservados
          </p>
          <p class="mt-space-1 break-words text-body text-grafite">
            Durante os 30 dias, {{ identificadores }} continuam ligados a esta conta e não podem ser usados em outra.
          </p>
        </div>
      </li>
    </ul>

    <!-- Separa entender o que acontece de provar quem você é e confirmar (§4, item 4). -->
    <hr class="my-space-8 border-0 border-t border-linha">

    <form
      novalidate
      @submit.prevent="confirmando = podeExcluir"
    >
      <BannerAviso
        v-if="erro === 'senha'"
        variante="erro"
        class="mb-space-6"
      >
        Senha incorreta. Sua conta continua como estava.
      </BannerAviso>
      <BannerAviso
        v-else-if="erro === 'limite'"
        variante="alerta"
        class="mb-space-6"
      >
        Muitas tentativas com a senha errada. Espere alguns minutos para tentar de novo.
      </BannerAviso>

      <fieldset
        :disabled="excluindo"
        class="m-0 min-w-0 border-0 p-0"
        :class="excluindo ? 'opacity-50' : ''"
      >
        <CampoSenha
          v-model="senha"
          class="md:max-w-[400px]"
          label="Senha atual"
          autocomplete="current-password"
          helper="Para confirmar que é você quem está pedindo."
          :borda-de-erro="erro === 'senha'"
          :disabled="erro === 'limite'"
          @update:model-value="aoDigitar"
        />

        <label class="mt-space-6 flex min-h-12 cursor-pointer items-start gap-space-3 text-body text-tinta">
          <input
            v-model="entendeu"
            type="checkbox"
            class="mt-0.5 size-5 shrink-0 cursor-pointer rounded-sm accent-musgo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
          >
          Entendi que, depois de {{ dataLimite }}, a exclusão não pode ser desfeita.
        </label>
      </fieldset>

      <p class="mt-space-5 flex items-start gap-space-2 text-caption text-grafite">
        <PhInfo
          :size="16"
          weight="regular"
          class="mt-0.5 shrink-0"
          aria-hidden="true"
        />
        Ao confirmar, você sai do aplicativo neste e em todos os outros aparelhos.
      </p>

      <BannerAviso
        v-if="erro === 'envio'"
        variante="erro"
        class="mt-space-8"
      >
        Não foi possível pedir a exclusão. Sua conta continua como estava. Verifique sua conexão e tente de novo.
      </BannerAviso>

      <div
        class="flex flex-col gap-space-4 md:flex-row md:items-center"
        :class="erro === 'envio' ? 'mt-space-5' : 'mt-space-8'"
      >
        <BotaoDestrutivo
          type="submit"
          class="h-12 w-full md:h-10 md:w-auto md:px-space-5"
          :carregando="excluindo"
          :disabled="!podeExcluir"
        >
          {{ excluindo ? 'Excluindo' : 'Excluir conta' }}
        </BotaoDestrutivo>
        <BotaoTextual
          class="min-h-12 self-center md:min-h-10 md:px-space-3"
          tom="grafite"
          :disabled="excluindo"
          @click="voltar"
        >
          Cancelar
        </BotaoTextual>
      </div>
      <p
        v-if="excluindo"
        class="mt-space-3 text-center text-caption text-grafite md:text-left"
      >
        O servidor está iniciando. Isso pode levar alguns segundos.
      </p>
    </form>

    <DialogoConfirmacao
      :aberta="confirmando"
      titulo="Excluir sua conta?"
      rotulo-confirmar="Excluir conta"
      @confirmar="excluir"
      @cancelar="confirmando = false"
    >
      Sua conta fica oculta a partir de agora e é apagada definitivamente em {{ dataLimite }}. Até lá, você pode cancelar entrando de novo.
    </DialogoConfirmacao>
  </div>
</template>
