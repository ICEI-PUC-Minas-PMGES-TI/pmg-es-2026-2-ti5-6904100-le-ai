<script setup lang="ts">
import { PhBookmarkSimple, PhChatCircle, PhEyeSlash, PhHeart } from '@phosphor-icons/vue'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import { verboDeAtividade } from '../../feed/verbos'
import { contagem, tempoDeEspera } from '../../perfil/textos'
import type { Atividade } from '../../services/social'
import CapaLivro from '../livros/CapaLivro.vue'
import EstrelasNota from '../livros/EstrelasNota.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'

const props = defineProps<{
  atividade: Atividade
}>()

const emit = defineEmits<{
  curtir: [id: string]
  descurtir: [id: string]
  comentar: [atividade: Atividade]
}>()

const verbo = computed(() => verboDeAtividade(props.atividade.tipo))

const perfilDoAutor = computed<RouteLocationRaw>(() => ({
  name: 'perfil-de-outro',
  params: { username: props.atividade.autor.username },
  query: { via: 'feed' },
}))

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
  if (props.atividade.curtidaPeloSolicitante) {
    emit('descurtir', props.atividade.id)
  } else {
    emit('curtir', props.atividade.id)
  }
}
/** O `after` estende a área de toque para 48px no mobile sem mudar o tamanho visual. */
const CLASSE_BOTAO_DE_ACAO =
  'relative flex h-8 cursor-pointer items-center gap-space-1 rounded-full border border-linha px-space-3 text-caption transition-colors duration-dur-fast after:absolute after:inset-x-0 after:-inset-y-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:h-9 md:after:hidden md:hover:bg-musgo-fundo'

const TOTAL_DE_PARTICULAS = 6
const ANGULOS_DAS_PARTICULAS = Array.from({ length: TOTAL_DE_PARTICULAS }, (_, i) => (360 / TOTAL_DE_PARTICULAS) * i)

const celebrando = ref(false)

/**
 * Resenha com spoiler (RF-AVA-03): o texto **não está no DOM** até "Mostrar mesmo assim", como
 * no `CardResenha` da página do livro. Ao revelar, o foco vai para o texto, para o leitor de tela
 * continuar dali.
 */
const spoilerRevelado = ref(false)
const textoDaResenha = useTemplateRef<HTMLParagraphElement>('textoDaResenha')

async function revelarSpoiler(): Promise<void> {
  spoilerRevelado.value = true
  await nextTick()
  textoDaResenha.value?.focus()
}

watch(
  () => props.atividade.curtidaPeloSolicitante,
  (curtida, antes) => {
    if (curtida && !antes) {
      celebrando.value = true
    }
  },
)
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
        <p
          v-if="atividade.livro.autor"
          class="mt-space-1 text-caption text-grafite md:text-body"
        >
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
      <EstrelasNota
        v-if="atividade.resenha.nota !== null"
        :valor="atividade.resenha.nota"
        tamanho="sm"
      />
      <div
        v-if="atividade.resenha.spoiler && !spoilerRevelado"
        class="flex flex-col items-start gap-space-2 rounded-base border border-linha bg-papel-elevado p-space-4"
      >
        <p class="flex items-center gap-space-2 text-caption text-grafite">
          <PhEyeSlash
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
          Esta resenha contém spoiler
        </p>
        <BotaoTextual
          class="min-h-12 md:min-h-10"
          @click="revelarSpoiler"
        >
          Mostrar mesmo assim
        </BotaoTextual>
      </div>
      <p
        v-else
        ref="textoDaResenha"
        tabindex="-1"
        class="line-clamp-3 font-editorial text-body text-grafite outline-none md:line-clamp-4"
      >
        {{ atividade.resenha.texto }}
      </p>
      <button
        type="button"
        class="w-fit cursor-pointer text-caption text-musgo hover:underline focus-visible:underline"
      >
        Ler resenha
      </button>
    </div>

    <div class="mt-space-4 flex items-center gap-space-3">
      <button
        type="button"
        :class="[CLASSE_BOTAO_DE_ACAO, atividade.curtidaPeloSolicitante ? 'text-musgo' : 'text-grafite']"
        :aria-label="rotuloCurtir"
        @click="alternarCurtida"
      >
        <span
          class="relative inline-flex"
          :class="{ 'coracao-pulsando': celebrando }"
          @animationend.self="celebrando = false"
        >
          <PhHeart
            :size="20"
            :weight="atividade.curtidaPeloSolicitante ? 'fill' : 'regular'"
            aria-hidden="true"
          />
          <template v-if="celebrando">
            <span
              v-for="angulo in ANGULOS_DAS_PARTICULAS"
              :key="angulo"
              class="particula"
              :style="{ '--angulo': `${angulo}deg` }"
              aria-hidden="true"
            />
          </template>
        </span>
        <span v-if="atividade.totalCurtidas > 0">{{ atividade.totalCurtidas }}</span>
      </button>
      <button
        type="button"
        :class="[CLASSE_BOTAO_DE_ACAO, 'text-grafite']"
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

<style scoped>
.coracao-pulsando {
  animation: coracao-pulsar var(--duration-base) var(--easing-out);
}

.particula {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  margin: -2px;
  border-radius: 9999px;
  background-color: var(--color-musgo);
  pointer-events: none;
  animation: particula-soltar var(--duration-base) var(--easing-out) forwards;
}

.particula:nth-child(odd) {
  background-color: var(--color-musgo-vivo);
}

@keyframes coracao-pulsar {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes particula-soltar {
  0% {
    opacity: 1;
    transform: rotate(var(--angulo)) translateY(-10px) scale(1);
  }
  60% {
    opacity: 1;
    transform: rotate(var(--angulo)) translateY(-18px) scale(1);
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angulo)) translateY(-20px) scale(0);
  }
}
</style>
