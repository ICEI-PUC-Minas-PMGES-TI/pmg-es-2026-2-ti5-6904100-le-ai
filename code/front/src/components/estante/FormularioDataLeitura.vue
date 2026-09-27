<script setup lang="ts">
import { PhArrowLeft, PhCalendar, PhCheck } from '@phosphor-icons/vue'
import { ref, watch } from 'vue'

import { ACOES_DE_LEITURA, ERROS_DE_ACAO, ROTULO_VOLTAR_ACOES } from '../../estante/textos'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import CampoTexto from '../ui/CampoTexto.vue'

const props = withDefaults(
  defineProps<{
    titulo: string
    rotuloCampo: string
    helper: string
    hoje: string
    salvando: boolean
    erro?: string | null
    aviso?: string
  }>(),
  { erro: null, aviso: undefined },
)

const emit = defineEmits<{ confirmar: [data: string]; voltar: []; cancelar: [] }>()

const data = ref(props.hoje)
const erroDoCampo = ref<string | undefined>(undefined)

watch(data, () => {
  erroDoCampo.value = undefined
})

function confirmar(): void {
  if (!data.value || data.value > props.hoje) {
    erroDoCampo.value = ERROS_DE_ACAO.dataNoFuturo
    return
  }
  emit('confirmar', data.value)
}
</script>

<template>
  <form
    class="flex flex-col"
    novalidate
    @submit.prevent="confirmar"
  >
    <button
      type="button"
      class="-ml-space-2 flex size-10 items-center justify-center rounded-full text-grafite hover:bg-linha focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-musgo"
      :aria-label="ROTULO_VOLTAR_ACOES"
      :disabled="salvando"
      @click="emit('voltar')"
    >
      <PhArrowLeft
        :size="20"
        weight="regular"
        aria-hidden="true"
      />
    </button>
    <h2 class="mt-space-2 text-title text-tinta">
      {{ titulo }}
    </h2>
    <CampoTexto
      v-model="data"
      class="mt-space-5"
      type="date"
      :label="rotuloCampo"
      :helper="helper"
      :erro="erroDoCampo"
      :icone="PhCalendar"
      :disabled="salvando"
    />
    <p
      v-if="aviso"
      class="mt-space-5 flex items-center gap-space-2 text-caption text-grafite"
    >
      <PhCheck
        :size="16"
        weight="regular"
        class="shrink-0 text-musgo"
        aria-hidden="true"
      />
      {{ aviso }}
    </p>
    <div class="mt-space-6 flex flex-col gap-space-3 md:flex-row-reverse md:items-center md:justify-start md:gap-space-4">
      <BotaoPrimario
        tipo="submit"
        class="h-12 md:h-10 md:w-auto"
        :disabled="salvando"
      >
        {{ salvando ? ACOES_DE_LEITURA.salvando : titulo }}
      </BotaoPrimario>
      <BotaoTextual
        class="h-12 w-full justify-center md:h-10 md:w-auto"
        :disabled="salvando"
        @click="emit('cancelar')"
      >
        {{ ACOES_DE_LEITURA.cancelar }}
      </BotaoTextual>
    </div>
    <p
      v-if="erro"
      role="alert"
      class="mt-space-2 text-caption text-rubi"
    >
      {{ erro }}
    </p>
  </form>
</template>
