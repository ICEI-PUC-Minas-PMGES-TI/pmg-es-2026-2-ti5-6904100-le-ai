<script setup lang="ts">
import { PhClock, PhNewspaper } from '@phosphor-icons/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import ItemAtividade from '../components/feed/ItemAtividade.vue'
import FimDaLista from '../components/perfil/FimDaLista.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import EstadoVazio from '../components/ui/EstadoVazio.vue'
import { usePaginacao } from '../perfil/usePaginacao'
import { perfilService } from '../services/perfil'
import { ApiError, novaChaveIdempotencia } from '../services/api'
import { socialService, type Atividade } from '../services/social'

/**
 * Tela do feed (F-FEED, feed.md §4/§5): lista cronológica das atividades de quem o leitor segue,
 * com curtir/descurtir e o gatilho para abrir os comentários (Task 8).
 */
const { itens, carregando, falhou, temMais, carregar, carregarMais, falhouMais } = usePaginacao<Atividade>((pagina) =>
  socialService.listarFeed(pagina),
)

/**
 * Os dois vazios (feed.md §4.4/§4.5) dependem de saber se o leitor segue alguém, e `Atividade`
 * não carrega essa informação: busca-se `contadores.seguidos` do próprio perfil só quando a
 * lista vem vazia, sem custo extra no caminho comum de feed com conteúdo.
 */
const segueAlguem = ref<boolean | null>(null)

async function carregarSeAlguemSegue(): Promise<void> {
  await carregar()
  if (!falhou.value && itens.value.length === 0) {
    try {
      const perfil = await perfilService.obterMeuPerfil()
      segueAlguem.value = perfil.contadores.seguidos > 0
    } catch {
      segueAlguem.value = true
    }
  }
}

onMounted(carregarSeAlguemSegue)

/** Consumido pela Task 8 (modal de comentários); aqui só o botão "comentar" a define. */
const atividadeEmComentario = ref<Atividade | null>(null)

function abrirComentarios(atividade: Atividade): void {
  atividadeEmComentario.value = atividade
}

/** Ids com curtir/descurtir em andamento: guarda contra clique duplo antes da resposta. */
const curtidasPendentes = ref<Set<string>>(new Set())
const erroDeCurtida = ref<string | null>(null)

function mensagemDeErro(erro: unknown): string {
  return erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
}

async function curtir(id: string): Promise<void> {
  if (curtidasPendentes.value.has(id)) {
    return
  }
  curtidasPendentes.value.add(id)
  erroDeCurtida.value = null
  try {
    const resultado = await socialService.curtir(id, novaChaveIdempotencia())
    atualizarCurtida(id, true, resultado.totalCurtidas)
  } catch (erro) {
    erroDeCurtida.value = mensagemDeErro(erro)
  } finally {
    curtidasPendentes.value.delete(id)
  }
}

async function descurtir(id: string): Promise<void> {
  if (curtidasPendentes.value.has(id)) {
    return
  }
  curtidasPendentes.value.add(id)
  erroDeCurtida.value = null
  const atividade = itens.value.find((item) => item.id === id)
  const totalAntes = atividade?.totalCurtidas ?? 1
  try {
    await socialService.descurtir(id, novaChaveIdempotencia())
    atualizarCurtida(id, false, Math.max(0, totalAntes - 1))
  } catch (erro) {
    erroDeCurtida.value = mensagemDeErro(erro)
  } finally {
    curtidasPendentes.value.delete(id)
  }
}

function atualizarCurtida(id: string, curtida: boolean, totalCurtidas: number): void {
  itens.value = itens.value.map((item) =>
    item.id === id ? { ...item, curtidaPeloSolicitante: curtida, totalCurtidas } : item,
  )
}
</script>

<template>
  <div
    v-if="carregando"
    class="flex flex-col"
  >
    <div
      v-for="indice in 3"
      :key="indice"
      class="flex animate-[fade-in_var(--dur-base)_var(--ease-out)] gap-space-4 border-b border-linha py-space-5"
    >
      <div class="size-10 shrink-0 rounded-full bg-papel-elevado" />
      <div class="flex flex-1 flex-col gap-space-2">
        <div class="h-[17px] w-32 rounded-sm bg-papel-elevado" />
        <div class="h-[15px] w-48 rounded-sm bg-papel-elevado" />
        <div class="flex gap-space-4">
          <div class="h-[120px] w-20 bg-capa-placeholder md:h-[150px] md:w-[100px]" />
          <div class="flex flex-1 flex-col gap-space-2">
            <div class="h-[15px] w-full rounded-sm bg-papel-elevado" />
            <div class="h-[15px] w-2/3 rounded-sm bg-papel-elevado" />
          </div>
        </div>
        <div class="flex gap-space-3">
          <div class="h-8 w-16 rounded-full bg-papel-elevado" />
          <div class="h-8 w-16 rounded-full bg-papel-elevado" />
        </div>
      </div>
    </div>
  </div>

  <BannerAviso
    v-else-if="falhou"
    variante="erro"
    class="mt-space-5"
  >
    Não foi possível carregar seu feed. Verifique sua conexão e tente de novo.
    <button
      type="button"
      class="mt-space-2 block text-body-strong text-musgo hover:underline focus-visible:underline"
      @click="carregarSeAlguemSegue"
    >
      Tentar de novo
    </button>
  </BannerAviso>

  <EstadoVazio
    v-else-if="itens.length === 0 && segueAlguem === false"
    :icone="PhNewspaper"
    titulo="Comece seguindo leitores"
    class="mt-space-16"
  >
    <p class="mt-space-2 max-w-[280px] text-body text-grafite">
      As atividades de quem você segue aparecem aqui, da mais recente para a mais antiga.
    </p>
    <RouterLink
      :to="{ name: 'buscar-leitor' }"
      class="mt-space-6 inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-musgo px-space-5 text-body-strong text-papel transition-all duration-dur-fast hover:bg-musgo-vivo active:scale-[0.98] md:h-10"
    >
      Buscar por nome de usuário
    </RouterLink>
  </EstadoVazio>

  <EstadoVazio
    v-else-if="itens.length === 0"
    :icone="PhClock"
    titulo="Nada por aqui ainda"
    class="mt-space-16"
  >
    <p class="mt-space-2 text-body text-grafite">
      Quando quem você segue começar, terminar ou resenhar um livro, aparece aqui.
    </p>
    <RouterLink
      :to="{ name: 'estante' }"
      class="mt-space-6 inline-flex min-h-12 items-center text-body-strong text-musgo underline-offset-2 hover:underline focus-visible:underline md:min-h-10"
    >
      Ver minha estante
    </RouterLink>
  </EstadoVazio>

  <div v-else>
    <BannerAviso
      v-if="erroDeCurtida"
      variante="erro"
      class="mb-space-4"
    >
      {{ erroDeCurtida }}
    </BannerAviso>
    <ItemAtividade
      v-for="atividade in itens"
      :key="atividade.id"
      :atividade="atividade"
      :curtida-pendente="curtidasPendentes.has(atividade.id)"
      @curtir="curtir"
      @descurtir="descurtir"
      @comentar="abrirComentarios"
    />
    <FimDaLista
      v-if="temMais"
      :falhou="falhouMais"
      @carregar="carregarMais"
    />
  </div>

  <!-- TODO(Task 8): renderizar o modal de comentários a partir de `atividadeEmComentario`. -->
</template>
