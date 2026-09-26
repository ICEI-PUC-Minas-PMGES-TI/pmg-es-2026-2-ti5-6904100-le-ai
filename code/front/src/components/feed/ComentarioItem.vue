<script setup lang="ts">
import { computed } from 'vue'

import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import { contagem, tempoDeEspera } from '../../perfil/textos'
import type { Comentario } from '../../services/social'

const props = withDefaults(
  defineProps<{
    comentario: Comentario
    mostrarAlternadorDeRespostas?: boolean
    respostasExpandidas?: boolean
    carregandoRespostas?: boolean
  }>(),
  { mostrarAlternadorDeRespostas: false, respostasExpandidas: false, carregandoRespostas: false },
)

const emit = defineEmits<{ responder: [comentario: Comentario]; 'alternar-respostas': [] }>()

const ehResposta = computed(() => props.comentario.nivel === 'RESPOSTA')

const mencao = computed(() => {
  const alvo = props.comentario.usuarioRespondido
  if (!alvo) {
    return null
  }
  const prefixo = `@${alvo.username} `
  return props.comentario.texto.startsWith(prefixo) ? prefixo.trimEnd() : null
})

const restoDoTexto = computed(() =>
  mencao.value ? props.comentario.texto.slice(mencao.value.length) : props.comentario.texto,
)

const rotuloAlternador = computed(() =>
  props.respostasExpandidas ? 'Ocultar respostas' : `Ver ${contagem(props.comentario.totalRespostas ?? 0, 'resposta', 'respostas')}`,
)
</script>

<template>
  <div
    class="flex gap-space-3 py-space-4"
    :class="ehResposta ? 'pl-space-10 md:pl-space-12' : ''"
  >
    <AvatarLeitor
      :url="comentario.autor.avatarUrl"
      :tamanho="ehResposta ? 28 : 32"
    />
    <div class="flex min-w-0 flex-1 flex-col">
      <p>
        <span class="text-body-strong text-tinta">{{ comentario.autor.nomeExibicao }}</span>
        <span class="text-caption text-grafite-suave"> · {{ tempoDeEspera(comentario.criadoEm) }}</span>
      </p>
      <p class="mt-space-1 whitespace-pre-wrap text-body text-tinta">
        <span
          v-if="mencao"
          class="text-body-strong"
        >{{ mencao }}</span>{{ restoDoTexto }}
      </p>
      <button
        type="button"
        class="mt-space-2 min-h-12 w-fit cursor-pointer text-caption font-semibold text-grafite hover:underline focus-visible:underline md:min-h-9"
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
