<script setup lang="ts">
import { computed } from 'vue'

import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import { contagem, tempoDeEspera } from '../../perfil/textos'
import type { Comentario } from '../../services/social'

/**
 * Um comentário-raiz ou uma resposta (comentarios.md §4): mesmo desenho para os dois, a
 * diferença é o recuo (`space-10` no mobile, `space-12` na web) aplicado só à resposta. **Nunca
 * recursivo** (RN-10): a resposta não tem `Ver respostas`, e uma resposta a uma resposta é
 * renderizada pela `ModalComentarios` como outra resposta no mesmo nível, não um filho aqui.
 *
 * A menção pré-preenchida (`@usuario `) já está em `comentario.texto`, digitada pelo leitor: o
 * componente só a destaca em `body-strong` quando o texto começa por `@${usuarioRespondido}`,
 * porque comentarios.md §4/§10 pede a menção em negrito, nunca como link (RF-SOC-15 é Período 2).
 * Interpolação de texto puro nos dois trechos, nunca `v-html` (RNF-SEC-14).
 */
const props = withDefaults(
  defineProps<{
    comentario: Comentario
    /** Só a raiz com respostas mostra o alternador (`ModalComentarios` decide quando passar). */
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
        class="mt-space-2 min-h-12 w-fit text-caption font-semibold text-grafite hover:underline focus-visible:underline md:min-h-9"
        @click="emit('responder', comentario)"
      >
        Responder
      </button>
      <button
        v-if="mostrarAlternadorDeRespostas"
        type="button"
        class="mt-space-3 flex min-h-12 w-fit items-center gap-space-2 text-caption font-semibold text-musgo before:h-px before:w-4 before:bg-linha md:min-h-9"
        :aria-expanded="respostasExpandidas"
        :disabled="carregandoRespostas"
        @click="emit('alternar-respostas')"
      >
        {{ rotuloAlternador }}
      </button>
    </div>
  </div>
</template>
