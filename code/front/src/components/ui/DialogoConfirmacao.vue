<script setup lang="ts">
import BotaoDestrutivo from './BotaoDestrutivo.vue'
import BotaoTextual from './BotaoTextual.vue'
import SobreposicaoModal from './SobreposicaoModal.vue'

/**
 * Confirmação de ação destrutiva (RNF-USA-04, documento-de-design §7.8). O foco entra em
 * `Cancelar`, nunca no destrutivo. Na web os botões ficam lado a lado, alinhados à direita,
 * `Cancelar` primeiro; no mobile empilham em largura total, destrutivo em cima
 * (cadastro-pessoal.md §4.8 e §5.4).
 */
withDefaults(
  defineProps<{
    aberta: boolean
    titulo: string
    rotuloConfirmar: string
    processando?: boolean
    erro?: string
  }>(),
  { processando: false, erro: undefined },
)

const emit = defineEmits<{ confirmar: []; cancelar: [] }>()
</script>

<template>
  <SobreposicaoModal
    :aberta="aberta"
    :rotulo="titulo"
    foco-inicial="[data-cancelar]"
    @fechar="!processando && emit('cancelar')"
  >
    <h2 class="text-title-sm text-tinta">
      {{ titulo }}
    </h2>
    <p class="mt-space-3 text-body text-grafite">
      <slot />
    </p>
    <p
      v-if="erro"
      role="alert"
      class="mt-space-4 text-caption text-rubi"
    >
      {{ erro }}
    </p>
    <div class="mt-space-6 flex flex-col-reverse gap-space-3 md:flex-row md:items-center md:justify-end md:gap-space-4">
      <BotaoTextual
        data-cancelar
        class="h-12 w-full justify-center md:h-10 md:w-auto"
        tom="grafite"
        :disabled="processando"
        @click="emit('cancelar')"
      >
        Cancelar
      </BotaoTextual>
      <BotaoDestrutivo
        class="h-12 w-full md:h-10 md:w-auto"
        :carregando="processando"
        @click="emit('confirmar')"
      >
        {{ rotuloConfirmar }}
      </BotaoDestrutivo>
    </div>
  </SobreposicaoModal>
</template>
