<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import type { PerguntaDeLote } from '../../recomendacoes/useDescarteDeRecomendacao'
import CapaLivro from '../livros/CapaLivro.vue'
import BannerAviso from '../ui/BannerAviso.vue'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'

/**
 * Pergunta de descarte em lote (RF-REC-17, RN-22.12), recomendacoes-recebidas.md do Período 3:
 * bottom sheet abaixo de 768px e dialog de 480px a partir dali. Abre depois de um descarte que já
 * aconteceu, por isso o `Remover todas` é o primário `musgo`, não o destrutivo `rubi` (§5.2). O
 * foco entra em `Agora não`; fechar sem escolher conta como recusa, e enquanto o pedido corre a
 * sobreposição não fecha (§5.3). A falha mantém a pergunta aberta com o banner, e repetir é tocar
 * em `Remover todas` de novo (§5.5).
 *
 * O foco nunca cai fora da sobreposição: enquanto envia, `Remover todas` fica só `aria-disabled`
 * (o `disabled` tiraria o foco dele, e o `Esc` deixaria de chegar ao painel), e a falha leva o
 * foco ao banner, que é anunciado (§5.5). Para onde o foco vai ao fechar é da tela, que conhece a
 * lista (§9).
 */
const props = defineProps<{ pergunta: PerguntaDeLote | null; removendo: boolean; erro: boolean }>()
const emit = defineEmits<{ remover: []; recusar: [] }>()

const banner = ref<{ $el: HTMLElement } | null>(null)

watch(
  () => props.erro,
  async (erro) => {
    if (erro) {
      await nextTick()
      banner.value?.$el.focus()
    }
  },
)

function fechar(): void {
  if (!props.removendo) {
    emit('recusar')
  }
}
</script>

<template>
  <SobreposicaoModal
    :aberta="pergunta !== null"
    :rotulo="pergunta ? `Deseja remover todas as recomendações atuais do livro ${pergunta.livro.titulo}?` : ''"
    id-da-descricao="texto-do-descarte-em-lote"
    foco-inicial="[data-agora-nao]"
    @fechar="fechar"
  >
    <template v-if="pergunta">
      <div class="flex gap-space-4 border-b border-linha pb-space-5">
        <CapaLivro
          :url="pergunta.livro.capaUrl"
          :titulo="pergunta.livro.titulo"
          :autor="pergunta.livro.autor"
          class="h-[90px] w-[60px]"
        />
        <div class="min-w-0">
          <p class="line-clamp-2 text-title-sm text-tinta">
            {{ pergunta.livro.titulo }}
          </p>
          <p
            v-if="pergunta.livro.autor"
            class="truncate text-caption text-grafite"
          >
            {{ pergunta.livro.autor }}
          </p>
        </div>
      </div>
      <h2 class="mt-space-5 text-title text-tinta">
        Deseja remover todas as recomendações atuais do livro {{ pergunta.livro.titulo }}?
      </h2>
      <p
        id="texto-do-descarte-em-lote"
        class="mt-space-3 text-body text-grafite"
      >
        <template v-if="pergunta.restantes === 1">
          Ainda resta <span class="font-mono">1</span> recomendação deste livro na sua lista. Quem recomendou não
          fica sabendo, e ela não volta depois.
        </template>
        <template v-else>
          Ainda restam <span class="font-mono">{{ pergunta.restantes }}</span> recomendações deste livro na sua
          lista. Quem recomendou não fica sabendo, e elas não voltam depois.
        </template>
      </p>
      <BannerAviso
        v-if="erro"
        ref="banner"
        tabindex="-1"
        variante="erro"
        triangulo
        class="mt-space-4"
      >
        Não foi possível remover as recomendações. Verifique sua conexão e tente de novo.
      </BannerAviso>
      <div class="mt-space-6 flex flex-col gap-space-2 md:flex-row-reverse md:items-center md:justify-start md:gap-space-3">
        <BotaoPrimario
          class="h-12 w-full md:h-10 md:w-auto"
          :class="removendo ? 'pointer-events-none cursor-progress opacity-50' : ''"
          :aria-disabled="removendo ? 'true' : undefined"
          :aria-busy="removendo ? 'true' : undefined"
          @click="emit('remover')"
        >
          {{ removendo ? 'Removendo…' : 'Remover todas' }}
        </BotaoPrimario>
        <BotaoTextual
          data-agora-nao
          class="h-12 w-full justify-center md:h-10 md:w-auto"
          :class="removendo ? 'opacity-50' : ''"
          tom="grafite"
          :disabled="removendo"
          @click="emit('recusar')"
        >
          Agora não
        </BotaoTextual>
      </div>
    </template>
  </SobreposicaoModal>
</template>
