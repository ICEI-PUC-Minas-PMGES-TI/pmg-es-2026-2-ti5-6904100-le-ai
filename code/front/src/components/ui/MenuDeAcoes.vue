<script setup lang="ts">
import { PhDotsThree } from '@phosphor-icons/vue'
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'

import FolhaAcoes, { type AcaoDaFolha } from './FolhaAcoes.vue'

/**
 * Menu `Mais ações` (pagina-do-livro.md P2): `DotsThree` que abre, abaixo de 768px, a folha de
 * ações do mobile e, a partir dali, um dropdown alinhado à direita do botão, com itens de 44px,
 * ícone de 20px e hover em `linha`. Nasceu para `Adicionar à lista` (F-LST); as outras features
 * da página (`Recomendar a um leitor`, F-REC-P2P) só acrescentam itens em `acoes`.
 *
 * O dropdown fecha com `Esc`, clique fora ou escolha, e devolve o foco ao botão.
 */
defineProps<{ rotulo: string; acoes: AcaoDaFolha[] }>()
const emit = defineEmits<{ escolher: [id: string] }>()

const id = useId()
const folhaAberta = ref(false)
const dropdownAberto = ref(false)
const botao = ref<HTMLButtonElement | null>(null)
const raiz = ref<HTMLElement | null>(null)

function web(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 768px)').matches
}

async function abrir(): Promise<void> {
  if (!web()) {
    folhaAberta.value = true
    return
  }
  dropdownAberto.value = !dropdownAberto.value
  if (dropdownAberto.value) {
    document.addEventListener('pointerdown', aoClicarFora)
    await nextTick()
    raiz.value?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }
}

function fecharDropdown(devolverFoco: boolean): void {
  dropdownAberto.value = false
  document.removeEventListener('pointerdown', aoClicarFora)
  if (devolverFoco) {
    botao.value?.focus()
  }
}

function aoClicarFora(evento: PointerEvent): void {
  if (!raiz.value?.contains(evento.target as Node)) {
    fecharDropdown(false)
  }
}

function escolher(acao: string): void {
  folhaAberta.value = false
  fecharDropdown(false)
  emit('escolher', acao)
}

function aoTeclar(evento: KeyboardEvent): void {
  const itens = Array.from(raiz.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
  const atual = itens.indexOf(document.activeElement as HTMLButtonElement)
  if (evento.key === 'Escape') {
    evento.preventDefault()
    fecharDropdown(true)
  } else if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
    evento.preventDefault()
    const passo = evento.key === 'ArrowDown' ? 1 : -1
    itens[(atual + passo + itens.length) % itens.length]?.focus()
  }
}

onBeforeUnmount(() => document.removeEventListener('pointerdown', aoClicarFora))
</script>

<template>
  <div
    ref="raiz"
    class="relative"
    @keydown="aoTeclar"
  >
    <button
      ref="botao"
      type="button"
      class="flex size-12 items-center justify-center rounded-base text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:size-10"
      :aria-label="rotulo"
      aria-haspopup="menu"
      :aria-expanded="dropdownAberto"
      :aria-controls="dropdownAberto ? `${id}-menu` : undefined"
      @click="abrir"
    >
      <PhDotsThree
        :size="24"
        weight="regular"
        aria-hidden="true"
      />
    </button>
    <div
      v-if="dropdownAberto"
      :id="`${id}-menu`"
      role="menu"
      :aria-label="rotulo"
      class="absolute right-0 top-full z-30 mt-space-2 min-w-[240px] rounded-base border border-linha bg-papel py-space-2 shadow-2"
    >
      <button
        v-for="acao in acoes"
        :key="acao.id"
        type="button"
        role="menuitem"
        class="flex h-11 w-full items-center gap-space-3 px-space-4 text-left text-body transition-colors duration-dur-fast hover:bg-linha focus-visible:bg-linha focus-visible:outline-none"
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
    </div>
    <FolhaAcoes
      :aberta="folhaAberta"
      :rotulo="rotulo"
      :acoes="acoes"
      @escolher="escolher"
      @fechar="folhaAberta = false"
    />
  </div>
</template>
