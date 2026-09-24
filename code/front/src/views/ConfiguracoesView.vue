<script setup lang="ts">
import { PhCaretRight, PhSignOut } from '@phosphor-icons/vue'
import { nextTick, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import PoliticaDePrivacidade from '../components/PoliticaDePrivacidade.vue'
import BotaoDestrutivo from '../components/ui/BotaoDestrutivo.vue'
import DialogoConfirmacao from '../components/ui/DialogoConfirmacao.vue'
import { authService } from '../services/auth'
import { useSession } from '../session'

/**
 * Configurações (RF-AUT-06, acesso a RF-AUT-05 e RNF-SEC-42). Layout e cópia de
 * docs/design/periodo-1/F-AUT/configuracoes.md: lista de linhas no mobile, duas colunas na web
 * com a política aberta à direita.
 *
 * **Sem e-mail no bloco de identificação**, diferente do protótipo: nenhuma resposta do
 * `identidade` expõe o e-mail (o schema `Usuario` diz que ele nunca vem), e a sessão só guarda
 * id, username e nome. Mostrar exigiria mudar o contrato; fica registrado como divergência.
 *
 * Sair sempre funciona do lado do navegador (§4.3): a revogação no servidor é melhor esforço, e
 * a tela vai ao login sem mostrar erro.
 */

const VERSAO_DO_APP = '1.0.0'

const router = useRouter()
const { usuario } = useSession()

const confirmandoSaida = ref(false)
const saindo = ref(false)

async function sair(): Promise<void> {
  confirmandoSaida.value = false
  saindo.value = true
  await authService.sair()
  // A sessão acabou e `reagirAoFimDaSessao` já pediu o login com `?destino=`. Saída voluntária
  // não volta para cá depois de entrar: esta navegação substitui aquela.
  await nextTick()
  await router.replace('/login')
}
</script>

<template>
  <div class="pb-space-10 pt-space-6 md:grid md:grid-cols-[320px_minmax(0,720px)] md:gap-space-12">
    <div>
      <!-- Identificação: sem avatar, que é do perfil (§4). -->
      <div
        v-if="usuario"
        class="border-b border-linha pb-space-6 md:border-0"
      >
        <p class="text-title-sm text-tinta">
          {{ usuario.displayName }}
        </p>
        <p class="text-caption text-grafite-suave">
          @{{ usuario.username }}
        </p>
      </div>
      <div
        v-else
        class="flex flex-col gap-space-2 border-b border-linha pb-space-6 md:border-0"
        aria-hidden="true"
      >
        <span class="h-[17px] w-[45%] rounded-sm bg-capa-placeholder" />
        <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
      </div>

      <!-- Mobile: dois grupos de linhas de 56px. -->
      <nav
        class="md:hidden"
        aria-label="Configurações"
      >
        <h2 class="mt-space-4 pb-space-3 text-label text-grafite">
          Conta
        </h2>
        <RouterLink
          to="/perfil/configuracoes/alterar-senha"
          class="flex h-14 items-center justify-between border-b border-linha text-body text-tinta"
        >
          Alterar senha
          <PhCaretRight
            :size="20"
            weight="regular"
            class="text-grafite-suave"
            aria-hidden="true"
          />
        </RouterLink>
        <h2 class="mt-space-4 pb-space-3 text-label text-grafite">
          Privacidade e dados
        </h2>
        <RouterLink
          to="/perfil/configuracoes/privacidade"
          class="flex h-14 items-center justify-between border-b border-linha text-body text-tinta"
        >
          Política de privacidade
          <PhCaretRight
            :size="20"
            weight="regular"
            class="text-grafite-suave"
            aria-hidden="true"
          />
        </RouterLink>
      </nav>

      <!-- Web: navegação da coluna esquerda, com a política aberta ao lado. -->
      <nav
        class="mt-space-6 hidden flex-col gap-space-1 md:flex"
        aria-label="Configurações"
      >
        <RouterLink
          to="/perfil/configuracoes/alterar-senha"
          class="flex h-11 items-center rounded-base px-space-4 text-body-strong text-grafite transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        >
          Alterar senha
        </RouterLink>
        <span
          class="flex h-11 items-center rounded-base bg-musgo-fundo px-space-4 text-body-strong text-musgo"
          aria-current="page"
        >
          Política de privacidade
        </span>
      </nav>

      <BotaoDestrutivo
        class="mt-space-8 h-12 w-full gap-space-2 md:h-10"
        :carregando="saindo"
        @click="confirmandoSaida = true"
      >
        <PhSignOut
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        {{ saindo ? 'Saindo' : 'Sair da conta' }}
      </BotaoDestrutivo>
      <p
        v-if="saindo"
        class="mt-space-3 text-caption text-grafite"
      >
        O servidor está iniciando. Isso pode levar alguns segundos.
      </p>
      <p class="mt-space-6 text-center text-caption text-grafite-suave">
        Lê Ai · versão {{ VERSAO_DO_APP }}
      </p>
    </div>

    <div class="hidden md:block">
      <PoliticaDePrivacidade />
    </div>

    <DialogoConfirmacao
      :aberta="confirmandoSaida"
      titulo="Sair da conta?"
      rotulo-confirmar="Sair"
      @confirmar="sair"
      @cancelar="confirmandoSaida = false"
    >
      Você vai precisar entrar de novo neste aparelho. Seus livros, leituras e resenhas continuam salvos.
    </DialogoConfirmacao>
  </div>
</template>
