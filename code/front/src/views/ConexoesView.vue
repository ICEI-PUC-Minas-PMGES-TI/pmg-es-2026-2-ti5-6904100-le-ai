<script setup lang="ts">
import { PhCheck, PhUsers } from '@phosphor-icons/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import FimDaLista from '../components/perfil/FimDaLista.vue'
import LinhaDeLeitor from '../components/perfil/LinhaDeLeitor.vue'
import SkeletonDeLeitor from '../components/perfil/SkeletonDeLeitor.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import BotaoTextual from '../components/ui/BotaoTextual.vue'
import DialogoConfirmacao from '../components/ui/DialogoConfirmacao.vue'
import EstadoVazio from '../components/ui/EstadoVazio.vue'
import { primeiroNome } from '../perfil/textos'
import { usePaginacao } from '../perfil/usePaginacao'
import { ApiError, novaChaveIdempotencia } from '../services/api'
import { perfilService, type PerfilResumo } from '../services/perfil'

/**
 * Conexões (RF-SOC-07/08), a partir de docs/design/periodo-1/F-PERFIL/seguidores-e-seguidos.md.
 * As duas listas do próprio leitor, em abas; não existe versão para terceiros (RNF-SEC-19/44).
 * A aba vem de `?aba=` para os contadores do perfil abrirem a certa. As duas primeiras páginas
 * carregam juntas, porque as abas mostram as duas contagens.
 *
 * Remover seguidor e deixar de seguir são destrutivos e pedem confirmação, cada um com a sua
 * consequência escrita (RNF-USA-04).
 */
type Aba = 'seguidores' | 'seguidos'

const route = useRoute()
const router = useRouter()

const aba = computed<Aba>(() => (route.query.aba === 'seguidos' ? 'seguidos' : 'seguidores'))

const seguidores = usePaginacao((pagina) => perfilService.listarSeguidores(pagina))
const seguidos = usePaginacao((pagina) => perfilService.listarSeguidos(pagina))
const lista = computed(() => (aba.value === 'seguidores' ? seguidores : seguidos))

onMounted(() => {
  void seguidores.carregar()
  void seguidos.carregar()
})

function trocar(nova: Aba): void {
  void router.replace({ query: { ...route.query, aba: nova } })
}

type Acao = { tipo: 'remover' | 'deixar'; leitor: PerfilResumo }
const acao = ref<Acao | null>(null)
const processando = ref(false)
const erroDaAcao = ref<string | null>(null)

const tituloDaAcao = computed(() => {
  if (!acao.value) {
    return ''
  }
  const nome = primeiroNome(acao.value.leitor.displayName)
  return acao.value.tipo === 'remover' ? `Remover ${nome} dos seus seguidores?` : `Deixar de seguir ${nome}?`
})

const textoDaAcao = computed(() => {
  if (!acao.value) {
    return ''
  }
  if (acao.value.tipo === 'remover') {
    return 'Essa pessoa deixa de seguir você e perde o acesso ao seu conteúdo restrito. Ela pode pedir para seguir de novo.'
  }
  return acao.value.leitor.privacidade === 'privado'
    ? 'As atividades dessa pessoa saem do seu feed, e você perde o acesso à estante e às resenhas. Seguir de novo exige uma solicitação nova.'
    : 'As atividades dessa pessoa saem do seu feed. Você pode seguir de novo quando quiser.'
})

function pedir(tipo: Acao['tipo'], leitor: PerfilResumo): void {
  erroDaAcao.value = null
  acao.value = { tipo, leitor }
}

async function confirmar(): Promise<void> {
  const atual = acao.value
  if (!atual) {
    return
  }
  processando.value = true
  erroDaAcao.value = null
  try {
    if (atual.tipo === 'remover') {
      await perfilService.removerSeguidor(atual.leitor.username, novaChaveIdempotencia())
      seguidores.retirar(atual.leitor.id)
    } else {
      await perfilService.deixarDeSeguir(atual.leitor.username, novaChaveIdempotencia())
      seguidos.retirar(atual.leitor.id)
    }
    acao.value = null
  } catch (erro) {
    erroDaAcao.value = erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
  } finally {
    processando.value = false
  }
}

const abas: { valor: Aba; rotulo: string }[] = [
  { valor: 'seguidores', rotulo: 'Seguidores' },
  { valor: 'seguidos', rotulo: 'Seguindo' },
]

function totalDa(valor: Aba): number | null {
  const alvo = valor === 'seguidores' ? seguidores : seguidos
  return alvo.carregando.value || alvo.falhou.value ? null : alvo.total.value
}
</script>

<template>
  <div class="-mx-space-5 flex min-h-full max-w-[1040px] flex-col pb-space-10 md:mx-0">
    <div
      class="flex border-b border-linha md:gap-space-8"
      role="tablist"
      aria-label="Conexões"
    >
      <button
        v-for="item in abas"
        :key="item.valor"
        type="button"
        role="tab"
        :aria-selected="aba === item.valor"
        class="-mb-px flex h-12 flex-1 items-center justify-center gap-space-1 border-b-2 text-body-strong transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-musgo md:flex-none"
        :class="aba === item.valor ? 'border-musgo text-musgo' : 'border-transparent text-grafite hover:text-tinta'"
        @click="trocar(item.valor)"
      >
        {{ item.rotulo }}
        <span
          v-if="totalDa(item.valor) !== null"
          class="font-mono text-num-inline tabular-nums"
        >{{ totalDa(item.valor) }}</span>
      </button>
    </div>

    <div
      role="tabpanel"
      class="flex flex-1 flex-col px-space-5 pt-space-2 md:px-0 md:pt-space-6"
    >
      <ul
        v-if="lista.carregando.value"
        class="md:grid md:grid-cols-2 md:gap-space-4"
        aria-busy="true"
        aria-label="Carregando conexões"
      >
        <li
          v-for="n in 6"
          :key="n"
          class="flex items-center gap-space-4 border-b border-linha py-space-4 md:rounded-base md:border md:p-space-4"
        >
          <SkeletonDeLeitor />
          <span class="h-9 w-24 shrink-0 rounded-base bg-capa-placeholder" />
        </li>
      </ul>

      <BannerAviso
        v-else-if="lista.falhou.value"
        variante="erro"
        triangulo
        class="mt-space-4"
      >
        Não foi possível carregar suas conexões. Verifique sua conexão e tente de novo.
        <BotaoTextual
          class="mt-space-2"
          @click="lista.carregar()"
        >
          Tentar de novo
        </BotaoTextual>
      </BannerAviso>

      <EstadoVazio
        v-else-if="lista.itens.value.length === 0 && aba === 'seguidores'"
        :icone="PhUsers"
        solto
        titulo="Ninguém segue você ainda"
        class="m-auto max-w-[360px] py-space-10"
      >
        <p class="mt-space-3 text-body text-grafite">
          Quando alguém começar a seguir você, aparece aqui.
        </p>
      </EstadoVazio>

      <EstadoVazio
        v-else-if="lista.itens.value.length === 0"
        :icone="PhUsers"
        solto
        titulo="Você ainda não segue ninguém"
        class="m-auto max-w-[360px] py-space-10"
      >
        <p class="mt-space-3 text-body text-grafite">
          Busque um leitor pelo nome de usuário para começar a montar seu feed.
        </p>
        <RouterLink
          to="/perfil/buscar"
          class="mt-space-6 flex h-12 items-center justify-center rounded-full bg-musgo px-space-6 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
        >
          Buscar leitor
        </RouterLink>
      </EstadoVazio>

      <template v-else>
        <ul class="md:grid md:grid-cols-2 md:gap-space-4">
          <li
            v-for="leitor in lista.itens.value"
            :key="leitor.id"
            class="border-b border-linha py-space-4 transition-colors duration-dur-fast md:rounded-base md:border md:p-space-4 md:hover:bg-papel-elevado"
          >
            <LinhaDeLeitor :leitor="leitor">
              <button
                v-if="aba === 'seguidores'"
                type="button"
                class="h-9 shrink-0 rounded-base border border-rubi px-space-4 text-caption font-semibold text-rubi transition-colors duration-dur-fast hover:bg-rubi-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
                :aria-label="`Remover ${leitor.displayName} dos seus seguidores`"
                @click="pedir('remover', leitor)"
              >
                Remover
              </button>
              <button
                v-else
                type="button"
                class="flex h-9 shrink-0 items-center gap-space-1 rounded-base border border-linha px-space-4 text-caption font-semibold text-tinta transition-colors duration-dur-fast hover:border-rubi hover:text-rubi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
                :aria-label="`Seguindo ${leitor.displayName}. Deixar de seguir`"
                @click="pedir('deixar', leitor)"
              >
                <PhCheck
                  :size="16"
                  weight="bold"
                  class="text-musgo"
                  aria-hidden="true"
                />
                Seguindo
              </button>
            </LinhaDeLeitor>
          </li>
        </ul>
        <ul
          v-if="lista.carregandoMais.value"
          aria-busy="true"
          aria-label="Carregando mais"
          class="md:mt-space-4 md:grid md:grid-cols-2 md:gap-space-4"
        >
          <li
            v-for="n in 2"
            :key="n"
            class="flex items-center gap-space-4 border-b border-linha py-space-4 md:rounded-base md:border md:p-space-4"
          >
            <SkeletonDeLeitor />
            <span class="h-9 w-24 shrink-0 rounded-base bg-capa-placeholder" />
          </li>
        </ul>
        <FimDaLista
          v-else-if="lista.temMais.value"
          :key="aba"
          :falhou="lista.falhouMais.value"
          @carregar="lista.carregarMais()"
        />
      </template>
    </div>

    <DialogoConfirmacao
      compacto
      :aberta="acao !== null"
      :titulo="tituloDaAcao"
      :rotulo-confirmar="acao?.tipo === 'remover' ? 'Remover' : 'Deixar de seguir'"
      :processando="processando"
      :erro="erroDaAcao ?? undefined"
      @confirmar="confirmar"
      @cancelar="acao = null"
    >
      {{ textoDaAcao }}
    </DialogoConfirmacao>
  </div>
</template>
