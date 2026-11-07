<script setup lang="ts">
import { PhCaretDown, PhCaretRight, PhPencilSimple, PhTag, PhWarning, PhX } from '@phosphor-icons/vue'
import { computed, nextTick, ref, useId, watch } from 'vue'

import SeletorDeAssuntos from './SeletorDeAssuntos.vue'
import { ASSUNTOS_RECOMENDADOS, avisoDeMuitosAssuntos, emOrdemAlfabetica, listaComE } from '../../livros/assuntos'
import type { OpcoesDoSeletor } from '../../livros/useSeletorDeAssuntos'
import { contagem } from '../../perfil/textos'
import type { AssuntoResumo } from '../../services/acervo'

/**
 * Campo `Assuntos` do formulário de livro pessoal (F-ACV-OPC; cadastro-pessoal.md §4.1, §4.5 e
 * §9). Não é campo de texto: sem assunto, um gatilho com desenho de campo abre o seletor; com
 * assuntos, chips alfabéticos com `X` e `Alterar assuntos`.
 *
 * A partir do sexto, o helper vira um aviso que **não bloqueia** (RN-21.2). O erro do servidor
 * entra no lugar do helper, mantém os chips e leva o foco a `Alterar assuntos`.
 */
const props = withDefaults(
  defineProps<{
    modelValue: AssuntoResumo[]
    erro?: string
    /** Salvando: chips neutros, sem `X`, e `Alterar assuntos` sem ação (§4.5). */
    desabilitado?: boolean
    /** Só para os testes; a tela usa o `acervoService`. */
    servico?: OpcoesDoSeletor['servico']
  }>(),
  { erro: undefined, desabilitado: false, servico: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [assuntos: AssuntoResumo[]] }>()

const idRotulo = useId()
const idAjuda = useId()
const aberto = ref(false)
const raiz = ref<HTMLElement | null>(null)

const escolhidos = computed(() => emOrdemAlfabetica(props.modelValue))
const nomes = computed(() => escolhidos.value.map((assunto) => assunto.nome))
const muitos = computed(() => escolhidos.value.length > ASSUNTOS_RECOMENDADOS)

const rotuloDoGatilho = 'Assuntos, nenhum escolhido, escolher'
const rotuloDoAlterar = computed(
  () => `Assuntos, ${contagem(nomes.value.length, 'escolhido', 'escolhidos')}: ${listaComE(nomes.value)}, alterar`,
)

/** O aviso é anunciado uma vez, quando aparece, sem roubar o foco (§9). */
const anuncio = ref('')
watch(muitos, (agora) => {
  anuncio.value = agora ? avisoDeMuitosAssuntos(escolhidos.value.length) : ''
})

function focar(seletor: string): void {
  raiz.value?.querySelector<HTMLElement>(seletor)?.focus()
}

watch(
  () => props.erro,
  async (erro) => {
    if (!erro) {
      return
    }
    await nextTick()
    focar(escolhidos.value.length > 0 ? '[data-alterar]' : '[data-gatilho]')
  },
)

async function remover(indice: number): Promise<void> {
  const restantes = escolhidos.value.filter((_, i) => i !== indice)
  emit('update:modelValue', restantes)
  await nextTick()
  if (indice < restantes.length) {
    focar(`[data-remover="${restantes[indice]!.id}"]`)
  } else {
    focar(restantes.length > 0 ? '[data-alterar]' : '[data-gatilho]')
  }
}

function abrir(): void {
  if (!props.desabilitado) {
    aberto.value = true
  }
}

async function concluir(assuntos: AssuntoResumo[]): Promise<void> {
  emit('update:modelValue', assuntos)
  aberto.value = false
  // O seletor devolve o foco a quem o abriu, mas o gatilho some quando chegam chips (e volta
  // quando a seleção esvazia): o foco vai para o que ficou no lugar.
  await nextTick()
  focar(assuntos.length > 0 ? '[data-alterar]' : '[data-gatilho]')
}
</script>

<template>
  <div
    ref="raiz"
    role="group"
    :aria-labelledby="idRotulo"
    class="flex flex-col gap-space-2"
  >
    <span
      :id="idRotulo"
      class="text-label text-grafite"
    >Assuntos</span>

    <button
      v-if="escolhidos.length === 0"
      type="button"
      data-gatilho
      :aria-label="rotuloDoGatilho"
      :aria-describedby="idAjuda"
      :disabled="desabilitado"
      class="flex h-12 w-full cursor-pointer items-center gap-space-3 rounded-base border border-linha bg-papel-elevado px-space-4 text-left text-body text-grafite transition-colors duration-dur-fast focus-visible:border-[1.5px] focus-visible:border-musgo focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-linha disabled:text-grafite-suave md:h-11"
      @click="abrir"
    >
      <PhTag
        :size="20"
        weight="regular"
        class="shrink-0"
        aria-hidden="true"
      />
      <span class="flex-1">Escolher assuntos</span>
      <PhCaretRight
        :size="20"
        weight="regular"
        class="shrink-0 md:hidden"
        aria-hidden="true"
      />
      <PhCaretDown
        :size="20"
        weight="regular"
        class="hidden shrink-0 md:block"
        aria-hidden="true"
      />
    </button>

    <template v-else>
      <ul class="flex flex-wrap gap-space-2">
        <li
          v-for="(assunto, indice) in escolhidos"
          :key="assunto.id"
          class="inline-flex h-8 items-center gap-space-1 rounded-full text-caption"
          :class="desabilitado
            ? 'bg-papel-elevado px-space-3 text-grafite'
            : 'bg-musgo-fundo pl-space-3 pr-space-2 font-semibold text-musgo'"
        >
          {{ assunto.nome }}
          <button
            v-if="!desabilitado"
            type="button"
            :data-remover="assunto.id"
            :aria-label="`Remover ${assunto.nome}`"
            class="-my-space-2 -mr-space-2 flex size-12 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-8px] focus-visible:outline-musgo md:my-0 md:size-8 md:-mr-space-1"
            @click="remover(indice)"
          >
            <PhX
              :size="16"
              weight="regular"
              aria-hidden="true"
            />
          </button>
        </li>
      </ul>
      <button
        type="button"
        data-alterar
        :aria-label="rotuloDoAlterar"
        :aria-describedby="idAjuda"
        :disabled="desabilitado"
        class="mt-space-1 inline-flex min-h-12 cursor-pointer items-center gap-space-2 self-start text-body-strong text-musgo underline-offset-2 hover:underline focus-visible:underline disabled:cursor-not-allowed disabled:text-grafite-suave disabled:no-underline md:min-h-10"
        @click="abrir"
      >
        <PhPencilSimple
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        Alterar assuntos
      </button>
    </template>

    <p
      v-if="erro"
      :id="idAjuda"
      class="text-caption text-rubi"
    >
      {{ erro }}
    </p>
    <p
      v-else-if="muitos"
      :id="idAjuda"
      class="flex items-start gap-space-2 text-caption text-tinta"
    >
      <PhWarning
        :size="16"
        weight="regular"
        class="mt-px shrink-0 text-ambar"
        aria-hidden="true"
      />
      {{ avisoDeMuitosAssuntos(escolhidos.length) }}
    </p>
    <p
      v-else
      :id="idAjuda"
      class="text-caption text-grafite"
    >
      Opcional. Escolha da lista do Lê Ai, de preferência até 5.
    </p>
    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ anuncio }}
    </p>

    <SeletorDeAssuntos
      :aberta="aberto"
      :escolhidos="escolhidos"
      :servico="servico"
      @concluir="concluir"
      @fechar="aberto = false"
    />
  </div>
</template>
