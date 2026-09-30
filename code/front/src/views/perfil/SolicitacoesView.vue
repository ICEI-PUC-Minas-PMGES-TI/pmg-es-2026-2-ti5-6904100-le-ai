<script setup lang="ts">
import { PhCheck, PhUserPlus } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import FimDaLista from '../../components/perfil/FimDaLista.vue'
import LinhaDeLeitor from '../../components/perfil/LinhaDeLeitor.vue'
import SkeletonDeLeitor from '../../components/perfil/SkeletonDeLeitor.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import { contagem, primeiroNome, tempoDeEspera } from '../../perfil/textos'
import { usePaginacao } from '../../perfil/usePaginacao'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { perfilService, type Privacidade, type SolicitacaoSeguir } from '../../services/perfil'

/**
 * Solicitações de seguir recebidas (RF-SOC-06), a partir de
 * docs/design/periodo-1/F-PERFIL/solicitacoes-de-seguir.md. Na web é o único lugar de resposta,
 * porque o cliente web não tem notificações (REQUISITOS.md §2.1).
 *
 * Aceitar não pede confirmação: tem desfazer, que é remover a pessoa dos seguidores. Recusar
 * descarta o pedido e passa pelo modal (RNF-USA-04). O item aceito mostra `Aceito` por um
 * instante e sai da lista; a contagem acompanha.
 */
const PERMANENCIA_DO_ACEITO_MS = 900

const pedidos = usePaginacao((pagina) => perfilService.listarSolicitacoes(pagina))
const privacidade = ref<Privacidade | null>(null)

onMounted(() => {
  void pedidos.carregar()
  perfilService
    .obterMeuPerfil()
    .then((perfil) => {
      privacidade.value = perfil.privacidade
    })
    .catch(() => {
      // Só escolhe o texto do vazio; sem ele fica a variante de perfil privado.
    })
})

const aceitos = reactive(new Set<string>())
const aceitando = reactive(new Set<string>())
const erros = reactive(new Map<string, string>())
const timers: ReturnType<typeof setTimeout>[] = []

onBeforeUnmount(() => timers.forEach(clearTimeout))

/** Aceito ainda na tela não conta: a contagem já mudou quando o item mudou (§4.3). */
const pendentes = computed(() => Math.max(0, pedidos.total.value - aceitos.size))

function mensagemDe(erro: unknown): string {
  return erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
}

async function aceitar(pedido: SolicitacaoSeguir): Promise<void> {
  aceitando.add(pedido.id)
  erros.delete(pedido.id)
  try {
    await perfilService.aceitarSolicitacao(pedido.id, novaChaveIdempotencia())
    aceitos.add(pedido.id)
    timers.push(
      setTimeout(() => {
        aceitos.delete(pedido.id)
        pedidos.retirar(pedido.id)
      }, PERMANENCIA_DO_ACEITO_MS),
    )
  } catch (erro) {
    if (erro instanceof ApiError && (erro.status === 404 || erro.status === 409)) {
      // Já respondido em outra aba, ou a conta de quem pediu saiu: não há mais o que decidir.
      pedidos.retirar(pedido.id)
    } else {
      erros.set(pedido.id, mensagemDe(erro))
    }
  } finally {
    aceitando.delete(pedido.id)
  }
}

const recusando = ref<SolicitacaoSeguir | null>(null)
const processandoRecusa = ref(false)
const erroDaRecusa = ref<string | null>(null)

async function recusar(): Promise<void> {
  const pedido = recusando.value
  if (!pedido) {
    return
  }
  processandoRecusa.value = true
  erroDaRecusa.value = null
  try {
    await perfilService.recusarSolicitacao(pedido.id, novaChaveIdempotencia())
    pedidos.retirar(pedido.id)
    recusando.value = null
  } catch (erro) {
    if (erro instanceof ApiError && (erro.status === 404 || erro.status === 409)) {
      pedidos.retirar(pedido.id)
      recusando.value = null
    } else {
      erroDaRecusa.value = mensagemDe(erro)
    }
  } finally {
    processandoRecusa.value = false
  }
}
</script>

<template>
  <div class="flex min-h-full max-w-[720px] flex-col pb-space-10 pt-space-4">
    <ul
      v-if="pedidos.carregando.value"
      aria-busy="true"
      aria-label="Carregando solicitações"
      class="md:flex md:flex-col md:gap-space-3"
    >
      <li
        v-for="n in 3"
        :key="n"
        class="flex flex-col gap-space-3 border-b border-linha py-space-4 md:flex-row md:items-center md:rounded-base md:border md:p-space-4"
      >
        <SkeletonDeLeitor />
        <span class="flex shrink-0 justify-end gap-space-3">
          <span class="h-10 w-24 rounded-base bg-capa-placeholder md:h-9" />
          <span class="h-10 w-24 rounded-full bg-capa-placeholder md:h-9" />
        </span>
      </li>
    </ul>

    <BannerAviso
      v-else-if="pedidos.falhou.value"
      variante="erro"
      triangulo
    >
      Não foi possível carregar suas solicitações. Verifique sua conexão e tente de novo.
      <BotaoTextual
        class="mt-space-2"
        @click="pedidos.carregar()"
      >
        Tentar de novo
      </BotaoTextual>
    </BannerAviso>

    <EstadoVazio
      v-else-if="pedidos.itens.value.length === 0"
      :icone="PhUserPlus"
      solto
      titulo="Nenhuma solicitação pendente"
      class="m-auto py-space-10"
    >
      <template v-if="privacidade === 'publico'">
        <p class="mt-space-3 max-w-[300px] text-body text-grafite">
          Seu perfil é público, então quem quiser seguir você segue na hora. Pedidos só existem em perfil privado.
        </p>
        <RouterLink
          to="/perfil/editar"
          class="mt-space-6 flex min-h-12 items-center text-body-strong text-musgo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:min-h-10"
        >
          Editar perfil
        </RouterLink>
      </template>
      <p
        v-else
        class="mt-space-3 max-w-[300px] text-body text-grafite"
      >
        Pedidos para seguir seu perfil privado aparecem aqui.
      </p>
    </EstadoVazio>

    <template v-else>
      <div
        class="border-b border-linha pb-space-4 md:border-b-0 md:pb-space-2"
        aria-live="polite"
      >
        <p class="text-caption text-grafite">
          {{ contagem(pendentes, 'solicitação', 'solicitações') }}
        </p>
        <p class="mt-space-1 text-caption text-grafite">
          Quem você aceitar passa a ver sua estante, suas notas e suas resenhas.
        </p>
      </div>

      <ul class="md:mt-space-4 md:flex md:flex-col md:gap-space-3">
        <li
          v-for="pedido in pedidos.itens.value"
          :key="pedido.id"
          class="flex flex-col gap-space-3 border-b border-linha py-space-4 transition-opacity duration-dur-fast md:flex-row md:items-center md:rounded-base md:border md:p-space-4 md:hover:bg-papel-elevado"
          :class="{ 'opacity-60': aceitos.has(pedido.id) }"
        >
          <LinhaDeLeitor
            class="min-w-0 flex-1"
            :leitor="pedido.solicitante"
          >
            <span class="shrink-0 self-start text-caption text-grafite-suave md:self-center">
              {{ tempoDeEspera(pedido.criadaEm) }}
            </span>
          </LinhaDeLeitor>

          <p
            v-if="aceitos.has(pedido.id)"
            class="flex items-center justify-end gap-space-1 text-caption font-semibold text-musgo"
            role="status"
          >
            <PhCheck
              :size="16"
              weight="bold"
              aria-hidden="true"
            />
            Aceito
          </p>
          <div
            v-else
            class="flex justify-end gap-space-3"
          >
            <button
              type="button"
              class="h-10 rounded-base border border-rubi px-space-5 text-caption font-semibold text-rubi transition-colors duration-dur-fast hover:bg-rubi-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-9"
              :disabled="aceitando.has(pedido.id)"
              :aria-label="`Recusar solicitação de ${pedido.solicitante.displayName}`"
              @click="recusando = pedido; erroDaRecusa = null"
            >
              Recusar
            </button>
            <button
              type="button"
              class="h-10 rounded-full bg-musgo px-space-5 text-caption font-semibold text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:opacity-60 md:h-9"
              :disabled="aceitando.has(pedido.id)"
              :aria-label="`Aceitar solicitação de ${pedido.solicitante.displayName}`"
              @click="aceitar(pedido)"
            >
              Aceitar
            </button>
          </div>
          <p
            v-if="erros.get(pedido.id)"
            class="text-caption text-rubi md:basis-full"
            role="alert"
          >
            {{ erros.get(pedido.id) }}
          </p>
        </li>
      </ul>
      <ul
        v-if="pedidos.carregandoMais.value"
        aria-busy="true"
        aria-label="Carregando mais"
        class="md:mt-space-3"
      >
        <li class="flex flex-col gap-space-3 border-b border-linha py-space-4 md:flex-row md:items-center md:rounded-base md:border md:p-space-4">
          <SkeletonDeLeitor />
          <span class="flex shrink-0 justify-end gap-space-3">
            <span class="h-10 w-24 rounded-base bg-capa-placeholder md:h-9" />
            <span class="h-10 w-24 rounded-full bg-capa-placeholder md:h-9" />
          </span>
        </li>
      </ul>
      <FimDaLista
        v-else-if="pedidos.temMais.value"
        :falhou="pedidos.falhouMais.value"
        @carregar="pedidos.carregarMais()"
      />
    </template>

    <DialogoConfirmacao
      compacto
      :aberta="recusando !== null"
      :titulo="recusando ? `Recusar a solicitação de ${primeiroNome(recusando.solicitante.displayName)}?` : ''"
      rotulo-confirmar="Recusar"
      :processando="processandoRecusa"
      :erro="erroDaRecusa ?? undefined"
      @confirmar="recusar"
      @cancelar="recusando = null"
    >
      O pedido é descartado e a pessoa não recebe aviso. Ela pode pedir de novo depois.
    </DialogoConfirmacao>
  </div>
</template>
