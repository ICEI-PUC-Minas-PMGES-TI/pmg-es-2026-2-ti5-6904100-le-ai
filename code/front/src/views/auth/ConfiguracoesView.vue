<script setup lang="ts">
import { PhCaretRight, PhSignOut } from '@phosphor-icons/vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import PoliticaDePrivacidade from '../../components/auth/PoliticaDePrivacidade.vue'
import BotaoDestrutivo from '../../components/ui/BotaoDestrutivo.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import LinhaUsarLeituras from '../../components/auth/LinhaUsarLeituras.vue'
import { usePreferenciaDeSugestoes } from '../../recomendacoes/usePreferenciaDeSugestoes'
import { authService, type UsuarioProprio } from '../../services/auth'
import { useSession } from '../../session'

/**
 * Configurações (RF-AUT-06, acesso a RF-AUT-05 e RNF-SEC-42). Layout e cópia do protótipo de
 * docs/design/periodo-1/F-AUT/configuracoes: lista de linhas no mobile, duas colunas na web com a
 * política aberta à direita.
 *
 * **E-mail na identificação** vem de `GET /me`, que devolve o e-mail só ao próprio dono (decisão
 * de 25/09/2026): a sessão guarda id, username e nome, e não o e-mail. Enquanto a resposta não
 * chega, o bloco é o skeleton de três barras do protótipo; se ela falhar, ficam nome e username
 * da sessão, sem o e-mail.
 *
 * Sair sempre funciona do lado do navegador (§4.3): a revogação no servidor é melhor esforço, e
 * a tela vai ao login sem mostrar erro.
 */

const VERSAO_DO_APP = '1.0.0'

/** Itens da coluna esquerda da web que abrem um painel à direita, entre `Alterar senha` e `Excluir conta`. */
const ITENS_DO_PAINEL = [
  { id: 'sugestoes', rotulo: 'Leituras em sugestões' },
  { id: 'politica', rotulo: 'Política de privacidade' },
] as const

const EDITAR_PERFIL = '/perfil/editar'

const router = useRouter()
const { usuario, ehAdmin } = useSession()

const conta = ref<UsuarioProprio | null>(null)
const carregandoConta = ref(true)
const identificacao = computed(() => conta.value ?? usuario.value)

// F-REC-ALG: o opt-out das sugestões. Na web, o item `Leituras em sugestões` troca o painel da
// coluna direita, que abre com a política, como antes.
const preferencia = usePreferenciaDeSugestoes()
const painel = ref<'politica' | 'sugestoes'>('politica')

onMounted(async () => {
  void preferencia.carregar()
  try {
    conta.value = await authService.buscarUsuarioAtual()
  } catch {
    // Sem o e-mail, a identificação fica com o que a sessão já sabe.
  } finally {
    carregandoConta.value = false
  }
})

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
  <div class="pb-space-10 pt-space-6 md:grid md:grid-cols-[320px_minmax(0,720px)] md:gap-space-12 md:pt-space-10">
    <div>
      <!-- Identificação: sem avatar, que é do perfil (§4). -->
      <div
        v-if="!carregandoConta && identificacao"
        class="border-b border-linha pb-space-6 md:border-0 md:pb-0"
      >
        <p class="text-title-sm text-tinta">
          {{ identificacao.displayName }}
        </p>
        <p class="mt-0.5 text-caption text-grafite-suave">
          @{{ identificacao.username }}
        </p>
        <p
          v-if="conta?.email"
          class="mt-space-1 break-all text-caption text-grafite"
        >
          {{ conta.email }}
        </p>
      </div>
      <div
        v-else
        class="flex flex-col gap-space-2 border-b border-linha pb-space-6 md:border-0 md:pb-0"
        aria-busy="true"
        aria-label="Carregando conta"
      >
        <span class="h-[17px] w-[45%] rounded-sm bg-capa-placeholder" />
        <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
        <span class="h-[13px] w-[55%] rounded-sm bg-capa-placeholder" />
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
        <LinhaUsarLeituras
          :usar="preferencia.usar.value"
          :salvando="preferencia.salvando.value"
          :erro="preferencia.erro.value"
          :desabilitada="saindo"
          descricao="Os livros que você lê ajudam a sugerir leituras para quem segue você. Seu perfil continua como está."
          @alternar="preferencia.alternar()"
        />
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
        <!-- F-CONTA-2: sem `rubi` e sem ícone; a ação destrutiva é o botão lá dentro (§4). -->
        <RouterLink
          to="/perfil/configuracoes/excluir-conta"
          class="flex h-14 items-center justify-between border-b border-linha text-body text-tinta"
        >
          Excluir conta
          <PhCaretRight
            :size="20"
            weight="regular"
            class="text-grafite-suave"
            aria-hidden="true"
          />
        </RouterLink>
        <!-- F-MOD: abaixo de 768px a barra inferior não tem o quinto item; a moderação entra
             aqui, só para o administrador (divergência registrada na feature, sem design). -->
        <template v-if="ehAdmin">
          <h2 class="mt-space-4 pb-space-3 text-label text-grafite">
            Administração
          </h2>
          <RouterLink
            to="/moderacao"
            class="flex h-14 items-center justify-between border-b border-linha text-body text-tinta"
          >
            Moderação
            <PhCaretRight
              :size="20"
              weight="regular"
              class="text-grafite-suave"
              aria-hidden="true"
            />
          </RouterLink>
        </template>
      </nav>

      <!-- Web: navegação da coluna esquerda, com a política aberta ao lado. -->
      <nav
        class="mt-space-8 hidden flex-col gap-space-1 md:flex"
        aria-label="Configurações"
      >
        <RouterLink
          to="/perfil/configuracoes/alterar-senha"
          class="flex h-11 items-center rounded-base px-space-4 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        >
          Alterar senha
        </RouterLink>
        <button
          v-for="item in ITENS_DO_PAINEL"
          :key="item.id"
          type="button"
          class="flex h-11 items-center rounded-base px-space-4 text-left text-body-strong transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
          :class="painel === item.id ? 'bg-musgo-fundo text-musgo' : 'text-tinta hover:bg-linha'"
          :aria-current="painel === item.id ? 'page' : undefined"
          @click="painel = item.id"
        >
          {{ item.rotulo }}
        </button>
        <RouterLink
          to="/perfil/configuracoes/excluir-conta"
          class="flex h-11 items-center rounded-base px-space-4 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        >
          Excluir conta
        </RouterLink>
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
        class="mt-space-3 text-center text-caption text-grafite md:text-left"
      >
        O servidor está iniciando. Isso pode levar alguns segundos.
      </p>
      <p class="mt-space-6 text-center text-caption text-grafite-suave md:text-left">
        Lê Ai · versão {{ VERSAO_DO_APP }}
      </p>
    </div>

    <div class="hidden md:block">
      <PoliticaDePrivacidade v-if="painel === 'politica'" />
      <section
        v-else
        aria-labelledby="titulo-leituras-em-sugestoes"
      >
        <h2
          id="titulo-leituras-em-sugestoes"
          class="text-title-lg text-tinta"
        >
          Leituras em sugestões
        </h2>
        <p class="mt-space-3 max-w-[640px] text-body text-grafite">
          Quando alguém que segue você abre Descobrir, uma das sugestões é a de livros que pessoas que ela segue
          leram. Seus livros lidos entram nessa conta.
        </p>
        <LinhaUsarLeituras
          class="mt-space-6"
          variante="web"
          :usar="preferencia.usar.value"
          :salvando="preferencia.salvando.value"
          :erro="preferencia.erro.value"
          :desabilitada="saindo"
          descricao="Desligado, suas leituras deixam de contar nas sugestões de outros leitores."
          @alternar="preferencia.alternar()"
        />
        <p class="mt-space-4 text-caption text-grafite">
          Isso não muda quem vê seu perfil e não desliga as sugestões que você recebe. Para deixar o perfil
          <!-- Quebrar a linha antes do ponto o separaria do link por um espaço. -->
          <!-- eslint-disable-next-line vue/singleline-html-element-content-newline, vue/max-attributes-per-line -->
          privado, use <RouterLink :to="EDITAR_PERFIL" class="text-musgo hover:underline focus-visible:underline">Editar perfil</RouterLink>.
        </p>
      </section>
    </div>

    <DialogoConfirmacao
      :aberta="confirmandoSaida"
      compacto
      titulo="Sair da conta?"
      rotulo-confirmar="Sair"
      @confirmar="sair"
      @cancelar="confirmandoSaida = false"
    >
      Você vai precisar entrar de novo neste aparelho. Seus livros, leituras e resenhas continuam salvos.
    </DialogoConfirmacao>
  </div>
</template>
