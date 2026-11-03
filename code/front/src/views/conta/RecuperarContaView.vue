<script setup lang="ts">
import { PhCheckCircle, PhWarning } from '@phosphor-icons/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import EstadoTerminal from '../../components/ui/EstadoTerminal.vue'
import LogoLeAi from '../../components/ui/LogoLeAi.vue'
import {
  acessoDeRecuperacao,
  dataPorExtenso,
  descartarAcessoDeRecuperacao,
  diasAte,
  textoDosDias,
} from '../../contaEmExclusao'
import LayoutAutenticacao from '../../layouts/LayoutAutenticacao.vue'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { authService } from '../../services/auth'

/**
 * Recuperar conta (F-CONTA-2, RN-23.3 e 23.4). Layout e cópia de
 * docs/design/periodo-2/F-CONTA-2/recuperar-conta.md. Fora do shell: o acesso de recuperação só
 * cancela a exclusão. Ele vive em memória (`contaEmExclusao.ts`); sem ele, a tela manda ao login.
 */

const router = useRouter()
const acesso = acessoDeRecuperacao()

onMounted(() => {
  if (acesso === null) {
    void router.replace('/login')
  }
})

const dataDaRemocao = acesso ? dataPorExtenso(acesso.exclusaoPrevistaEm) : ''
const dias = acesso ? diasAte(acesso.exclusaoPrevistaEm) : 0

const cancelando = ref(false)
const estado = ref<'pendente' | 'erro' | 'expirado' | 'recuperada'>('pendente')
const chave = novaChaveIdempotencia()

const prazoTerminando = computed(() => dias === 1)

async function cancelar(): Promise<void> {
  if (acesso === null) {
    return
  }
  cancelando.value = true
  try {
    // A mesma chave em toda tentativa: repetir depois de um erro não cria dois pedidos.
    await authService.cancelarExclusao(acesso.accessToken, chave)
    descartarAcessoDeRecuperacao()
    estado.value = 'recuperada'
  } catch (falha) {
    if (falha instanceof ApiError && falha.status === 401) {
      descartarAcessoDeRecuperacao()
      estado.value = 'expirado'
    } else {
      estado.value = 'erro'
    }
  } finally {
    cancelando.value = false
  }
}

/** Sair não pede confirmação: a exclusão já estava agendada (§9). */
function irParaOLogin(): void {
  descartarAcessoDeRecuperacao()
  void router.replace('/login')
}
</script>

<template>
  <LayoutAutenticacao somente-marca>
    <div class="md:hidden">
      <LogoLeAi :altura="24" />
    </div>

    <EstadoTerminal
      v-if="estado === 'recuperada'"
      class="mt-space-16 md:mt-0"
      :icone="PhCheckCircle"
      titulo="Conta recuperada"
      acoes-a-esquerda-na-web
    >
      <p>A exclusão foi cancelada. Seu perfil e tudo o que você registrou voltaram a aparecer para os outros leitores, do jeito que estavam.</p>
      <p>Entre de novo para continuar.</p>
      <template #acoes>
        <BotaoPrimario @click="irParaOLogin">
          Entrar
        </BotaoPrimario>
      </template>
    </EstadoTerminal>

    <section
      v-else-if="acesso"
      class="mt-space-12 md:mt-0"
    >
      <h1 class="text-display text-tinta">
        Sua conta está em exclusão
      </h1>
      <p class="mt-space-3 text-body text-grafite">
        {{ acesso.nomeExibicao }} · @{{ acesso.username }}
      </p>

      <div
        class="mt-space-6 rounded-md bg-papel-elevado p-space-5"
        :aria-label="`Remoção definitiva em ${dataDaRemocao}, ${textoDosDias(dias).toLowerCase()}.`"
      >
        <p class="text-label text-grafite">
          Remoção definitiva em
        </p>
        <p class="mt-space-2 text-title text-tinta">
          {{ dataDaRemocao }}
        </p>
        <p class="mt-space-2 text-caption text-grafite">
          {{ textoDosDias(dias) }}
        </p>
      </div>

      <p
        v-if="prazoTerminando"
        class="mt-space-5 flex items-start gap-space-3 rounded-base bg-ambar-fundo p-space-4 text-body text-tinta"
      >
        <PhWarning
          :size="20"
          weight="regular"
          class="mt-0.5 shrink-0 text-ambar"
          aria-hidden="true"
        />
        Depois de {{ dataDaRemocao }} não será mais possível recuperar a conta.
      </p>

      <p class="mt-space-6 text-body text-grafite">
        Nada foi apagado ainda. Enquanto a exclusão estiver pendente, seu perfil, sua estante e suas resenhas ficam ocultos para os outros leitores.
      </p>
      <p class="mt-space-4 text-body text-grafite">
        Cancele para que tudo volte como estava.
      </p>

      <BannerAviso
        v-if="estado === 'erro'"
        variante="erro"
        class="mt-space-8"
      >
        Não foi possível cancelar a exclusão. Ela continua agendada. Verifique sua conexão e tente de novo.
      </BannerAviso>
      <BannerAviso
        v-else-if="estado === 'expirado'"
        variante="alerta"
        class="mt-space-8"
      >
        Seu acesso para cancelar expirou. Entre de novo para cancelar a exclusão.
      </BannerAviso>

      <BotaoPrimario
        v-if="estado === 'expirado'"
        class="mt-space-5"
        @click="irParaOLogin"
      >
        Entrar de novo
      </BotaoPrimario>
      <template v-else>
        <BotaoPrimario
          :class="estado === 'erro' ? 'mt-space-5' : 'mt-space-8'"
          :carregando="cancelando"
          carregando-esmaecido
          @click="cancelar"
        >
          {{ cancelando ? 'Cancelando' : 'Cancelar exclusão' }}
        </BotaoPrimario>
        <p
          v-if="cancelando"
          class="mt-space-3 text-center text-caption text-grafite"
        >
          O servidor está iniciando. Isso pode levar alguns segundos.
        </p>
        <div
          class="mt-space-5 flex flex-col items-center gap-space-2"
          :class="cancelando ? 'pointer-events-none opacity-50' : ''"
        >
          <BotaoTextual
            class="min-h-12 md:min-h-10"
            tom="grafite"
            :disabled="cancelando"
            @click="irParaOLogin"
          >
            Sair
          </BotaoTextual>
          <p class="text-caption text-grafite">
            Se você sair, a exclusão continua agendada.
          </p>
        </div>
      </template>
    </section>
  </LayoutAutenticacao>
</template>
