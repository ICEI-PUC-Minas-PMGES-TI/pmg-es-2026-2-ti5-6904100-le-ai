<script setup lang="ts">
import { PhClock, PhNewspaper } from '@phosphor-icons/vue'
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import ItemAtividade from '../components/feed/ItemAtividade.vue'
import ModalComentarios from '../components/feed/ModalComentarios.vue'
import FimDaLista from '../components/perfil/FimDaLista.vue'
import BannerAviso from '../components/ui/BannerAviso.vue'
import EstadoVazio from '../components/ui/EstadoVazio.vue'
import { useCurtidas } from '../feed/useCurtidas'
import { usePaginacao } from '../perfil/usePaginacao'
import { perfilService } from '../services/perfil'
import { socialService, type Atividade } from '../services/social'

const { itens, carregando, falhou, temMais, carregar, carregarMais, falhouMais } = usePaginacao<Atividade>((pagina) =>
  socialService.listarFeed(pagina),
)

/** `Atividade` não diz se o leitor segue alguém; o perfil só é buscado quando a lista vem vazia. */
const segueAlguem = ref<boolean | null>(null)

async function carregarSeAlguemSegue(): Promise<void> {
  descartarCurtidas()
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

const atividadeEmComentario = ref<Atividade | null>(null)

function abrirComentarios(atividade: Atividade): void {
  atividadeEmComentario.value = atividade
}

function alterarTotalDeComentarios(delta: number): void {
  const id = atividadeEmComentario.value?.id
  if (!id) {
    return
  }
  itens.value = itens.value.map((item) => (item.id === id ? { ...item, totalComentarios: item.totalComentarios + delta } : item))
  atividadeEmComentario.value = { ...atividadeEmComentario.value!, totalComentarios: atividadeEmComentario.value!.totalComentarios + delta }
}

const erroDeCurtida = ref<string | null>(null)
const { alternar: alternarCurtida, descartarPendentes: descartarCurtidas } = useCurtidas(itens, erroDeCurtida)
</script>

<template>
  <div class="mx-auto max-w-[760px]">
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
        @curtir="alternarCurtida"
        @descurtir="alternarCurtida"
        @comentar="abrirComentarios"
      />
      <FimDaLista
        v-if="temMais"
        :falhou="falhouMais"
        @carregar="carregarMais"
      />
    </div>

    <ModalComentarios
      v-if="atividadeEmComentario"
      :atividade="atividadeEmComentario"
      :aberto="true"
      @fechar="atividadeEmComentario = null"
      @comentario-criado="alterarTotalDeComentarios(1)"
      @comentarios-excluidos="alterarTotalDeComentarios(-$event)"
    />
  </div>
</template>
