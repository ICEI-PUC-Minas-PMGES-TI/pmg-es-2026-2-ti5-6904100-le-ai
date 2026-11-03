<script setup lang="ts">
import {
  PhListBullets,
  PhListNumbers,
  PhQuotes,
  PhTextB,
  PhTextItalic,
  PhTextStrikethrough,
} from '@phosphor-icons/vue'
import { computed, ref, useTemplateRef, type Component } from 'vue'

import {
  alternarMarca,
  alternarPrefixo,
  marcaAtiva,
  prefixoAtivo,
  type Edicao,
  type Marca,
  type Prefixo,
} from '../../markdown/edicao'

/**
 * Barra de formatação do editor de resenha (escrever-resenha.md §4.1 e §4.5): seis botões de
 * alternar em dois grupos, só o subconjunto do RN-13. Cada botão expõe o estado pressionado ao
 * leitor de tela; o fundo `musgo-fundo` é só o reforço, e o ícone fica no peso `regular` (exceção
 * declarada à regra do `fill`). É uma `toolbar` com uma parada de Tab só e setas entre os botões.
 *
 * A barra não mexe no campo: recebe o texto e a seleção e emite a edição nova, que a tela aplica.
 */
const props = defineProps<{ edicao: Edicao; desabilitada?: boolean }>()
const emit = defineEmits<{ aplicar: [edicao: Edicao] }>()

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const TECLA = MAC ? 'Cmd' : 'Ctrl'

interface Botao {
  rotulo: string
  icone: Component
  atalho?: string
  ativo: (e: Edicao) => boolean
  aplicar: (e: Edicao) => Edicao
}

const marca = (m: Marca) => ({ ativo: (e: Edicao) => marcaAtiva(e, m), aplicar: (e: Edicao) => alternarMarca(e, m) })
const prefixo = (p: Prefixo) => ({
  ativo: (e: Edicao) => prefixoAtivo(e, p),
  aplicar: (e: Edicao) => alternarPrefixo(e, p),
})

const GRUPOS: Botao[][] = [
  [
    { rotulo: 'Negrito', icone: PhTextB, atalho: 'B', ...marca('**') },
    { rotulo: 'Itálico', icone: PhTextItalic, atalho: 'I', ...marca('*') },
    { rotulo: 'Tachado', icone: PhTextStrikethrough, ...marca('~~') },
  ],
  [
    { rotulo: 'Lista com marcadores', icone: PhListBullets, ...prefixo('ul') },
    { rotulo: 'Lista numerada', icone: PhListNumbers, ...prefixo('ol') },
    { rotulo: 'Citação', icone: PhQuotes, ...prefixo('q') },
  ],
]
const BOTOES = GRUPOS.flat()

const ativos = computed(() => BOTOES.map((botao) => !props.desabilitada && botao.ativo(props.edicao)))

const focado = ref(0)
const barra = useTemplateRef<HTMLDivElement>('barra')

/** Setas, `Home` e `End` movem o foco entre os botões, como pede o padrão de `toolbar`. */
function aoTeclar(evento: KeyboardEvent): void {
  const destinos: Record<string, number> = {
    ArrowRight: (focado.value + 1) % BOTOES.length,
    ArrowLeft: (focado.value - 1 + BOTOES.length) % BOTOES.length,
    Home: 0,
    End: BOTOES.length - 1,
  }
  if (!(evento.key in destinos)) {
    return
  }
  evento.preventDefault()
  focado.value = destinos[evento.key]
  barra.value?.querySelectorAll('button')[focado.value]?.focus()
}

function rotuloAcessivel(botao: Botao): string {
  return botao.atalho ? `${botao.rotulo} (${TECLA}+${botao.atalho})` : botao.rotulo
}
</script>

<template>
  <div
    ref="barra"
    role="toolbar"
    aria-label="Formatação"
    class="flex items-center"
    @keydown="aoTeclar"
  >
    <template
      v-for="(grupo, indiceDoGrupo) in GRUPOS"
      :key="indiceDoGrupo"
    >
      <span
        v-if="indiceDoGrupo > 0"
        class="mx-space-2 h-6 w-px shrink-0 bg-linha"
        aria-hidden="true"
      />
      <button
        v-for="botao in grupo"
        :key="botao.rotulo"
        type="button"
        class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-base transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:cursor-not-allowed disabled:text-grafite-suave md:h-10 md:w-10"
        :class="
          ativos[BOTOES.indexOf(botao)]
            ? 'bg-musgo-fundo text-musgo'
            : 'text-grafite enabled:hover:bg-linha'
        "
        :aria-label="rotuloAcessivel(botao)"
        :aria-keyshortcuts="botao.atalho ? `Control+${botao.atalho} Meta+${botao.atalho}` : undefined"
        :aria-pressed="ativos[BOTOES.indexOf(botao)]"
        :tabindex="BOTOES.indexOf(botao) === focado ? 0 : -1"
        :disabled="desabilitada"
        @mousedown.prevent
        @focus="focado = BOTOES.indexOf(botao)"
        @click="emit('aplicar', botao.aplicar(edicao))"
      >
        <component
          :is="botao.icone"
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
      </button>
    </template>
  </div>
</template>
