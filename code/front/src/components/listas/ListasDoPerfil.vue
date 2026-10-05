<script setup lang="ts">
import { PhGlobe, PhListBullets, PhLock, PhPlus } from '@phosphor-icons/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { consumirAviso } from '../../listas/avisos'
import { rotaDaLista, rotaDoIndice } from '../../listas/caminhos'
import { visibilidadeDasListas } from '../../listas/textos'
import { usePaginacao } from '../../perfil/usePaginacao'
import { listasService, type Lista, type ListaResumo } from '../../services/listas'
import type { Privacidade } from '../../services/perfil'
import FimDaLista from '../perfil/FimDaLista.vue'
import AvisoFlutuante from '../ui/AvisoFlutuante.vue'
import BannerAviso from '../ui/BannerAviso.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import EstadoVazio from '../ui/EstadoVazio.vue'
import CardDeLista from './CardDeLista.vue'
import FormularioDeLista from './FormularioDeLista.vue'

/**
 * Listas no perfil (meu-perfil.md §4.2 E e §4.8, perfil-de-outro-leitor.md §4 C e §4.5,
 * listas-do-leitor.md §5). Abaixo de 768px, a seção `Listas` com as três mais recentes, `Ver
 * todas` (o índice mobile) e, para o dono, `Nova lista`. A partir de 768px, o conteúdo da aba
 * `Listas`: contagem, `Nova lista` e a grade de três colunas, paginada por rolagem.
 *
 * Quem usa decide se mostra: com o perfil restrito (RN-08), nada daqui aparece.
 */
const props = defineProps<{
  usuarioId: string
  proprio: boolean
  /** Primeiro nome, para `Rafael ainda não criou listas.` */
  nome?: string
  /** Username do dono, para os links; o próprio leitor usa `/perfil`. */
  username?: string
  /** Privacidade do próprio perfil, para a linha de visibilidade do dono. */
  privacidade?: Privacidade
}>()

const router = useRouter()

const paginacao = usePaginacao<ListaResumo>((pagina) => listasService.listarDoPerfil(props.usuarioId, pagina))
const criando = ref(false)
const aviso = ref<string | null>(null)

onMounted(() => {
  void paginacao.carregar()
  aviso.value = consumirAviso()
})
watch(
  () => props.usuarioId,
  () => void paginacao.carregar(),
)

const dono = computed(() => (props.proprio ? null : (props.username ?? null)))
const primeiras = computed(() => paginacao.itens.value.slice(0, 3))
const vazio = computed(() => !paginacao.carregando.value && !paginacao.falhou.value && paginacao.itens.value.length === 0)

function rota(lista: ListaResumo) {
  return rotaDaLista(lista.id, dono.value ? { username: dono.value } : null, props.proprio)
}

function aoCriar(lista: Lista): void {
  criando.value = false
  void router.push(rotaDaLista(lista.id, null, true))
}

const BOTAO_NOVA_LISTA_TEXTUAL =
  'flex min-h-12 items-center gap-space-2 rounded-base text-body-strong text-musgo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo'
</script>

<template>
  <div>
    <!-- Mobile: seção com as três mais recentes (meu-perfil.md §4.2 E). -->
    <section
      class="md:hidden"
      aria-labelledby="secao-listas-titulo"
    >
      <div class="flex items-baseline justify-between">
        <h2
          id="secao-listas-titulo"
          class="text-title-lg text-tinta"
        >
          Listas
        </h2>
        <RouterLink
          v-if="paginacao.itens.value.length > 0"
          :to="rotaDoIndice(dono, false)"
          class="rounded-sm text-caption font-semibold text-musgo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        >
          Ver todas
        </RouterLink>
      </div>
      <div
        v-if="paginacao.carregando.value"
        class="entrada mt-space-3 flex flex-col"
        aria-busy="true"
        aria-label="Carregando listas"
      >
        <div
          v-for="n in 3"
          :key="n"
          class="flex items-center gap-space-4 border-b border-linha py-space-4 last:border-b-0"
        >
          <span class="h-[72px] w-[88px] shrink-0 rounded-sm bg-capa-placeholder" />
          <span class="flex flex-1 flex-col gap-space-2">
            <span class="h-[17px] w-[65%] rounded-sm bg-capa-placeholder" />
            <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
          </span>
        </div>
      </div>
      <div
        v-else-if="paginacao.falhou.value"
        class="mt-space-3"
      >
        <BannerAviso
          variante="erro"
          triangulo
        >
          Não foi possível carregar as listas. Verifique sua conexão e tente de novo.
          <BotaoTextual
            class="mt-space-2 block"
            @click="paginacao.carregar()"
          >
            Tentar de novo
          </BotaoTextual>
        </BannerAviso>
      </div>
      <p
        v-else-if="vazio"
        class="mt-space-3 text-body text-grafite"
      >
        {{ proprio ? 'Junte livros sob um título, com uma descrição e na ordem que você quiser.' : `${nome ?? 'Este leitor'} ainda não criou listas.` }}
      </p>
      <ul
        v-else
        class="mt-space-3 divide-y divide-linha"
      >
        <li
          v-for="lista in primeiras"
          :key="lista.id"
        >
          <CardDeLista
            :lista="lista"
            :para="rota(lista)"
            forma="linha"
          />
        </li>
      </ul>
      <button
        v-if="proprio"
        type="button"
        class="mt-space-3"
        :class="BOTAO_NOVA_LISTA_TEXTUAL"
        @click="criando = true"
      >
        <PhPlus
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        Nova lista
      </button>
    </section>

    <!-- Web: conteúdo da aba `Listas` (listas-do-leitor.md §5). -->
    <div class="hidden md:block md:pt-space-6">
      <div
        v-if="!vazio || proprio"
        class="flex flex-col gap-space-2"
      >
        <div
          v-if="!vazio"
          class="flex items-center justify-between gap-space-4"
        >
          <p class="text-caption text-grafite">
            <span
              v-if="paginacao.carregando.value"
              class="inline-block h-[13px] w-16 rounded-sm bg-capa-placeholder align-middle"
              aria-hidden="true"
            />
            <template v-else-if="!paginacao.falhou.value">
              <span class="font-mono tabular-nums">{{ paginacao.total.value }}</span>
              {{ paginacao.total.value === 1 ? 'lista' : 'listas' }}
            </template>
          </p>
          <button
            v-if="proprio"
            type="button"
            class="flex h-10 items-center gap-space-2 rounded-base border border-linha px-space-5 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
            @click="criando = true"
          >
            <PhPlus
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
            Nova lista
          </button>
        </div>
        <p
          v-if="proprio && privacidade"
          class="flex items-start gap-space-2 text-caption text-grafite"
        >
          <component
            :is="privacidade === 'privado' ? PhLock : PhGlobe"
            :size="16"
            weight="regular"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          {{ visibilidadeDasListas(privacidade) }}
        </p>
      </div>

      <div
        v-if="paginacao.carregando.value"
        class="entrada mt-space-5 grid grid-cols-3 gap-space-5"
        aria-busy="true"
        aria-label="Carregando listas"
      >
        <div
          v-for="n in 6"
          :key="n"
          class="flex flex-col gap-space-3 p-space-4"
        >
          <span class="h-[120px] w-[144px] rounded-sm bg-capa-placeholder" />
          <span class="mt-space-1 h-[17px] w-[65%] rounded-sm bg-capa-placeholder" />
          <span class="h-[13px] w-[85%] rounded-sm bg-capa-placeholder" />
          <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
        </div>
      </div>
      <div
        v-else-if="paginacao.falhou.value"
        class="mt-space-5 max-w-[720px]"
      >
        <BannerAviso
          variante="erro"
          triangulo
        >
          Não foi possível carregar as listas. Verifique sua conexão e tente de novo.
          <BotaoTextual
            class="mt-space-2 block"
            @click="paginacao.carregar()"
          >
            Tentar de novo
          </BotaoTextual>
        </BannerAviso>
      </div>
      <EstadoVazio
        v-else-if="vazio && proprio"
        :icone="PhListBullets"
        solto
        titulo="Você ainda não tem listas"
        class="mx-auto mt-space-10 max-w-[360px]"
      >
        <p class="mt-space-6 text-body text-grafite">
          Junte livros sob um título, com uma descrição e na ordem que você quiser.
        </p>
        <button
          type="button"
          class="mt-space-6 flex h-10 items-center gap-space-2 rounded-full bg-musgo px-space-6 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
          @click="criando = true"
        >
          <PhPlus
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
          Nova lista
        </button>
      </EstadoVazio>
      <p
        v-else-if="vazio"
        class="text-body text-grafite"
      >
        {{ nome ?? 'Este leitor' }} ainda não criou listas.
      </p>
      <template v-else>
        <ul class="mt-space-5 grid grid-cols-2 gap-space-5 lg:grid-cols-3">
          <li
            v-for="lista in paginacao.itens.value"
            :key="lista.id"
          >
            <CardDeLista
              :lista="lista"
              :para="rota(lista)"
              forma="grade"
            />
          </li>
        </ul>
        <FimDaLista
          v-if="paginacao.temMais.value || paginacao.falhouMais.value"
          :falhou="paginacao.falhouMais.value"
          :carregando="paginacao.carregandoMais.value"
          @carregar="paginacao.carregarMais()"
        />
      </template>
    </div>

    <FormularioDeLista
      v-if="proprio"
      :aberto="criando"
      @fechar="criando = false"
      @criada="aoCriar"
    />
    <AvisoFlutuante
      :aberto="aviso !== null"
      @fechar="aviso = null"
    >
      {{ aviso }}
    </AvisoFlutuante>
  </div>
</template>
