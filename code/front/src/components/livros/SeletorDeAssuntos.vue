<script setup lang="ts">
import { PhArrowClockwise, PhCheck, PhMagnifyingGlass, PhWarningCircle, PhX } from '@phosphor-icons/vue'
import { computed, nextTick, ref, useId, watch } from 'vue'

import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'
import { contagem } from '../../perfil/textos'
import { useSeletorDeAssuntos, type OpcoesDoSeletor } from '../../livros/useSeletorDeAssuntos'
import type { AssuntoResumo } from '../../services/acervo'

/**
 * Seletor múltiplo de assuntos do livro pessoal (F-ACV-OPC; cadastro-pessoal.md §5.1 a §5.5 e
 * §5.7): bottom sheet abaixo de 768px, dialog de 560px acima, sobre `SobreposicaoModal`.
 *
 * A lista é fechada (RN-21.1): a busca só filtra, sem diferenciar acento, e nunca oferece criar.
 * Marcar só muda a seleção dentro do seletor. `Concluir` a aplica; scrim, `Esc`, `X` e `Fechar`
 * descartam sem perguntar, porque nada foi salvo ainda. Falha ao carregar fica restrita aqui: o
 * formulário continua salvando sem assuntos.
 */
const props = defineProps<{
  aberta: boolean
  escolhidos: AssuntoResumo[]
  /** Só para os testes; a tela usa o `acervoService`. */
  servico?: OpcoesDoSeletor['servico']
}>()

const emit = defineEmits<{ concluir: [assuntos: AssuntoResumo[]]; fechar: [] }>()

const tela = useSeletorDeAssuntos({ servico: props.servico })
const { estado, coldStart, assuntos, filtrados, busca, marcados } = tela

const idBusca = useId()
const campoDeBusca = ref<HTMLInputElement | null>(null)
const tentarDeNovo = ref<HTMLButtonElement | null>(null)
const titulo = ref<HTMLHeadingElement | null>(null)

const escolhidosNoTitulo = computed(() =>
  marcados.value.length === 0 ? 'Nenhum escolhido' : contagem(marcados.value.length, 'escolhido', 'escolhidos'),
)
const buscando = computed(() => busca.value.trim() !== '')
const resultado = computed(() => contagem(filtrados.value.length, 'assunto', 'assuntos'))
// Sem resultado também é anunciado (§9): o bloco "Nenhum assunto com …" não fica numa região viva.
const anuncioDaBusca = computed(() => {
  if (estado.value !== 'pronto' || !buscando.value) {
    return ''
  }
  return filtrados.value.length > 0 ? resultado.value : `Nenhum assunto com "${busca.value.trim()}".`
})
// Enquanto a lista carrega, a busca está desabilitada e não recebe foco. O foco vai para o título
// do painel, senão fica atrás do scrim: Esc não fecharia e o Tab andaria pela página. O watch de
// `estado` leva o foco para a busca quando a lista chega.
const focoInicial = computed(() => (estado.value === 'pronto' ? '[data-busca]' : '[data-titulo]'))

watch(
  () => props.aberta,
  (aberta) => {
    if (aberta) {
      tela.abrir(props.escolhidos)
    } else {
      tela.descartar()
    }
  },
  { immediate: true },
)

// A lista que chega depois da abertura leva o foco para a busca (§9); a falha, para `Tentar de novo`.
watch(estado, async (novo) => {
  if (!props.aberta) {
    return
  }
  await nextTick()
  if (novo === 'pronto' && !campoDeBusca.value?.contains(document.activeElement)) {
    campoDeBusca.value?.focus()
  } else if (novo === 'erro') {
    tentarDeNovo.value?.focus()
  }
})

function concluir(): void {
  emit('concluir', tela.concluir())
}

function fechar(): void {
  emit('fechar')
}

async function limparBusca(): Promise<void> {
  busca.value = ''
  await nextTick()
  campoDeBusca.value?.focus()
}

// `Limpar` some quando nada fica marcado; com o foco nele, o foco iria para o `body`, fora do
// painel (Esc não fecharia e o Tab sairia para a página). Vai para a busca.
async function limpar(): Promise<void> {
  tela.limpar()
  await nextTick()
  campoDeBusca.value?.focus()
}

// `Tentar de novo` dá lugar ao skeleton, e a busca segue desabilitada até a lista chegar: o foco
// fica no título do painel, como na abertura com a lista carregando.
function tentarCarregarDeNovo(): void {
  titulo.value?.focus()
  void tela.carregar()
}
</script>

<template>
  <SobreposicaoModal
    :aberta="aberta"
    rotulo="Assuntos"
    largura-dialogo="560px"
    :foco-inicial="focoInicial"
    @fechar="fechar"
  >
    <!-- Altura máxima sempre pela viewport, também no dialog: 592px ou o que couber na tela, menos
         os 32px do scrim em cima e embaixo e o padding superior do painel (5.5rem). Assim, com o
         celular deitado ou numa janela baixa, título, busca e rodapé ficam visíveis e só o miolo rola. -->
    <div class="-mx-space-6 -mb-space-6 flex max-h-[calc(85dvh-3rem)] flex-col md:max-h-[min(592px,calc(100dvh-5.5rem))]">
      <header class="flex items-start justify-between gap-space-4 px-space-6">
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline justify-between gap-space-4">
            <h2
              ref="titulo"
              data-titulo
              tabindex="-1"
              class="text-title-sm text-tinta outline-none"
            >
              Assuntos
            </h2>
            <p
              v-if="estado === 'pronto'"
              class="shrink-0 text-caption text-grafite"
            >
              {{ escolhidosNoTitulo }}
            </p>
          </div>
          <p class="mt-space-2 text-caption text-grafite">
            Os assuntos vêm de uma lista fixa do Lê Ai.
          </p>
        </div>
        <button
          type="button"
          class="-mr-space-2 -mt-space-2 hidden size-10 shrink-0 cursor-pointer items-center justify-center rounded-base text-grafite hover:bg-linha md:flex"
          aria-label="Fechar"
          @click="fechar"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </header>

      <div class="relative mt-space-4 px-space-6">
        <label
          :for="idBusca"
          class="sr-only"
        >Buscar assunto</label>
        <PhMagnifyingGlass
          :size="20"
          weight="regular"
          class="pointer-events-none absolute left-[calc(var(--spacing-space-6)+var(--spacing-space-4))] top-1/2 -translate-y-1/2"
          :class="estado === 'pronto' ? 'text-grafite' : 'text-grafite-suave'"
          aria-hidden="true"
        />
        <input
          :id="idBusca"
          ref="campoDeBusca"
          v-model="busca"
          data-busca
          type="search"
          autocomplete="off"
          placeholder="Buscar assunto"
          :disabled="estado !== 'pronto'"
          class="h-12 w-full rounded-base border border-linha bg-papel-elevado pl-12 pr-12 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave focus:border-[1.5px] focus:border-musgo disabled:cursor-not-allowed dark:bg-papel md:h-11 [&::-webkit-search-cancel-button]:hidden"
        >
        <button
          v-if="busca && estado === 'pronto'"
          type="button"
          class="absolute right-space-6 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center text-grafite md:size-11"
          aria-label="Limpar busca"
          @click="limparBusca"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>

      <p
        class="sr-only"
        aria-live="polite"
      >
        {{ anuncioDaBusca }}
      </p>

      <div class="relative mt-space-4 min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-space-6">
        <div
          v-if="estado === 'carregando'"
          class="entrada pb-space-4"
          role="status"
        >
          <span class="sr-only">Carregando assuntos</span>
          <div
            class="flex flex-col gap-space-2"
            aria-hidden="true"
          >
            <div
              v-for="(linha, i) in [[96, 80, 120, 72], [112, 88, 64], [80, 128, 96]]"
              :key="i"
              class="flex gap-space-2"
            >
              <span
                v-for="(largura, j) in linha"
                :key="j"
                class="h-8 rounded-full bg-linha"
                :style="{ width: `${largura}px` }"
              />
            </div>
          </div>
          <p
            v-if="coldStart"
            class="mt-space-4 text-caption text-grafite"
          >
            O serviço está iniciando. Isso pode levar alguns segundos.
          </p>
        </div>

        <div
          v-else-if="estado === 'erro'"
          class="pb-space-4"
        >
          <div role="alert">
            <PhWarningCircle
              :size="24"
              weight="regular"
              class="text-rubi"
              aria-hidden="true"
            />
            <p class="mt-space-3 text-body-strong text-tinta">
              Não foi possível carregar os assuntos.
            </p>
            <p class="mt-space-2 text-body text-grafite">
              Você pode salvar o livro agora e escolher os assuntos depois, em Editar livro.
            </p>
          </div>
          <button
            ref="tentarDeNovo"
            type="button"
            class="mt-space-4 inline-flex h-12 cursor-pointer items-center gap-space-2 rounded-base border border-linha px-space-4 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-papel-elevado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-11"
            @click="tentarCarregarDeNovo"
          >
            <PhArrowClockwise
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
            Tentar de novo
          </button>
        </div>

        <div
          v-else-if="filtrados.length === 0 && buscando"
          class="pb-space-4 pt-space-2"
        >
          <p class="text-body-strong text-tinta">
            Nenhum assunto com "{{ busca.trim() }}".
          </p>
          <p class="mt-space-2 text-body text-grafite">
            A lista é fixa: escolha o assunto mais próximo, como Ficção literária ou Fantasia.
          </p>
        </div>

        <template v-else>
          <p
            v-if="buscando"
            class="mb-space-3 text-caption text-grafite"
          >
            {{ resultado }}
          </p>
          <!-- Chip de 32px visíveis dentro de alvo de 48px no celular (§2, como o FiltroAssuntos do
               Descobrir); na web larga o alvo é o próprio chip, com 16px entre as linhas. -->
          <ul
            class="flex flex-wrap gap-x-space-2 pb-space-6 md:gap-y-space-4"
            :aria-label="buscando ? undefined : `${assuntos.length} assuntos da lista`"
          >
            <li
              v-for="assunto in filtrados"
              :key="assunto.id"
            >
              <button
                type="button"
                role="checkbox"
                :aria-checked="tela.marcado(assunto.id)"
                class="group flex min-h-12 cursor-pointer items-center outline-none md:min-h-0"
                @click="tela.alternar(assunto.id)"
              >
                <span
                  class="inline-flex h-8 items-center gap-space-1 whitespace-nowrap rounded-full px-space-3 text-caption group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-musgo motion-safe:transition-colors motion-safe:duration-dur-fast"
                  :class="tela.marcado(assunto.id)
                    ? 'bg-musgo-fundo font-semibold text-musgo'
                    : 'border border-linha text-tinta group-hover:bg-papel-elevado'"
                >
                  <PhCheck
                    v-if="tela.marcado(assunto.id)"
                    :size="16"
                    weight="regular"
                    aria-hidden="true"
                  />
                  {{ assunto.nome }}
                </span>
              </button>
            </li>
          </ul>
          <div
            class="pointer-events-none sticky bottom-0 -mt-space-6 h-6 bg-linear-to-t from-papel dark:from-papel-elevado"
            aria-hidden="true"
          />
        </template>
      </div>

      <footer
        class="flex items-center gap-space-4 border-t border-linha px-space-6 py-space-4 pb-[calc(var(--spacing-space-4)+env(safe-area-inset-bottom))] md:justify-end md:border-t-0 md:pb-space-6 md:pt-space-4"
      >
        <BotaoTextual
          v-if="marcados.length > 0 && estado === 'pronto'"
          class="min-h-12 md:min-h-10"
          tom="grafite"
          @click="limpar"
        >
          Limpar
        </BotaoTextual>
        <BotaoTextual
          v-if="estado === 'erro'"
          class="ml-auto min-h-12 md:ml-0 md:min-h-10"
          tom="grafite"
          @click="fechar"
        >
          Fechar
        </BotaoTextual>
        <BotaoPrimario
          v-else
          class="ml-auto h-12 max-md:w-auto md:ml-0 md:h-10 md:w-auto"
          aparencia-desabilitada="esmaecida"
          :disabled="estado !== 'pronto'"
          @click="concluir"
        >
          Concluir
        </BotaoPrimario>
      </footer>
    </div>
  </SobreposicaoModal>
</template>
