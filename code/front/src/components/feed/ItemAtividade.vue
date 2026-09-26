<script setup lang="ts">
import { PhBookmarkSimple, PhChatCircle, PhHeart } from '@phosphor-icons/vue'
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import { contagem, tempoDeEspera } from '../../perfil/textos'
import type { Atividade, TipoAtividade } from '../../services/social'
import CapaLivro from '../livros/CapaLivro.vue'

/**
 * Item do feed (feed.md §4, §4.9): estrutura fixa para os cinco tipos de atividade. O componente
 * só emite a intenção de curtir/descurtir/comentar; quem chama o serviço e decide o estado é a
 * `FeedView` (sem otimismo, RF-SOC-11).
 */
const props = withDefaults(
  defineProps<{
    atividade: Atividade
    /** A `FeedView` marca a curtida em andamento (guarda contra clique duplo, RNF-ERR-04). */
    curtidaPendente?: boolean
  }>(),
  { curtidaPendente: false },
)

const emit = defineEmits<{
  curtir: [id: string]
  descurtir: [id: string]
  comentar: [atividade: Atividade]
}>()

/** Mapa fixo de tipo para verbo (feed.md §8). Abandono não leva estilo diferente (feed.md §4). */
const VERBOS: Record<TipoAtividade, string> = {
  LEITURA_INICIADA: 'começou a ler',
  LEITURA_RETOMADA: 'retomou a leitura',
  LEITURA_FINALIZADA: 'terminou de ler',
  LEITURA_ABANDONADA: 'abandonou a leitura',
  RESENHA_PUBLICADA: 'publicou uma resenha',
}

const verbo = computed(() => VERBOS[props.atividade.tipo])

const perfilDoAutor = computed<RouteLocationRaw>(() => ({
  name: 'perfil-de-outro',
  params: { username: props.atividade.autor.username },
  query: { via: 'feed' },
}))

/** RN-15: livro pessoal só abre pela via autorizada da atividade; oficial vai direto pelo id. */
const linkDoLivro = computed<RouteLocationRaw>(() => {
  const { livro, id } = props.atividade
  if (livro.tipo === 'PESSOAL') {
    return { name: 'livro-pessoal', params: { id: livro.id }, query: { via: 'feed', referenciaId: id } }
  }
  return { name: 'livro-oficial', params: { id: livro.id } }
})

const rotuloCurtir = computed(() =>
  `${props.atividade.curtidaPeloSolicitante ? 'Descurtir' : 'Curtir'}, ${contagem(props.atividade.totalCurtidas, 'curtida', 'curtidas')}`,
)

const rotuloComentar = computed(() =>
  props.atividade.totalComentarios === 0 ? 'Comentar' : contagem(props.atividade.totalComentarios, 'comentário', 'comentários'),
)

function alternarCurtida(): void {
  if (props.curtidaPendente) {
    return
  }
  if (props.atividade.curtidaPeloSolicitante) {
    emit('descurtir', props.atividade.id)
  } else {
    emit('curtir', props.atividade.id)
  }
}
</script>

<template>
  <article class="flex flex-col gap-space-2 border-b border-linha py-space-5">
    <div class="flex items-center gap-space-3">
      <RouterLink
        :to="perfilDoAutor"
        class="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
      >
        <AvatarLeitor
          :url="atividade.autor.avatarUrl"
          :tamanho="40"
        />
      </RouterLink>
      <p class="min-w-0">
        <RouterLink
          :to="perfilDoAutor"
          class="text-title-sm text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        >
          {{ atividade.autor.nomeExibicao }}
        </RouterLink>
        <span class="text-caption text-grafite-suave"> · {{ tempoDeEspera(atividade.criadoEm) }}</span>
      </p>
    </div>

    <p class="text-body text-grafite">
      {{ verbo }}
    </p>

    <RouterLink
      :to="linkDoLivro"
      class="flex items-start gap-space-4 rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:hover:bg-papel-elevado"
    >
      <CapaLivro
        class="h-[120px] w-20 md:h-[150px] md:w-[100px]"
        :url="atividade.livro.capaUrl"
        :rotulo="`Capa de ${atividade.livro.titulo}`"
      />
      <div class="flex min-w-0 flex-col">
        <p class="line-clamp-2 text-title-sm text-tinta md:text-title">
          {{ atividade.livro.titulo }}
        </p>
        <p class="mt-space-1 text-caption text-grafite md:text-body">
          {{ atividade.livro.autor }}
        </p>
        <span
          v-if="atividade.livro.tipo === 'PESSOAL'"
          class="mt-space-2 inline-flex w-fit items-center gap-space-1 rounded-full border border-linha bg-papel-elevado px-space-3 py-space-1 text-caption font-semibold text-grafite"
        >
          <PhBookmarkSimple
            :size="16"
            weight="regular"
            aria-hidden="true"
          />
          Livro pessoal
        </span>
      </div>
    </RouterLink>

    <div
      v-if="atividade.tipo === 'RESENHA_PUBLICADA' && atividade.resenha"
      class="mt-space-3 flex flex-col gap-space-2"
    >
      <p class="line-clamp-3 font-serif text-body text-grafite md:line-clamp-4">
        {{ atividade.resenha.texto }}
      </p>
      <!--
        Sem navegação real: a página de resenha (F-AVA) não existe nesta entrega. O controle é
        renderizado conforme feed.md §4.9/§9 (anuncia que o trecho está truncado), mas o clique
        não faz nada até F-AVA existir — documentado no relatório da Task 7.
      -->
      <button
        type="button"
        class="w-fit text-caption text-musgo hover:underline focus-visible:underline"
      >
        Ler resenha
      </button>
    </div>

    <div class="mt-space-4 flex items-center gap-space-3">
      <button
        type="button"
        class="flex min-h-12 items-center gap-space-1 rounded-full px-space-3 text-caption disabled:cursor-not-allowed disabled:opacity-60 md:min-h-9 md:hover:bg-musgo-fundo"
        :class="atividade.curtidaPeloSolicitante ? 'text-musgo' : 'text-grafite'"
        :disabled="curtidaPendente"
        :aria-label="rotuloCurtir"
        @click="alternarCurtida"
      >
        <PhHeart
          :size="20"
          :weight="atividade.curtidaPeloSolicitante ? 'fill' : 'regular'"
          aria-hidden="true"
        />
        <span v-if="atividade.totalCurtidas > 0">{{ atividade.totalCurtidas }}</span>
      </button>
      <button
        type="button"
        class="flex min-h-12 items-center gap-space-1 rounded-full px-space-3 text-caption text-grafite md:min-h-9"
        :aria-label="rotuloComentar"
        @click="emit('comentar', atividade)"
      >
        <PhChatCircle
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        <span v-if="atividade.totalComentarios > 0">{{ atividade.totalComentarios }}</span>
      </button>
      <span
        v-if="atividade.totalCurtidas > 0"
        class="ml-auto text-caption text-grafite-suave"
      >
        {{ contagem(atividade.totalCurtidas, 'curtida', 'curtidas') }}
      </span>
    </div>
  </article>
</template>
