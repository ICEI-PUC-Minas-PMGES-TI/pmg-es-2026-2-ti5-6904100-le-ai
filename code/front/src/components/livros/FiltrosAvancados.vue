<script setup lang="ts">
import { PhCaretDown, PhCaretUp } from '@phosphor-icons/vue'
import { computed, nextTick, ref, watch } from 'vue'

import {
  DIGITOS_DAS_PAGINAS,
  DIGITOS_DO_ANO,
  contarFiltros,
  type ErrosDosFiltros,
  type FiltrosAplicados,
  filtrosDoRascunho,
  MAXIMO_DO_TEXTO,
  rascunhoDe,
  rascunhoPreenchido,
  soDigitos,
  temErros,
  validarRascunho,
} from '../../livros/filtrosDaBusca'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import CampoTexto from '../ui/CampoTexto.vue'

/**
 * Formulário dos filtros avançados do Descobrir (RF-ACV-03, descobrir.md do Período 2).
 *
 * - `painel`: o bloco `Filtros` da web, no topo do painel de 240px, acima de `Assuntos`. Recolhível
 *   e fechado ao abrir a tela; fechado, o título mostra quantos filtros estão ativos. Botão
 *   secundário, e `Limpar filtros` só com algum campo preenchido. Diverge do protótipo (abaixo de
 *   `Assuntos` e sempre aberto) por decisão do dono em 07/10/2026.
 * - `folha`: o conteúdo da bottom sheet abaixo de 768px. Título, texto de apoio, botão primário e
 *   `Limpar filtros` sempre. O foco ao abrir vai para o título, não para um campo, para o teclado
 *   virtual não subir.
 *
 * Texto livre, sem autocompletar. A validação roda no blur e ao aplicar, nunca a cada dígito; com
 * erro, nada vai ao servidor e o foco vai para `Mínimo de páginas`. `Enter` em qualquer campo
 * aplica (é um `<form>`).
 */
const props = defineProps<{
  aplicados: FiltrosAplicados
  variante: 'painel' | 'folha'
}>()

const emit = defineEmits<{
  aplicar: [filtros: FiltrosAplicados]
  limpar: []
}>()

const rascunho = ref(rascunhoDe(props.aplicados))
const erros = ref<ErrosDosFiltros>({})
const avisoDeErro = ref('')
const raiz = ref<HTMLFormElement | null>(null)

// Chip removido ou URL que mudou: o formulário mostra o que está valendo.
watch(
  () => props.aplicados,
  (aplicados) => {
    rascunho.value = rascunhoDe(aplicados)
    erros.value = {}
  },
)

const preenchido = computed(() => rascunhoPreenchido(rascunho.value))
const folha = computed(() => props.variante === 'folha')
/** Só o painel recolhe; a folha já é aberta por um botão. */
const aberto = ref(false)
const ativos = computed(() => contarFiltros(props.aplicados))
const prefixo = computed(() => `filtros-${props.variante}`)

const textoLimitado = (bruto: string, cursor: number) => ({
  valor: bruto.slice(0, MAXIMO_DO_TEXTO),
  cursor: Math.min(cursor, MAXIMO_DO_TEXTO),
})
const mascaraDoAno = soDigitos(DIGITOS_DO_ANO)
const mascaraDasPaginas = soDigitos(DIGITOS_DAS_PAGINAS)

/** No blur: só revalida os campos numéricos, sem anunciar. */
function validarAoSair(): void {
  erros.value = validarRascunho(rascunho.value)
}

async function aplicar(): Promise<void> {
  erros.value = validarRascunho(rascunho.value)
  if (temErros(erros.value)) {
    avisoDeErro.value = erros.value.faixa ?? erros.value.paginasMin ?? erros.value.paginasMax ?? erros.value.ano ?? ''
    await nextTick()
    const alvo = erros.value.ano && !erros.value.faixa && !erros.value.paginasMin && !erros.value.paginasMax
      ? 'ano'
      : 'paginas-min'
    raiz.value?.querySelector<HTMLInputElement>(`#${prefixo.value}-${alvo}`)?.focus()
    return
  }
  avisoDeErro.value = ''
  emit('aplicar', filtrosDoRascunho(rascunho.value))
}

function limpar(): void {
  rascunho.value = rascunhoDe({
    autor: null,
    editora: null,
    serie: null,
    ano: null,
    paginasMin: null,
    paginasMax: null,
  })
  erros.value = {}
  avisoDeErro.value = ''
  emit('limpar')
}
</script>

<template>
  <form
    ref="raiz"
    novalidate
    :aria-labelledby="`${prefixo}-titulo`"
    @submit.prevent="aplicar"
  >
    <h2
      v-if="folha"
      :id="`${prefixo}-titulo`"
      tabindex="-1"
      data-foco-inicial
      class="text-title text-tinta outline-none"
    >
      Filtros
    </h2>
    <h2
      v-else
      :id="`${prefixo}-titulo`"
      class="text-label text-grafite"
    >
      <button
        type="button"
        class="flex min-h-10 w-full items-center justify-between gap-space-2 rounded-base px-space-3 text-left transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
        :aria-expanded="aberto"
        :aria-controls="`${prefixo}-corpo`"
        @click="aberto = !aberto"
      >
        <span>
          Filtros<span
            v-if="ativos"
            class="font-semibold text-musgo"
          > · {{ ativos === 1 ? '1 ativo' : `${ativos} ativos` }}</span>
        </span>
        <component
          :is="aberto ? PhCaretUp : PhCaretDown"
          :size="16"
          weight="regular"
          aria-hidden="true"
        />
      </button>
    </h2>
    <p
      v-if="folha"
      class="mt-space-2 text-body text-grafite"
    >
      Preencha só o que quiser usar. Os filtros valem junto com a busca e o assunto.
    </p>

    <div
      v-show="folha || aberto"
      :id="`${prefixo}-corpo`"
    >
      <div
        class="flex flex-col gap-space-4"
        :class="folha ? 'mt-space-5' : 'mt-space-3 md:px-space-3'"
      >
        <CampoTexto
          :id="`${prefixo}-autor`"
          v-model="rascunho.autor"
          label="Autor"
          placeholder="Nome do autor"
          autocomplete="off"
          :mascara="textoLimitado"
        />
        <CampoTexto
          :id="`${prefixo}-editora`"
          v-model="rascunho.editora"
          label="Editora"
          placeholder="Nome da editora"
          autocomplete="off"
          :mascara="textoLimitado"
        />
        <CampoTexto
          :id="`${prefixo}-serie`"
          v-model="rascunho.serie"
          label="Série"
          placeholder="Nome da série"
          autocomplete="off"
          :mascara="textoLimitado"
        />
        <CampoTexto
          :id="`${prefixo}-ano`"
          v-model="rascunho.ano"
          label="Ano de publicação"
          placeholder="Ex.: 2019"
          inputmode="numeric"
          autocomplete="off"
          :erro="erros.ano"
          :mascara="mascaraDoAno"
          @blur="validarAoSair"
        />

        <div class="flex flex-col gap-space-2">
          <div class="flex min-w-0 gap-space-3">
            <CampoTexto
              :id="`${prefixo}-paginas-min`"
              v-model="rascunho.paginasMin"
              class="min-w-0 flex-1"
              label="Mínimo de páginas"
              inputmode="numeric"
              autocomplete="off"
              :erro="erros.paginasMin"
              :borda-de-erro="Boolean(erros.faixa)"
              sufixo="págs"
              :mascara="mascaraDasPaginas"
              @blur="validarAoSair"
            />
            <CampoTexto
              :id="`${prefixo}-paginas-max`"
              v-model="rascunho.paginasMax"
              class="min-w-0 flex-1"
              label="Máximo de páginas"
              inputmode="numeric"
              autocomplete="off"
              :erro="erros.paginasMax"
              :borda-de-erro="Boolean(erros.faixa)"
              sufixo="págs"
              :mascara="mascaraDasPaginas"
              @blur="validarAoSair"
            />
          </div>
          <p
            v-if="erros.faixa"
            class="text-caption text-rubi"
          >
            {{ erros.faixa }}
          </p>
          <p class="text-caption text-grafite">
            Use números inteiros maiores que zero.
          </p>
        </div>
      </div>

      <!-- Região fixa: anuncia o erro que barrou o envio (região que nasce com o texto não é lida). -->
      <p
        class="sr-only"
        role="alert"
      >
        {{ avisoDeErro }}
      </p>

      <BotaoPrimario
        v-if="folha"
        tipo="submit"
        class="mt-space-6"
      >
        Aplicar filtros
      </BotaoPrimario>
      <div
        v-else
        class="mt-space-5 md:px-space-3"
      >
        <button
          type="submit"
          class="inline-flex h-10 w-full items-center justify-center rounded-base border border-linha text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo active:scale-[0.98]"
        >
          Aplicar filtros
        </button>
      </div>

      <div
        v-if="folha || preenchido"
        class="mt-space-3 flex justify-center"
      >
        <BotaoTextual
          class="min-h-12 md:min-h-10"
          @click="limpar"
        >
          Limpar filtros
        </BotaoTextual>
      </div>
    </div>
  </form>
</template>
