<script setup lang="ts">
import { PhGlobe, PhListBullets, PhLock, PhPlus } from '@phosphor-icons/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import AvatarLeitor from '../../components/perfil/AvatarLeitor.vue'
import FimDaLista from '../../components/perfil/FimDaLista.vue'
import CardDeLista from '../../components/listas/CardDeLista.vue'
import FormularioDeLista from '../../components/listas/FormularioDeLista.vue'
import AvisoFlutuante from '../../components/ui/AvisoFlutuante.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import { consumirAviso } from '../../listas/avisos'
import { rotaDaLista } from '../../listas/caminhos'
import { contagemDeListas, textoDeListasRestritas, visibilidadeDasListas } from '../../listas/textos'
import { useMinhaPrivacidade } from '../../listas/useMinhaPrivacidade'
import { primeiroNome } from '../../perfil/textos'
import { usePaginacao } from '../../perfil/usePaginacao'
import { listasService, type Lista, type ListaResumo } from '../../services/listas'
import { perfilService, type Perfil } from '../../services/perfil'
import { useSession } from '../../session'

/**
 * Índice de listas de um leitor em página própria (listas-do-leitor.md §4): o `Ver todas` da
 * seção `Listas` do perfil abaixo de 768px. Na web o índice é a aba `Listas` do perfil
 * (`ListasDoPerfil`), mas a página continua funcionando em qualquer largura.
 *
 * `/perfil/listas` é o próprio leitor; `/leitores/:username/listas`, outro, sob RN-08: perfil
 * restrito mostra o bloco de restrição, sem contagem nem título de lista.
 */
const route = useRoute()
const router = useRouter()
const { usuario } = useSession()
const privacidade = useMinhaPrivacidade()

const username = computed(() => (typeof route.params.username === 'string' ? route.params.username : null))
const proprio = computed(() => username.value === null)

const perfil = ref<Perfil | null>(null)
const carregandoPerfil = ref(false)
const perfilFalhou = ref(false)
const criando = ref(false)
const aviso = ref<string | null>(null)

const usuarioId = computed(() => (proprio.value ? (usuario.value?.id ?? null) : (perfil.value?.id ?? null)))
const nome = computed(() => (perfil.value ? primeiroNome(perfil.value.displayName) : null))
const restrito = computed(() => !proprio.value && perfil.value?.conteudoRestrito === true)

const paginacao = usePaginacao<ListaResumo>((pagina) => listasService.listarDoPerfil(usuarioId.value ?? '', pagina))

async function carregar(): Promise<void> {
  if (!proprio.value && username.value) {
    carregandoPerfil.value = true
    perfilFalhou.value = false
    try {
      perfil.value = await perfilService.obterPerfil(username.value)
    } catch {
      perfilFalhou.value = true
      return
    } finally {
      carregandoPerfil.value = false
    }
  }
  if (!restrito.value && usuarioId.value) {
    await paginacao.carregar()
  }
}

onMounted(() => {
  aviso.value = consumirAviso()
})
watch(username, () => void carregar(), { immediate: true })

const carregando = computed(() => carregandoPerfil.value || paginacao.carregando.value)
const falhou = computed(() => perfilFalhou.value || paginacao.falhou.value)

function rota(lista: ListaResumo) {
  return rotaDaLista(lista.id, username.value ? { username: username.value } : null, proprio.value)
}

function aoCriar(lista: Lista): void {
  criando.value = false
  void router.push(rotaDaLista(lista.id, null, true))
}
</script>

<template>
  <div class="mx-auto max-w-[720px] pb-space-12 pt-space-2">
    <EstadoVazio
      v-if="restrito"
      :icone="PhLock"
      solto
      titulo="Este perfil é privado"
      class="mx-auto mt-space-10 max-w-[280px]"
    >
      <p class="mt-space-6 text-body text-grafite">
        {{ textoDeListasRestritas(nome) }}
      </p>
      <RouterLink
        :to="{ name: 'perfil-de-outro', params: { username } }"
        class="mt-space-6 flex h-12 items-center justify-center rounded-base border border-linha px-space-5 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
      >
        Ver perfil de {{ nome }}
      </RouterLink>
    </EstadoVazio>

    <template v-else>
      <!-- Linha de topo (§4 "Linha de topo"). -->
      <div class="flex flex-col gap-space-2 border-b border-linha pb-space-4">
        <div class="flex items-center justify-between gap-space-4">
          <p
            v-if="!proprio && perfil"
            class="flex min-w-0 items-center gap-space-2 text-caption text-grafite"
          >
            <AvatarLeitor
              :url="perfil.avatarUrl"
              :nome="perfil.displayName"
              :tamanho="24"
            />
            <span class="truncate">
              Listas de
              <RouterLink
                :to="{ name: 'perfil-de-outro', params: { username: perfil.username } }"
                class="rounded-sm font-semibold text-musgo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
              >{{ perfil.displayName }}</RouterLink>
            </span>
          </p>
          <p
            class="text-caption text-grafite"
            :class="proprio ? '' : 'shrink-0'"
          >
            <span
              v-if="carregando"
              class="inline-block h-[13px] w-16 rounded-sm bg-capa-placeholder align-middle"
              aria-hidden="true"
            />
            <template v-else-if="!falhou && paginacao.total.value > 0">
              {{ contagemDeListas(paginacao.total.value) }}
            </template>
          </p>
          <button
            v-if="proprio && (carregando || paginacao.itens.value.length > 0 || falhou)"
            type="button"
            class="flex min-h-12 items-center gap-space-1 rounded-base text-body-strong text-musgo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
            @click="criando = true"
          >
            <PhPlus
              :size="16"
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
        v-if="carregando"
        class="entrada flex flex-col divide-y divide-linha"
        aria-busy="true"
        aria-label="Carregando listas"
      >
        <div
          v-for="n in 5"
          :key="n"
          class="flex items-center gap-space-4 py-space-4"
        >
          <span class="h-[72px] w-[88px] shrink-0 rounded-sm bg-capa-placeholder" />
          <span class="flex flex-1 flex-col gap-space-2">
            <span class="h-[17px] w-[65%] rounded-sm bg-capa-placeholder" />
            <span class="h-[13px] w-[85%] rounded-sm bg-capa-placeholder" />
            <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
          </span>
        </div>
      </div>
      <div
        v-else-if="falhou"
        class="mt-space-4"
      >
        <BannerAviso
          variante="erro"
          triangulo
        >
          Não foi possível carregar as listas. Verifique sua conexão e tente de novo.
          <BotaoTextual
            class="mt-space-2 block"
            @click="carregar"
          >
            Tentar de novo
          </BotaoTextual>
        </BannerAviso>
      </div>
      <EstadoVazio
        v-else-if="paginacao.itens.value.length === 0 && proprio"
        :icone="PhListBullets"
        solto
        titulo="Você ainda não tem listas"
        class="mx-auto mt-space-10 max-w-[280px]"
      >
        <p class="mt-space-6 text-body text-grafite">
          Junte livros sob um título, com uma descrição e na ordem que você quiser.
        </p>
        <button
          type="button"
          class="mt-space-6 flex h-12 items-center gap-space-2 rounded-full bg-musgo px-space-6 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
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
        v-else-if="paginacao.itens.value.length === 0"
        class="pt-space-4 text-body text-grafite"
      >
        {{ nome ?? 'Este leitor' }} ainda não criou listas.
      </p>
      <template v-else>
        <ul class="divide-y divide-linha">
          <li
            v-for="lista in paginacao.itens.value"
            :key="lista.id"
          >
            <CardDeLista
              :lista="lista"
              :para="rota(lista)"
              forma="linha"
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
    </template>

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
