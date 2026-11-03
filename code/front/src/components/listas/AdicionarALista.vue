<script setup lang="ts">
import { PhCheckCircle, PhPlus, PhPlusCircle, PhX } from '@phosphor-icons/vue'
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { rotaDaLista } from '../../listas/caminhos'
import { contagemDeLivros } from '../../listas/textos'
import { usePaginacao } from '../../perfil/usePaginacao'
import { novaChaveIdempotencia } from '../../services/api'
import { listasService, type Lista, type ListaResumo } from '../../services/listas'
import FimDaLista from '../perfil/FimDaLista.vue'
import AvisoFlutuante from '../ui/AvisoFlutuante.vue'
import BannerAviso from '../ui/BannerAviso.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import FaixaInformativa from '../ui/FaixaInformativa.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'
import CapaDeItem from './CapaDeItem.vue'
import FormularioDeLista, { type LivroDeOrigem } from './FormularioDeLista.vue'

/**
 * `Adicionar à lista` (docs/design/periodo-2/F-LST/adicionar-a-lista.md): o único caminho de um
 * livro para dentro de uma lista. Cada toque é uma operação completa, sem `Salvar`: a marca muda
 * de forma e peso (`CheckCircle` cheio ou `PlusCircle`) na hora, e volta se o servidor recusar.
 * Reenviar repete a chave da mesma intenção (RNF-ERR-04).
 *
 * `Criar lista` fecha este dialog e abre o formulário com o livro, que cria a lista já com ele;
 * de volta à página, o toast confirma e oferece `Ver lista` (§4.9).
 */
const props = defineProps<{ aberto: boolean; livro: LivroDeOrigem }>()
const emit = defineEmits<{ fechar: [] }>()

const router = useRouter()

type Andamento = 'adicionando' | 'removendo' | 'falhou-adicionar' | 'falhou-remover'

const paginacao = usePaginacao<ListaResumo>((pagina) => listasService.listarMinhas(props.livro.id, pagina))
/** Marca e contagem locais, por lista: a verdade do servidor depois de cada toque. */
const contem = reactive(new Map<string, boolean>())
const quantidades = reactive(new Map<string, number>())
const andamento = reactive(new Map<string, Andamento>())
const chaves = new Map<string, { contem: boolean; valor: string }>()

const criando = ref(false)
const aviso = ref<{ texto: string; lista: Lista } | null>(null)

watch(
  () => props.aberto,
  (aberto) => {
    if (aberto) {
      contem.clear()
      quantidades.clear()
      andamento.clear()
      chaves.clear()
      void paginacao.carregar()
    }
  },
  { immediate: true },
)

function marcada(lista: ListaResumo): boolean {
  return contem.get(lista.id) ?? lista.contemLivro === true
}

function quantidade(lista: ListaResumo): number {
  return quantidades.get(lista.id) ?? lista.quantidadeLivros
}

function legenda(lista: ListaResumo): string {
  const estado = andamento.get(lista.id)
  if (estado === 'adicionando') {
    return 'Adicionando'
  }
  if (estado === 'removendo') {
    return 'Removendo'
  }
  return contagemDeLivros(quantidade(lista))
}

/** A chave é da intenção: o mesmo alvo (pôr ou tirar) repetido reaproveita a anterior. */
function chaveDe(listaId: string, querContem: boolean): string {
  const anterior = chaves.get(listaId)
  if (anterior && anterior.contem === querContem) {
    return anterior.valor
  }
  const valor = novaChaveIdempotencia()
  chaves.set(listaId, { contem: querContem, valor })
  return valor
}

async function alternar(lista: ListaResumo): Promise<void> {
  const estado = andamento.get(lista.id)
  if (estado === 'adicionando' || estado === 'removendo') {
    return
  }
  // Depois de uma falha, tocar reenvia a mesma mudança, não a contrária.
  const adicionar = estado === 'falhou-adicionar' ? true : estado === 'falhou-remover' ? false : !marcada(lista)
  const antes = { contem: marcada(lista), quantidade: quantidade(lista) }
  contem.set(lista.id, adicionar)
  andamento.set(lista.id, adicionar ? 'adicionando' : 'removendo')
  try {
    if (adicionar) {
      await listasService.adicionar(lista.id, props.livro.id, chaveDe(lista.id, true))
      quantidades.set(lista.id, antes.contem ? antes.quantidade : antes.quantidade + 1)
    } else {
      await listasService.remover(lista.id, props.livro.id, chaveDe(lista.id, false))
      quantidades.set(lista.id, antes.contem ? Math.max(0, antes.quantidade - 1) : antes.quantidade)
    }
    chaves.delete(lista.id)
    andamento.delete(lista.id)
  } catch {
    contem.set(lista.id, antes.contem)
    andamento.set(lista.id, adicionar ? 'falhou-adicionar' : 'falhou-remover')
  }
}

/** Setas para cima e para baixo percorrem as linhas (§5 "Foco de teclado"). */
function aoTeclar(evento: KeyboardEvent): void {
  if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') {
    return
  }
  const linhas = Array.from(
    (evento.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[data-linha-de-lista]'),
  )
  const atual = linhas.indexOf(document.activeElement as HTMLButtonElement)
  if (atual < 0) {
    return
  }
  evento.preventDefault()
  const proxima = evento.key === 'ArrowDown' ? Math.min(linhas.length - 1, atual + 1) : Math.max(0, atual - 1)
  linhas[proxima]?.focus()
}

function abrirCriacao(): void {
  emit('fechar')
  criando.value = true
}

function aoCriar(lista: Lista): void {
  criando.value = false
  aviso.value = { texto: `${props.livro.titulo} entrou na lista ${lista.titulo}.`, lista }
}

function verLista(): void {
  const lista = aviso.value?.lista
  aviso.value = null
  if (lista) {
    void router.push(rotaDaLista(lista.id, lista.dono, true))
  }
}
</script>

<template>
  <SobreposicaoModal
    :aberta="aberto"
    rotulo="Adicionar à lista"
    @fechar="emit('fechar')"
  >
    <div class="flex max-h-[80vh] flex-col md:max-h-[80vh]">
      <div class="flex items-center justify-between gap-space-4">
        <h2 class="text-title-sm text-tinta md:text-title-lg">
          Adicionar à lista
        </h2>
        <button
          type="button"
          class="-mr-space-2 hidden size-10 shrink-0 items-center justify-center rounded-base text-grafite transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:flex"
          aria-label="Fechar"
          @click="emit('fechar')"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="mt-space-4 flex items-start gap-space-3">
        <CapaDeItem
          :url="livro.capaUrl"
          :titulo="livro.titulo"
          :pessoal="livro.pessoal"
          maior-na-web
        />
        <div class="min-w-0">
          <p class="text-body-strong text-tinta">
            {{ livro.titulo }}
          </p>
          <p
            v-if="livro.autor"
            class="text-caption text-grafite"
          >
            {{ livro.autor }}
          </p>
        </div>
      </div>
      <FaixaInformativa
        v-if="livro.pessoal"
        class="mt-space-2"
      >
        Livro pessoal: quem puder ver a lista vê este livro em modo consulta, sem poder adicioná-lo à estante.
      </FaixaInformativa>
      <p
        v-else-if="paginacao.carregando.value || paginacao.itens.value.length > 0"
        class="mt-space-2 text-caption text-grafite"
      >
        O livro entra no fim de cada lista que você marcar.
      </p>

      <div
        class="-mx-space-3 mt-space-4 min-h-0 flex-1 overflow-y-auto border-t border-linha px-space-3 pt-space-1"
        @keydown="aoTeclar"
      >
        <button
          type="button"
          data-linha-de-lista
          class="flex h-14 w-full items-center gap-space-4 rounded-base px-space-3 text-left text-body font-semibold text-musgo transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-[52px]"
          @click="abrirCriacao"
        >
          <PhPlus
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
          Criar lista
        </button>

        <div
          v-if="paginacao.carregando.value"
          class="entrada flex flex-col"
          aria-busy="true"
          aria-label="Carregando suas listas"
        >
          <div
            v-for="n in 4"
            :key="n"
            class="flex h-16 items-center justify-between gap-space-4 border-t border-linha px-space-3 md:h-[52px]"
          >
            <div class="flex flex-1 flex-col gap-space-2">
              <span class="h-4 w-3/5 rounded-sm bg-linha" />
              <span class="h-3 w-1/4 rounded-sm bg-linha" />
            </div>
            <span class="size-6 rounded-full bg-linha" />
          </div>
        </div>

        <div
          v-else-if="paginacao.falhou.value"
          class="mt-space-2"
        >
          <BannerAviso
            variante="erro"
            triangulo
          >
            Não foi possível carregar suas listas. Verifique sua conexão e tente de novo.
            <BotaoTextual
              class="mt-space-2 block"
              @click="paginacao.carregar()"
            >
              Tentar de novo
            </BotaoTextual>
          </BannerAviso>
        </div>

        <p
          v-else-if="paginacao.itens.value.length === 0"
          class="border-t border-linha px-space-3 pt-space-4 text-body text-grafite"
        >
          Você ainda não tem listas. Crie a primeira e este livro já entra nela.
        </p>

        <ul
          v-else
          aria-label="Suas listas"
        >
          <li
            v-for="lista in paginacao.itens.value"
            :key="lista.id"
            class="border-t border-linha"
          >
            <button
              type="button"
              data-linha-de-lista
              class="flex min-h-16 w-full items-center gap-space-4 rounded-base px-space-3 py-space-2 text-left transition-[background-color,transform] duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo active:scale-[0.98] md:min-h-[52px]"
              :aria-pressed="marcada(lista)"
              :aria-busy="andamento.get(lista.id) === 'adicionando' || andamento.get(lista.id) === 'removendo'"
              @click="alternar(lista)"
            >
              <span class="min-w-0 flex-1">
                <span class="block truncate text-body-strong text-tinta">{{ lista.titulo }}</span>
                <span class="block text-caption text-grafite">{{ legenda(lista) }}</span>
                <span
                  v-if="andamento.get(lista.id) === 'falhou-adicionar' || andamento.get(lista.id) === 'falhou-remover'"
                  class="block text-caption text-rubi"
                  role="alert"
                >
                  {{
                    andamento.get(lista.id) === 'falhou-adicionar'
                      ? 'Não foi possível adicionar. Toque para tentar de novo.'
                      : 'Não foi possível remover. Toque para tentar de novo.'
                  }}
                </span>
              </span>
              <PhCheckCircle
                v-if="marcada(lista)"
                :size="24"
                weight="fill"
                class="shrink-0 text-musgo"
                aria-hidden="true"
              />
              <PhPlusCircle
                v-else
                :size="24"
                weight="regular"
                class="shrink-0 text-grafite"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>
        <FimDaLista
          v-if="paginacao.temMais.value || paginacao.falhouMais.value"
          :falhou="paginacao.falhouMais.value"
          :carregando="paginacao.carregandoMais.value"
          @carregar="paginacao.carregarMais()"
        />
      </div>

      <!-- Mobile: `Fechar` textual no fim; na web, o `X`, `Esc` e o scrim fecham (§5). -->
      <BotaoTextual
        class="mt-space-4 h-12 w-full justify-center md:hidden"
        tom="grafite"
        @click="emit('fechar')"
      >
        Fechar
      </BotaoTextual>
    </div>
  </SobreposicaoModal>

  <FormularioDeLista
    :aberto="criando"
    :livro="livro"
    @fechar="criando = false"
    @criada="aoCriar"
  />

  <AvisoFlutuante
    :aberto="aviso !== null"
    acao="Ver lista"
    @acao="verLista"
    @fechar="aviso = null"
  >
    {{ aviso?.texto }}
  </AvisoFlutuante>
</template>
