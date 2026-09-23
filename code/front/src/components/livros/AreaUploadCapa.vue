<script setup lang="ts">
import { PhImageSquare, PhX } from '@phosphor-icons/vue'
import { computed, ref, useId } from 'vue'

/**
 * Área de upload de capa com seus quatro estados (cadastro-pessoal.md §4.1 a §4.4): vazia,
 * enviando (barra determinada), preenchida e erro. Nasceu no prompt e está pendente de
 * incorporação ao documento-de-design. A validação e o envio são de quem usa: aqui só se escolhe
 * o arquivo e se desenha o estado.
 */
export type EstadoDaCapa = 'vazia' | 'enviando' | 'preenchida' | 'erro'

const props = withDefaults(
  defineProps<{
    estado: EstadoDaCapa
    /** URL publicada ou prévia local (`blob:`) da imagem escolhida. */
    imagem?: string | null
    progresso?: number
    erro?: string | null
    desabilitada?: boolean
  }>(),
  { imagem: null, progresso: 0, erro: null, desabilitada: false },
)

const emit = defineEmits<{ escolher: [arquivo: File]; remover: [] }>()

const entrada = ref<HTMLInputElement | null>(null)
const idRegra = useId()
const comImagem = computed(() => (props.estado === 'preenchida' || props.estado === 'enviando') && props.imagem)

function abrir(): void {
  entrada.value?.click()
}

function aoEscolher(evento: Event): void {
  const alvo = evento.target as HTMLInputElement
  const arquivo = alvo.files?.[0]
  // Limpa para que escolher o mesmo arquivo de novo, depois de um erro, dispare outra vez.
  alvo.value = ''
  if (arquivo) {
    emit('escolher', arquivo)
  }
}

defineExpose({ abrir })
</script>

<template>
  <div class="flex items-start gap-space-4 md:flex-col md:gap-space-3">
    <div class="flex shrink-0 flex-col gap-space-2">
      <div
        v-if="comImagem"
        class="relative h-[160px] w-[120px] overflow-hidden rounded-base md:h-[267px] md:w-[200px]"
      >
        <img
          :src="imagem!"
          alt="Capa escolhida"
          class="size-full object-cover"
        >
        <div
          v-if="estado === 'enviando'"
          class="absolute inset-0 flex items-center justify-center bg-papel/60"
        >
          <div
            class="h-1 w-20 overflow-hidden rounded-full bg-linha"
            role="progressbar"
            aria-label="Enviando capa"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="Math.round(progresso * 100)"
          >
            <div
              class="h-full rounded-full bg-musgo transition-[width] duration-dur-fast"
              :style="{ width: `${Math.round(progresso * 100)}%` }"
            />
          </div>
        </div>
        <!-- Círculo visível de 28px dentro de uma área tocável de 48px (§9). -->
        <button
          v-else
          type="button"
          class="absolute right-0 top-0 flex size-12 items-center justify-center"
          aria-label="Remover capa"
          :disabled="desabilitada"
          @click="emit('remover')"
        >
          <span class="flex size-7 items-center justify-center rounded-full bg-papel/90 text-tinta">
            <PhX
              :size="16"
              weight="regular"
              aria-hidden="true"
            />
          </span>
        </button>
      </div>
      <button
        v-else
        type="button"
        class="flex h-[160px] w-[120px] flex-col items-center justify-center gap-space-2 rounded-base border-dashed bg-papel-elevado transition-colors duration-dur-fast hover:bg-linha focus-visible:border-solid focus-visible:outline-none md:h-[267px] md:w-[200px]"
        :class="estado === 'erro' ? 'border-[1.5px] border-rubi' : 'border border-linha focus-visible:border-[1.5px] focus-visible:border-musgo'"
        :aria-describedby="idRegra"
        :disabled="desabilitada"
        @click="abrir"
      >
        <PhImageSquare
          :size="24"
          weight="regular"
          class="text-grafite-suave"
          aria-hidden="true"
        />
        <span class="text-caption text-grafite">Adicionar capa</span>
      </button>

      <p
        v-if="estado === 'enviando'"
        class="text-caption text-grafite"
      >
        Enviando capa
      </p>
      <button
        v-else-if="estado === 'preenchida'"
        type="button"
        class="self-start text-caption font-semibold text-musgo underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
        :disabled="desabilitada"
        @click="abrir"
      >
        Trocar capa
      </button>
    </div>

    <div class="flex max-w-[200px] flex-col gap-space-2">
      <p
        :id="idRegra"
        class="text-caption text-grafite-suave"
      >
        Opcional. JPG, PNG ou WEBP, até 5 MB.
      </p>
      <p
        aria-live="polite"
        class="text-caption text-rubi"
      >
        {{ estado === 'erro' ? erro : '' }}
      </p>
    </div>

    <input
      ref="entrada"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      tabindex="-1"
      aria-hidden="true"
      @change="aoEscolher"
    >
  </div>
</template>
