<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import FolhaAcoes, { type AcaoDaFolha } from './FolhaAcoes.vue'

const LARGURA_WEB = '(min-width: 768px)'
const ESPACO_DO_DROPDOWN = 8
const ALTURA_DO_ITEM = 44
const RESPIRO_VERTICAL = 16

const props = withDefaults(
  defineProps<{
    rotulo: string
    acoes: AcaoDaFolha[]
    largura?: number
  }>(),
  { largura: 220 },
)

const emit = defineEmits<{ escolher: [id: string] }>()

const folhaAberta = ref(false)
const dropdownAberto = ref(false)
const dropdown = ref<HTMLElement | null>(null)
const posicao = ref<Record<string, string>>({})
let ancora: HTMLElement | null = null

function fecharAoClicarFora(evento: MouseEvent): void {
  const alvo = evento.target as Node
  if (!ancora?.contains(alvo) && !dropdown.value?.contains(alvo)) {
    fecharDropdown()
  }
}

function fecharDropdown(): void {
  dropdownAberto.value = false
  document.removeEventListener('mousedown', fecharAoClicarFora)
  window.removeEventListener('scroll', fecharDropdown, true)
  window.removeEventListener('resize', fecharDropdown)
}

function posicionar(botao: DOMRect): void {
  const altura = props.acoes.length * ALTURA_DO_ITEM + RESPIRO_VERTICAL
  const direita = `${window.innerWidth - botao.right}px`
  posicao.value =
    botao.bottom + ESPACO_DO_DROPDOWN + altura <= window.innerHeight
      ? { top: `${botao.bottom + ESPACO_DO_DROPDOWN}px`, right: direita }
      : { bottom: `${window.innerHeight - botao.top + ESPACO_DO_DROPDOWN}px`, right: direita }
}

function alternar(botao: HTMLElement): void {
  if (dropdownAberto.value) {
    fecharDropdown()
    return
  }
  ancora = botao
  if (window.matchMedia(LARGURA_WEB).matches) {
    posicionar(botao.getBoundingClientRect())
    dropdownAberto.value = true
    document.addEventListener('mousedown', fecharAoClicarFora)
    window.addEventListener('scroll', fecharDropdown, true)
    window.addEventListener('resize', fecharDropdown)
  } else {
    folhaAberta.value = true
  }
}

function fecharComTeclado(): void {
  fecharDropdown()
  ancora?.focus()
}

function escolher(id: string): void {
  folhaAberta.value = false
  fecharDropdown()
  emit('escolher', id)
}

onBeforeUnmount(fecharDropdown)

defineExpose({ alternar, fechar: fecharDropdown, aberto: dropdownAberto })
</script>

<template>
  <Teleport to="body">
    <ul
      v-if="dropdownAberto"
      ref="dropdown"
      role="menu"
      :aria-label="rotulo"
      class="fixed z-40 rounded-base border border-linha bg-papel py-space-2 shadow-2 dark:bg-papel-elevado"
      :style="{ ...posicao, width: `${largura}px` }"
      @keydown.esc="fecharComTeclado"
    >
      <li
        v-for="acao in acoes"
        :key="acao.id"
        role="none"
      >
        <button
          type="button"
          role="menuitem"
          class="flex h-11 w-full cursor-pointer items-center gap-space-3 px-space-4 text-left text-body hover:bg-linha focus-visible:bg-linha focus-visible:outline-none"
          :class="acao.destrutiva ? 'text-rubi' : 'text-tinta'"
          @click="escolher(acao.id)"
        >
          <component
            :is="acao.icone"
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
          {{ acao.rotulo }}
        </button>
      </li>
    </ul>
  </Teleport>
  <FolhaAcoes
    :aberta="folhaAberta"
    :rotulo="rotulo"
    :acoes="acoes"
    @escolher="escolher"
    @fechar="folhaAberta = false"
  />
</template>
