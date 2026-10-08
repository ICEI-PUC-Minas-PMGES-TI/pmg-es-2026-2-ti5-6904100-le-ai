<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import {
  DIGITOS_DAS_PAGINAS,
  DIGITOS_DO_ANO,
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
 * - `painel`: o bloco `Filtros` da web, no painel de 240px abaixo de `Assuntos`. Botão secundário,
 *   e `Limpar filtros` só com algum campo preenchido.
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
      class="mb-space-3 px-space-3 text-label text-grafite"
    >
      Filtros
    </h2>
    <p
      v-if="folha"
      class="mt-space-2 text-body text-grafite"
    >
      Preencha só o que quiser usar. Os filtros valem junto com a busca e o assunto.
    </p>

    <div
      class="flex flex-col gap-space-4"
      :class="folha ? 'mt-space-5' : 'md:px-space-3'"
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
            sufixo="páginas"
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
            sufixo="páginas"
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
  </form>
</template>
