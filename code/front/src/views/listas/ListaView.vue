<script setup lang="ts">
import {
  PhArrowDown,
  PhArrowsDownUp,
  PhArrowUp,
  PhCaretRight,
  PhCheck,
  PhDotsSixVertical,
  PhDotsThree,
  PhGlobe,
  PhListDashes,
  PhListPlus,
  PhLock,
  PhMinusCircle,
  PhPencilSimple,
} from '@phosphor-icons/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { usarRotuloVoltar } from '../../cabecalho'
import AvatarLeitor from '../../components/perfil/AvatarLeitor.vue'
import FimDaLista from '../../components/perfil/FimDaLista.vue'
import CapaDeItem from '../../components/listas/CapaDeItem.vue'
import FormularioDeLista from '../../components/listas/FormularioDeLista.vue'
import AvisoFlutuante from '../../components/ui/AvisoFlutuante.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import FolhaAcoes, { type AcaoDaFolha } from '../../components/ui/FolhaAcoes.vue'
import { deixarAviso } from '../../listas/avisos'
import { ehWeb, rotaDoIndice, rotaDoLivro } from '../../listas/caminhos'
import { linhaDeContagem, textoDeListasRestritas, visibilidadeDaLista } from '../../listas/textos'
import { useMinhaPrivacidade } from '../../listas/useMinhaPrivacidade'
import { primeiroNome } from '../../perfil/textos'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { LIMITE_DE_ITENS, listasService, type ItemDeLista, type Lista } from '../../services/listas'
import { perfilService } from '../../services/perfil'

/**
 * Lista (docs/design/periodo-2/F-LST/lista.md, RF-LST-02/04/05/06). Dois modos, decididos pelo
 * servidor (`pertenceAoSolicitante`):
 *
 * - **Dono:** reordena e remove. Na web, alça de arrastar e os botões `Mover para cima`, `Mover
 *   para baixo` e `Remover da lista` sempre visíveis; abaixo de 768px, o menu `DotsThree` de cada
 *   linha e o modo `Reordenar`. A lista inteira fica carregada, para o livro poder ir a qualquer
 *   posição. A ordem nova vai na hora; se o servidor recusar, a lista volta como estava e o toast
 *   oferece `Tentar de novo` com a mesma chave (§4.4): nunca fica ordem parcial.
 * - **Outro leitor:** só lê, paginado por rolagem. Perfil privado sem seguimento (403) mostra o
 *   bloco de restrição, sem título, capa nem contagem (RN-08).
 *
 * Livro pessoal de lista alheia abre em modo consulta com `via=lista`; o do dono abre sem via
 * (`listas/caminhos.ts`).
 */
const route = useRoute()
const router = useRouter()
const privacidade = useMinhaPrivacidade()

const lista = ref<Lista | null>(null)
const itens = ref<ItemDeLista[]>([])
const cursor = ref<string | null>(null)
const temMais = ref(false)
const carregando = ref(true)
const carregandoMais = ref(false)
const falhouMais = ref(false)
const naoEncontrada = ref(false)
const restrita = ref(false)
const nomeDoDonoRestrito = ref<string | null>(null)
const falhou = ref(false)

const editando = ref(false)
const reordenando = ref(false)
const menuDoItem = ref<ItemDeLista | null>(null)
const aviso = ref<{ texto: string; repetir?: () => void } | null>(null)

const dono = computed(() => lista.value?.pertenceAoSolicitante === true)
const primeiroNomeDoDono = computed(() => (lista.value ? primeiroNome(lista.value.dono.nomeExibicao) : null))
const usernameDaRota = computed(() => (typeof route.params.username === 'string' ? route.params.username : null))

usarRotuloVoltar(() => {
  if (restrita.value) {
    return nomeDoDonoRestrito.value ? `Perfil de ${nomeDoDonoRestrito.value}` : 'Voltar'
  }
  if (lista.value && !dono.value) {
    return `Listas de ${primeiroNomeDoDono.value}`
  }
  return null
})

watch(
  () => route.params.id,
  () => void carregar(),
  { immediate: true },
)

async function carregar(): Promise<void> {
  const id = String(route.params.id)
  carregando.value = true
  naoEncontrada.value = false
  restrita.value = false
  falhou.value = false
  reordenando.value = false
  try {
    lista.value = await listasService.obter(id)
    await carregarItens(id, true)
  } catch (erro) {
    lista.value = null
    itens.value = []
    if (erro instanceof ApiError && erro.status === 403) {
      restrita.value = true
      void descobrirNomeRestrito()
    } else if (erro instanceof ApiError && erro.status === 404) {
      naoEncontrada.value = true
    } else {
      falhou.value = true
    }
  } finally {
    carregando.value = false
  }
}

/** O 403 não diz de quem é a lista; a rota de outro leitor traz o username. */
async function descobrirNomeRestrito(): Promise<void> {
  nomeDoDonoRestrito.value = null
  if (!usernameDaRota.value) {
    return
  }
  try {
    nomeDoDonoRestrito.value = primeiroNome((await perfilService.obterPerfil(usernameDaRota.value)).displayName)
  } catch {
    nomeDoDonoRestrito.value = null
  }
}

/** Dono: tudo, em segmentos de 50 (o teto do servidor). Terceiro: só o primeiro segmento. */
async function carregarItens(id: string, primeira: boolean): Promise<void> {
  const tudo = dono.value
  let segmento = await listasService.listarItens(id, primeira ? null : cursor.value, tudo ? LIMITE_DE_ITENS : undefined)
  const acumulado = primeira ? [...segmento.itens] : [...itens.value, ...segmento.itens]
  while (tudo && segmento.temMais && segmento.proximoCursor) {
    segmento = await listasService.listarItens(id, segmento.proximoCursor, LIMITE_DE_ITENS)
    acumulado.push(...segmento.itens)
  }
  itens.value = acumulado
  cursor.value = segmento.proximoCursor
  temMais.value = segmento.temMais
}

async function carregarMais(): Promise<void> {
  if (!lista.value || !temMais.value || carregandoMais.value) {
    return
  }
  carregandoMais.value = true
  falhouMais.value = false
  try {
    await carregarItens(lista.value.id, false)
  } catch {
    falhouMais.value = true
  } finally {
    carregandoMais.value = false
  }
}

// ---------------------------------------------------------------- reordenar

/** Chave da intenção de mover: o mesmo item para a mesma posição repete a chave (RNF-ERR-04). */
const chavesDeMover = new Map<string, string>()

function renumerar(lista: ItemDeLista[]): ItemDeLista[] {
  return lista.map((item, indice) => (item.posicao === indice + 1 ? item : { ...item, posicao: indice + 1 }))
}

async function mover(de: number, para: number): Promise<void> {
  if (!lista.value || de === para || para < 0 || para >= itens.value.length) {
    return
  }
  const anterior = itens.value
  const item = anterior[de]
  const proxima = [...anterior]
  proxima.splice(de, 1)
  proxima.splice(para, 0, item)
  itens.value = renumerar(proxima)

  const intencao = `${item.id}:${para + 1}`
  const chave = chavesDeMover.get(intencao) ?? novaChaveIdempotencia()
  chavesDeMover.set(intencao, chave)
  try {
    await listasService.mover(lista.value.id, item.id, para + 1, chave)
    chavesDeMover.delete(intencao)
    aviso.value = null
    lista.value = { ...lista.value, atualizadaEm: new Date().toISOString() }
  } catch {
    itens.value = anterior
    aviso.value = {
      texto: 'Não foi possível salvar a nova ordem. A lista voltou como estava.',
      repetir: () => void mover(de, para),
    }
  }
}

// Arrastar pela alça, com ponteiro (mouse e toque) e com teclado (§5 "Arrastar na web").
const arrastando = ref<{ de: number; inicioY: number; deslocamento: number; para: number } | null>(null)
const pegoPeloTeclado = ref<{ de: number; para: number } | null>(null)
/** Caixas das linhas, medidas ao pegar, na ordem do DOM (a de refs em `v-for` não é garantida). */
let caixas: DOMRect[] = []

function aoPegar(evento: PointerEvent, indice: number): void {
  if (evento.button !== 0) {
    return
  }
  evento.preventDefault()
  const alca = evento.currentTarget as HTMLElement
  alca.setPointerCapture?.(evento.pointerId)
  caixas = Array.from(alca.closest('ol')?.querySelectorAll(':scope > li') ?? []).map((linha) =>
    linha.getBoundingClientRect(),
  )
  arrastando.value = { de: indice, inicioY: evento.clientY, deslocamento: 0, para: indice }
}

function aoArrastar(evento: PointerEvent): void {
  if (!arrastando.value) {
    return
  }
  arrastando.value.deslocamento = evento.clientY - arrastando.value.inicioY
  // O destino é a primeira linha cujo meio fica abaixo do ponteiro.
  let destino = caixas.length - 1
  for (let indice = 0; indice < caixas.length; indice += 1) {
    const caixa = caixas[indice]
    if (evento.clientY < caixa.top + caixa.height / 2) {
      destino = indice > arrastando.value.de ? indice - 1 : indice
      break
    }
  }
  arrastando.value.para = Math.max(0, destino)
}

function aoSoltar(): void {
  const estado = arrastando.value
  arrastando.value = null
  if (estado && estado.para !== estado.de) {
    void mover(estado.de, estado.para)
  }
}

/** `Espaço` pega e solta; as setas escolhem o destino; `Esc` desiste. */
function aoTeclarNaAlca(evento: KeyboardEvent, indice: number): void {
  const pego = pegoPeloTeclado.value
  if (evento.key === ' ' || evento.key === 'Enter') {
    evento.preventDefault()
    if (!pego) {
      pegoPeloTeclado.value = { de: indice, para: indice }
    } else {
      pegoPeloTeclado.value = null
      void mover(pego.de, pego.para)
    }
  } else if (pego && (evento.key === 'ArrowUp' || evento.key === 'ArrowDown')) {
    evento.preventDefault()
    const passo = evento.key === 'ArrowUp' ? -1 : 1
    pego.para = Math.min(itens.value.length - 1, Math.max(0, pego.para + passo))
  } else if (pego && evento.key === 'Escape') {
    evento.preventDefault()
    pegoPeloTeclado.value = null
  }
}

/** Linha de inserção antes do índice indicado (ou depois do último). */
const insercaoAntesDe = computed(() => {
  const estado = arrastando.value ?? pegoPeloTeclado.value
  if (!estado || estado.para === estado.de) {
    return null
  }
  return estado.para > estado.de ? estado.para + 1 : estado.para
})

const anuncioDeOrdem = computed(() => {
  const pego = pegoPeloTeclado.value
  if (!pego) {
    return ''
  }
  const item = itens.value[pego.de]
  return `${item?.livro.titulo ?? 'Livro'}: posição ${pego.para + 1} de ${itens.value.length}. Espaço solta, Esc desiste.`
})

// ---------------------------------------------------------------- remover

async function remover(item: ItemDeLista): Promise<void> {
  if (!lista.value) {
    return
  }
  const anterior = itens.value
  const listaAnterior = lista.value
  itens.value = renumerar(anterior.filter((outro) => outro.id !== item.id))
  lista.value = { ...listaAnterior, quantidadeLivros: Math.max(0, listaAnterior.quantidadeLivros - 1) }
  try {
    await listasService.remover(listaAnterior.id, item.livro.id, novaChaveIdempotencia())
    aviso.value = null
  } catch {
    itens.value = anterior
    lista.value = listaAnterior
    aviso.value = { texto: `Não foi possível tirar ${item.livro.titulo} da lista. Tente de novo.` }
  }
}

// ---------------------------------------------------------------- menu mobile

const acoesDoMenu = computed<AcaoDaFolha[]>(() => {
  const item = menuDoItem.value
  if (!item) {
    return []
  }
  const indice = itens.value.findIndex((outro) => outro.id === item.id)
  return [
    ...(indice > 0 ? [{ id: 'cima', rotulo: 'Mover para cima', icone: PhArrowUp }] : []),
    ...(indice < itens.value.length - 1 ? [{ id: 'baixo', rotulo: 'Mover para baixo', icone: PhArrowDown }] : []),
    { id: 'remover', rotulo: 'Remover da lista', icone: PhMinusCircle, destrutiva: true },
  ]
})

function escolherNoMenu(acao: string): void {
  const item = menuDoItem.value
  menuDoItem.value = null
  if (!item) {
    return
  }
  const indice = itens.value.findIndex((outro) => outro.id === item.id)
  if (acao === 'cima') {
    void mover(indice, indice - 1)
  } else if (acao === 'baixo') {
    void mover(indice, indice + 1)
  } else {
    void remover(item)
  }
}

// ---------------------------------------------------------------- editar e excluir

function aoSalvar(nova: Lista): void {
  editando.value = false
  lista.value = nova
}

function aoExcluir(): void {
  editando.value = false
  deixarAviso('Lista excluída.')
  void router.replace(rotaDoIndice(null, ehWeb()))
}

const BOTAO_DE_ICONE =
  'flex size-10 items-center justify-center rounded-base text-grafite transition-colors duration-dur-fast hover:bg-linha hover:text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:cursor-not-allowed disabled:text-grafite-suave disabled:hover:bg-transparent'
const BOTAO_SECUNDARIO =
  'flex h-12 items-center justify-center gap-space-2 rounded-base border border-linha px-space-5 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10'
</script>

<template>
  <div class="pb-space-12 pt-space-2 md:pt-space-6">
    <!-- §4.8 e §5.5: skeleton estático com um único fade; também é o estado do cold start. -->
    <div
      v-if="carregando"
      class="entrada flex flex-col gap-space-6 md:grid md:grid-cols-[320px_minmax(0,720px)] md:gap-space-8"
      aria-busy="true"
      aria-label="Carregando lista"
    >
      <div class="flex flex-col gap-space-3">
        <span class="h-6 w-[70%] rounded-sm bg-capa-placeholder md:h-8" />
        <span class="h-[15px] w-[90%] rounded-sm bg-capa-placeholder" />
        <span class="h-[15px] w-[60%] rounded-sm bg-capa-placeholder" />
        <span class="h-[13px] w-[50%] rounded-sm bg-capa-placeholder" />
        <span class="mt-space-2 hidden h-10 w-full rounded-base bg-capa-placeholder md:block" />
      </div>
      <div class="flex flex-col divide-y divide-linha">
        <div
          v-for="n in 6"
          :key="n"
          class="flex items-center gap-space-3 py-space-4"
        >
          <span class="size-4 rounded-sm bg-capa-placeholder" />
          <span class="h-[72px] w-12 bg-capa-placeholder" />
          <span class="flex flex-1 flex-col gap-space-2 pl-space-1">
            <span class="h-[17px] w-[70%] rounded-sm bg-capa-placeholder" />
            <span class="h-[13px] w-[45%] rounded-sm bg-capa-placeholder" />
          </span>
        </div>
      </div>
    </div>

    <!-- §4.7 e §5.4: escolha da outra pessoa, não erro. Nada da lista aparece. -->
    <EstadoVazio
      v-else-if="restrita"
      :icone="PhLock"
      solto
      titulo="Esta lista é de um perfil privado"
      class="mx-auto mt-space-10 max-w-[280px] md:mt-space-16 md:max-w-[360px]"
    >
      <p class="mt-space-6 text-body text-grafite">
        {{ textoDeListasRestritas(nomeDoDonoRestrito) }}
      </p>
      <RouterLink
        v-if="usernameDaRota"
        :to="{ name: 'perfil-de-outro', params: { username: usernameDaRota } }"
        class="mt-space-6"
        :class="BOTAO_SECUNDARIO"
      >
        {{ nomeDoDonoRestrito ? `Ver perfil de ${nomeDoDonoRestrito}` : 'Ver perfil' }}
      </RouterLink>
    </EstadoVazio>

    <!-- §4.11: excluída ou inexistente. Sem `rubi`: não é falha do sistema. -->
    <EstadoVazio
      v-else-if="naoEncontrada"
      :icone="PhListDashes"
      solto
      titulo="Lista não encontrada"
      class="mx-auto mt-space-10 max-w-[280px] md:mt-space-16 md:max-w-[360px]"
    >
      <p class="mt-space-6 text-body text-grafite">
        Ela pode ter sido excluída por quem a criou.
      </p>
      <BotaoTextual
        class="mt-space-6 min-h-12 md:min-h-10"
        @click="router.back()"
      >
        Voltar
      </BotaoTextual>
    </EstadoVazio>

    <div
      v-else-if="falhou || !lista"
      class="max-w-[720px]"
    >
      <BannerAviso
        variante="erro"
        triangulo
      >
        Não foi possível carregar esta lista. Verifique sua conexão e tente de novo.
        <BotaoTextual
          class="mt-space-2 block"
          @click="carregar"
        >
          Tentar de novo
        </BotaoTextual>
      </BannerAviso>
    </div>

    <div
      v-else
      class="flex flex-col md:grid md:grid-cols-[320px_minmax(0,720px)] md:items-start md:gap-space-8"
    >
      <!-- Bloco da lista: coluna de 320px fixa ao rolar na web. Texto de usuário com escape. -->
      <section
        class="flex flex-col md:sticky md:top-0"
        aria-labelledby="titulo-da-lista"
      >
        <h2
          id="titulo-da-lista"
          class="line-clamp-3 text-title-lg text-tinta md:line-clamp-4 md:text-display"
        >
          {{ lista.titulo }}
        </h2>
        <p
          v-if="lista.descricao"
          class="mt-space-2 whitespace-pre-line text-body text-grafite"
        >
          {{ lista.descricao }}
        </p>
        <p
          v-if="!dono"
          class="mt-space-3 flex items-center gap-space-2 text-caption text-grafite"
        >
          <AvatarLeitor
            :url="lista.dono.avatarUrl"
            :nome="lista.dono.nomeExibicao"
            :tamanho="24"
          />
          <span>
            Lista de
            <RouterLink
              :to="{ name: 'perfil-de-outro', params: { username: lista.dono.username } }"
              class="rounded-sm font-semibold text-musgo hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
            >{{ lista.dono.nomeExibicao }}</RouterLink>
          </span>
        </p>
        <p
          v-else-if="privacidade"
          class="mt-space-3 flex items-start gap-space-2 text-caption text-grafite"
        >
          <component
            :is="privacidade === 'privado' ? PhLock : PhGlobe"
            :size="16"
            weight="regular"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          {{ visibilidadeDaLista(privacidade) }}
        </p>
        <p class="mt-space-3 text-caption text-grafite">
          {{ linhaDeContagem(lista.quantidadeLivros, lista.atualizadaEm) }}
        </p>

        <div
          v-if="dono"
          class="mt-space-4"
        >
          <template v-if="!reordenando">
            <div class="flex flex-wrap gap-space-3">
              <button
                type="button"
                class="md:w-full"
                :class="BOTAO_SECUNDARIO"
                @click="editando = true"
              >
                <PhPencilSimple
                  :size="20"
                  weight="regular"
                  aria-hidden="true"
                />
                Editar lista
              </button>
              <!-- Na web não há `Reordenar`: os controles de ordem ficam nas linhas (§5). -->
              <button
                v-if="itens.length >= 2"
                type="button"
                class="md:hidden"
                :class="BOTAO_SECUNDARIO"
                @click="reordenando = true"
              >
                <PhArrowsDownUp
                  :size="20"
                  weight="regular"
                  aria-hidden="true"
                />
                Reordenar
              </button>
            </div>
          </template>
          <template v-else>
            <button
              type="button"
              class="flex h-12 items-center gap-space-2 rounded-full bg-musgo px-space-6 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
              @click="reordenando = false"
            >
              <PhCheck
                :size="20"
                weight="bold"
                aria-hidden="true"
              />
              Concluir
            </button>
            <p class="mt-space-2 text-caption text-grafite">
              Arraste pela alça para mudar a ordem.
            </p>
          </template>
        </div>
      </section>

      <div class="mt-space-5 border-t border-linha md:mt-0 md:border-t-0">
        <EstadoVazio
          v-if="itens.length === 0 && dono"
          :icone="PhListPlus"
          solto
          titulo="Esta lista ainda está vazia"
          class="mx-auto mt-space-8 max-w-[280px] md:mt-space-10"
        >
          <p class="mt-space-6 text-body text-grafite">
            Abra a página de um livro e escolha Adicionar à lista no menu de ações.
          </p>
          <RouterLink
            to="/descobrir"
            class="mt-space-6 flex h-12 items-center justify-center rounded-full bg-musgo px-space-6 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
          >
            Buscar livros
          </RouterLink>
        </EstadoVazio>
        <p
          v-else-if="itens.length === 0"
          class="pt-space-5 text-body text-grafite"
        >
          {{ primeiroNomeDoDono }} ainda não adicionou livros a esta lista.
        </p>

        <template v-else>
          <p
            class="sr-only"
            aria-live="polite"
          >
            {{ anuncioDeOrdem }}
          </p>
          <TransitionGroup
            tag="ol"
            name="linha"
            class="relative"
            :aria-label="`Livros de ${lista.titulo}`"
          >
            <li
              v-for="(item, indice) in itens"
              :key="item.id"
              class="relative border-b border-linha"
              :class="[
                insercaoAntesDe === indice ? 'insercao-antes' : '',
                insercaoAntesDe === itens.length && indice === itens.length - 1 ? 'insercao-depois' : '',
              ]"
            >
              <div
                class="group flex min-h-24 items-center gap-space-3 py-space-4 transition-colors duration-dur-fast md:-mx-space-4 md:px-space-4"
                :class="[
                  arrastando?.de === indice || pegoPeloTeclado?.de === indice
                    ? 'relative z-10 bg-papel-elevado shadow-2'
                    : 'md:hover:bg-papel-elevado',
                ]"
                :style="arrastando?.de === indice ? { transform: `translateY(${arrastando.deslocamento}px)` } : undefined"
              >
                <!-- Alça: sempre na web para o dono; no mobile, só no modo de reordenação. -->
                <button
                  v-if="dono"
                  type="button"
                  class="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo active:cursor-grabbing"
                  :class="[
                    reordenando ? 'order-last md:order-none' : 'hidden md:flex',
                    arrastando?.de === indice || pegoPeloTeclado?.de === indice ? 'text-musgo' : 'text-grafite',
                  ]"
                  :aria-label="`Mudar a posição de ${item.livro.titulo}`"
                  aria-roledescription="alça de arrastar"
                  @pointerdown="aoPegar($event, indice)"
                  @pointermove="aoArrastar"
                  @pointerup="aoSoltar"
                  @pointercancel="arrastando = null"
                  @keydown="aoTeclarNaAlca($event, indice)"
                  @blur="pegoPeloTeclado = null"
                >
                  <PhDotsSixVertical
                    :size="20"
                    weight="regular"
                    aria-hidden="true"
                  />
                </button>
                <span class="w-6 shrink-0 text-right font-mono text-num-inline tabular-nums text-grafite">{{ item.posicao }}</span>

                <RouterLink
                  :to="rotaDoLivro(item.livro, lista.id, dono)"
                  class="flex min-w-0 flex-1 items-center gap-space-4 rounded-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
                  :class="reordenando ? 'pointer-events-none' : ''"
                  :tabindex="reordenando ? -1 : undefined"
                >
                  <CapaDeItem
                    :url="item.livro.capaUrl"
                    :titulo="item.livro.titulo"
                    :pessoal="item.livro.tipo === 'PESSOAL'"
                  />
                  <span class="flex min-w-0 flex-col">
                    <span class="line-clamp-2 text-title-sm text-tinta md:text-body-strong">{{ item.livro.titulo }}</span>
                    <span
                      v-if="item.livro.autor"
                      class="truncate text-caption text-grafite"
                    >{{ item.livro.autor }}</span>
                  </span>
                </RouterLink>

                <template v-if="dono">
                  <!-- Web: os três controles sempre visíveis (§5). -->
                  <div class="hidden shrink-0 items-center gap-space-1 md:flex">
                    <button
                      type="button"
                      :class="BOTAO_DE_ICONE"
                      :disabled="indice === 0"
                      aria-label="Mover para cima"
                      @click="mover(indice, indice - 1)"
                    >
                      <PhArrowUp
                        :size="20"
                        weight="regular"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      :class="BOTAO_DE_ICONE"
                      :disabled="indice === itens.length - 1"
                      aria-label="Mover para baixo"
                      @click="mover(indice, indice + 1)"
                    >
                      <PhArrowDown
                        :size="20"
                        weight="regular"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      :class="[BOTAO_DE_ICONE, 'hover:text-rubi']"
                      aria-label="Remover da lista"
                      @click="remover(item)"
                    >
                      <PhMinusCircle
                        :size="20"
                        weight="regular"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <!-- Mobile: o menu do item, fora do modo de reordenação (§4.2). -->
                  <button
                    v-if="!reordenando"
                    type="button"
                    class="-mr-space-3 flex size-12 shrink-0 items-center justify-center rounded-base text-grafite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:hidden"
                    :aria-label="`Ações de ${item.livro.titulo}`"
                    @click="menuDoItem = item"
                  >
                    <PhDotsThree
                      :size="24"
                      weight="regular"
                      aria-hidden="true"
                    />
                  </button>
                </template>
                <PhCaretRight
                  v-else
                  :size="20"
                  weight="regular"
                  class="shrink-0 text-grafite"
                  aria-hidden="true"
                />
              </div>
            </li>
          </TransitionGroup>
          <FimDaLista
            v-if="!dono && (temMais || falhouMais)"
            :falhou="falhouMais"
            :carregando="carregandoMais"
            @carregar="carregarMais"
          />
        </template>
      </div>
    </div>

    <FolhaAcoes
      :aberta="menuDoItem !== null"
      :rotulo="menuDoItem ? `${menuDoItem.livro.titulo}, posição ${menuDoItem.posicao} de ${itens.length}` : 'Ações do livro'"
      :acoes="acoesDoMenu"
      @escolher="escolherNoMenu"
      @fechar="menuDoItem = null"
    />

    <FormularioDeLista
      v-if="lista && dono"
      :aberto="editando"
      :lista="lista"
      @fechar="editando = false"
      @salva="aoSalvar"
      @excluida="aoExcluir"
    />

    <AvisoFlutuante
      :aberto="aviso !== null"
      tom="rubi"
      :acao="aviso?.repetir ? 'Tentar de novo' : undefined"
      @acao="aviso?.repetir?.()"
      @fechar="aviso = null"
    >
      {{ aviso?.texto }}
    </AvisoFlutuante>
  </div>
</template>

<style scoped>
/* Linha de inserção de 2px `musgo` no ponto de soltura (§4.3). */
.insercao-antes::before,
.insercao-depois::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  height: 2px;
  background-color: var(--color-musgo);
  /* Abaixo da linha levantada (`z-10`), que passa por cima dela enquanto anda. */
  z-index: 5;
}

.insercao-antes::before {
  top: -1px;
}

.insercao-depois::after {
  bottom: -1px;
}

/* Remover: a linha sai com fade em `dur-base`; as de baixo sobem com `dur-fast` (§4.2). */
.linha-leave-active {
  transition: opacity var(--duration-base) var(--easing-in);
}

.linha-leave-to {
  opacity: 0;
}

.linha-move {
  transition: transform var(--duration-fast) var(--easing-in-out);
}

@media (prefers-reduced-motion: reduce) {
  .linha-leave-active,
  .linha-move {
    transition: none;
  }
}
</style>
