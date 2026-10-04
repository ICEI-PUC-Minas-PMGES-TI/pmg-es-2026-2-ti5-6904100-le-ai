<script setup lang="ts">
import { PhDotsThree, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import { computed, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import type { AcaoDaFolha } from '../ui/FolhaAcoes.vue'
import MenuDeAcoes from '../ui/MenuDeAcoes.vue'
import { trechosDoComentario } from '../../feed/mencoes'
import { contagem, tempoDeEspera } from '../../perfil/textos'
import type { Comentario } from '../../services/social'

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

const botaoDoMenu = ref<HTMLElement | null>(null)
const menu = ref<InstanceType<typeof MenuDeAcoes> | null>(null)

function escolher(id: string): void {
  if (id === 'editar') {
    emit('editar', props.comentario)
  } else {
    emit('excluir', props.comentario)
  }
}
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
          @keydown.esc="menu?.fechar()"
        >
          <button
            ref="botaoDoMenu"
            type="button"
            :aria-label="ehResposta ? 'Ações da sua resposta' : 'Ações do seu comentário'"
            :aria-expanded="menu?.aberto ?? false"
            :disabled="acoesDesabilitadas"
            class="flex size-12 cursor-pointer items-center justify-center rounded-full text-grafite transition-colors duration-dur-fast hover:bg-linha disabled:cursor-not-allowed disabled:text-grafite-suave md:size-8"
            @click="menu?.alternar(botaoDoMenu!)"
          >
            <PhDotsThree
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
          </button>
          <MenuDeAcoes
            ref="menu"
            :rotulo="rotuloDoMenu"
            :acoes="acoes"
            @escolher="escolher"
          />
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
  </div>
</template>
