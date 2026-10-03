<script setup lang="ts">
import { PhDotsThree, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import FolhaAcoes, { type AcaoDaFolha } from '../ui/FolhaAcoes.vue'
import { trechosDoComentario } from '../../feed/mencoes'
import { contagem, tempoDeEspera } from '../../perfil/textos'
import type { Comentario } from '../../services/social'

const LARGURA_WEB = '(min-width: 768px)'
const ESPACO_DO_DROPDOWN = 8
const ALTURA_DO_DROPDOWN = 104

const props = withDefaults(
  defineProps<{
    comentario: Comentario
    mostrarAlternadorDeRespostas?: boolean
    respostasExpandidas?: boolean
    carregandoRespostas?: boolean
    emEdicao?: boolean
    acoesDesabilitadas?: boolean
  }>(),
  {
    mostrarAlternadorDeRespostas: false,
    respostasExpandidas: false,
    carregandoRespostas: false,
    emEdicao: false,
    acoesDesabilitadas: false,
  },
)

const emit = defineEmits<{
  responder: [comentario: Comentario]
  'alternar-respostas': []
  editar: [comentario: Comentario]
  excluir: [comentario: Comentario]
}>()

const ehResposta = computed(() => props.comentario.nivel === 'RESPOSTA')
const trechos = computed(() => trechosDoComentario(props.comentario.texto, props.comentario.mencoes))

function perfilDe(username: string): RouteLocationRaw {
  return { name: 'perfil-de-outro', params: { username } }
}

const rotuloAlternador = computed(() =>
  props.respostasExpandidas ? 'Ocultar respostas' : `Ver ${contagem(props.comentario.totalRespostas ?? 0, 'resposta', 'respostas')}`,
)

const rotuloDoMenu = computed(() => (ehResposta.value ? 'Sua resposta' : 'Seu comentário'))

const acoes: AcaoDaFolha[] = [
  { id: 'editar', rotulo: 'Editar', icone: PhPencilSimple },
  { id: 'excluir', rotulo: 'Excluir', icone: PhTrash, destrutiva: true },
]

const folhaAberta = ref(false)
const dropdownAberto = ref(false)
const botaoDoMenu = ref<HTMLElement | null>(null)
const dropdown = ref<HTMLElement | null>(null)
const posicaoDoDropdown = ref<Record<string, string>>({})

function fecharAoClicarFora(evento: MouseEvent): void {
  const alvo = evento.target as Node
  if (!botaoDoMenu.value?.contains(alvo) && !dropdown.value?.contains(alvo)) {
    fecharDropdown()
  }
}

function fecharDropdown(): void {
  dropdownAberto.value = false
  document.removeEventListener('mousedown', fecharAoClicarFora)
  window.removeEventListener('scroll', fecharDropdown, true)
  window.removeEventListener('resize', fecharDropdown)
}

function posicionarDropdown(): void {
  const botao = botaoDoMenu.value!.getBoundingClientRect()
  const direita = `${window.innerWidth - botao.right}px`
  const cabeEmbaixo = botao.bottom + ESPACO_DO_DROPDOWN + ALTURA_DO_DROPDOWN <= window.innerHeight
  posicaoDoDropdown.value = cabeEmbaixo
    ? { top: `${botao.bottom + ESPACO_DO_DROPDOWN}px`, right: direita }
    : { bottom: `${window.innerHeight - botao.top + ESPACO_DO_DROPDOWN}px`, right: direita }
}

function abrirMenu(): void {
  if (dropdownAberto.value) {
    fecharDropdown()
    return
  }
  if (window.matchMedia(LARGURA_WEB).matches) {
    posicionarDropdown()
    dropdownAberto.value = true
    document.addEventListener('mousedown', fecharAoClicarFora)
    window.addEventListener('scroll', fecharDropdown, true)
    window.addEventListener('resize', fecharDropdown)
  } else {
    folhaAberta.value = true
  }
}

function escolher(id: string): void {
  folhaAberta.value = false
  fecharDropdown()
  if (id === 'editar') {
    emit('editar', props.comentario)
  } else {
    emit('excluir', props.comentario)
  }
}

onBeforeUnmount(fecharDropdown)
</script>

<template>
  <div
    class="flex gap-space-3 rounded-base py-space-4"
    :class="[ehResposta ? 'pl-space-10 md:pl-space-12' : '', emEdicao ? 'bg-musgo-fundo px-space-2' : '']"
  >
    <AvatarLeitor
      :url="comentario.autor.avatarUrl"
      :tamanho="ehResposta ? 28 : 32"
    />
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-start justify-between gap-space-2">
        <p>
          <span class="text-body-strong text-tinta">{{ comentario.autor.nomeExibicao }}</span>
          <span class="text-caption text-grafite-suave"> · {{ tempoDeEspera(comentario.criadoEm) }}</span>
          <span
            v-if="comentario.editado"
            class="text-caption text-grafite-suave"
          > · editado</span>
        </p>
        <div
          v-if="comentario.pertenceAoSolicitante"
          class="-my-space-3 -mr-space-3 md:-my-space-1 md:mr-0"
          @keydown.esc="fecharDropdown"
        >
          <button
            ref="botaoDoMenu"
            type="button"
            :aria-label="ehResposta ? 'Ações da sua resposta' : 'Ações do seu comentário'"
            :aria-expanded="dropdownAberto"
            :disabled="acoesDesabilitadas"
            class="flex size-12 cursor-pointer items-center justify-center rounded-full text-grafite transition-colors duration-dur-fast hover:bg-linha disabled:cursor-not-allowed disabled:text-grafite-suave md:size-8"
            @click="abrirMenu"
          >
            <PhDotsThree
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
          </button>
          <Teleport to="body">
            <ul
              v-if="dropdownAberto"
              ref="dropdown"
              role="menu"
              class="fixed z-40 w-[220px] rounded-base border border-linha bg-papel py-space-2 shadow-2"
              :style="posicaoDoDropdown"
              @keydown.esc="fecharDropdown"
            >
              <li
                v-for="acao in acoes"
                :key="acao.id"
                role="none"
              >
                <button
                  type="button"
                  role="menuitem"
                  class="flex h-11 w-full cursor-pointer items-center gap-space-3 px-space-4 text-left text-body hover:bg-linha focus-visible:bg-linha focus-visible:outline-none"
                  :class="acao.destrutiva ? 'text-rubi' : 'text-tinta'"
                  @click="escolher(acao.id)"
                >
                  <component
                    :is="acao.icone"
                    :size="20"
                    weight="regular"
                    aria-hidden="true"
                  />
                  {{ acao.rotulo }}
                </button>
              </li>
            </ul>
          </Teleport>
        </div>
      </div>
      <p class="mt-space-1 whitespace-pre-wrap text-body text-tinta">
        <template
          v-for="(trecho, indice) in trechos"
          :key="indice"
        >
          <RouterLink
            v-if="trecho.tipo === 'mencao'"
            :to="perfilDe(trecho.username)"
            :aria-label="`Perfil de @${trecho.username}`"
            class="font-semibold text-musgo transition-colors duration-dur-fast hover:text-musgo-vivo hover:underline"
          >
            {{ trecho.texto }}
          </RouterLink>
          <template v-else>
            {{ trecho.texto }}
          </template>
        </template>
      </p>
      <button
        type="button"
        :disabled="acoesDesabilitadas"
        class="mt-space-2 min-h-12 w-fit cursor-pointer text-caption font-semibold text-grafite hover:underline focus-visible:underline disabled:cursor-not-allowed disabled:text-grafite-suave disabled:no-underline md:min-h-9"
        @click="emit('responder', comentario)"
      >
        Responder
      </button>
      <button
        v-if="mostrarAlternadorDeRespostas"
        type="button"
        class="mt-space-3 flex min-h-12 w-fit cursor-pointer items-center gap-space-2 text-caption font-semibold text-musgo before:h-px before:w-4 before:bg-linha md:min-h-9"
        :aria-expanded="respostasExpandidas"
        :disabled="carregandoRespostas"
        @click="emit('alternar-respostas')"
      >
        {{ rotuloAlternador }}
      </button>
    </div>
    <FolhaAcoes
      v-if="comentario.pertenceAoSolicitante"
      :aberta="folhaAberta"
      :rotulo="rotuloDoMenu"
      :acoes="acoes"
      @escolher="escolher"
      @fechar="folhaAberta = false"
    />
  </div>
</template>
