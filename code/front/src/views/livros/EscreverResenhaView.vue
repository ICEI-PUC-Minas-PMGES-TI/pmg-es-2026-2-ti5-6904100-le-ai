<script setup lang="ts">
import { PhEye, PhTrash } from '@phosphor-icons/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import BarraDeFormatacao from '../../components/livros/BarraDeFormatacao.vue'
import CapaLivro from '../../components/livros/CapaLivro.vue'
import ContadorDeCaracteres from '../../components/livros/ContadorDeCaracteres.vue'
import EstrelasNota from '../../components/livros/EstrelasNota.vue'
import PainelDeNota from '../../components/livros/PainelDeNota.vue'
import TextoDaResenha from '../../components/livros/TextoDaResenha.vue'
import ToggleSpoiler from '../../components/livros/ToggleSpoiler.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import FaixaInformativa from '../../components/ui/FaixaInformativa.vue'
import { formatarData } from '../../livros/formatos'
import { useMinhaAvaliacao, type LivroAvaliado } from '../../livros/useMinhaAvaliacao'
import { alternarMarca, continuarLista, type Edicao } from '../../markdown/edicao'
import { temMarcacaoForaDoSubconjunto } from '../../markdown/resenha'
import { acervoService } from '../../services/acervo'

/**
 * Editor de resenha (RF-AVA-02..04, a partir de `escrever-resenha.html`).
 *
 * - Texto cru em Newsreader, sem borda, com a marcação do Markdown visível (F-AVA-2, RN-13). A
 *   barra de formatação e o `Visualizar` ficam no topo da coluna (escrever-resenha.md §4.5); a
 *   pré-visualização é o mesmo `TextoDaResenha` da página do livro.
 * - O texto nunca é cortado nem bloqueado na digitação; acima de 5.000 caracteres só a publicação
 *   fica bloqueada. A contagem é por code point, como no servidor, e inclui a marcação.
 * - Fechar com texto não salvo pede confirmação: pelo `X`, pelo `Esc`, pela navegação e ao fechar
 *   a aba ou recarregar. Nada é descartado em silêncio (§9).
 * - Depois de publicar ou excluir, sai com `replace`, para o voltar do navegador não reabrir o
 *   editor.
 */
const LIMITE = 5000
const ABAS = [
  { modo: 'escrever', rotulo: 'Escrever' },
  { modo: 'visualizar', rotulo: 'Visualizar' },
] as const

const route = useRoute()
const router = useRouter()
const avaliacao = useMinhaAvaliacao()

const livroId = computed(() => String(route.params.id))
const pessoal = computed(() => route.name === 'escrever-resenha-pessoal')

const livro = ref<LivroAvaliado | null>(null)
const carregandoLivro = ref(true)
const texto = ref('')
const spoiler = ref(false)
const enviando = ref(false)
const excluindo = ref(false)
const erro = ref<string | null>(null)
const painelAberto = ref(false)
const confirmandoExclusao = ref(false)
const confirmandoDescarte = ref(false)
const modo = ref<'escrever' | 'visualizar'>('escrever')
const campo = useTemplateRef<HTMLTextAreaElement>('campo')
const selecao = ref({ inicio: 0, fim: 0 })
let rolagemDoCampo = 0
let saidaLiberada = false
let destinoPendente: string | null = null

const numero = new Intl.NumberFormat('pt-BR')

const resenha = computed(() => avaliacao.resenha.value)
// Até a resenha salva chegar, o campo fica só leitura: o que fosse digitado seria trocado por ela,
// e publicar às cegas sobrescreveria o texto salvo.
const avaliacaoPronta = computed(() => avaliacao.estado.value === 'pronta')
const editando = computed(() => resenha.value !== null)
const total = computed(() => [...texto.value].length)
const excedente = computed(() => total.value - LIMITE)
const podePublicar = computed(
  () => avaliacaoPronta.value && !enviando.value && texto.value.trim().length > 0 && total.value <= LIMITE,
)
const sujo = computed(
  () => texto.value !== (resenha.value?.texto ?? '') || spoiler.value !== (resenha.value?.spoiler ?? false),
)
const rotuloDaAcao = computed(() =>
  enviando.value && !excluindo.value ? 'Publicando' : editando.value ? 'Salvar' : 'Publicar',
)
const notaSalva = computed(() => avaliacao.nota.value?.valor ?? null)
const formatacaoBloqueada = computed(() => enviando.value || !avaliacaoPronta.value)
const edicao = computed<Edicao>(() => ({
  texto: texto.value,
  inicio: Math.min(selecao.value.inicio, texto.value.length),
  fim: Math.min(selecao.value.fim, texto.value.length),
}))
const temMarcacaoLiteral = computed(() => temMarcacaoForaDoSubconjunto(texto.value))

/** A página do livro de onde se veio, preservando a aba de origem. */
const paginaDoLivro = computed<RouteLocationRaw>(() =>
  pessoal.value
    ? { name: 'livro-pessoal', params: { id: livroId.value } }
    : { name: 'livro-oficial', params: { id: livroId.value }, query: route.query },
)

async function carregarLivro(): Promise<void> {
  carregandoLivro.value = true
  try {
    if (pessoal.value) {
      const detalhe = await acervoService.obterLivroPessoal(livroId.value)
      livro.value = { titulo: detalhe.titulo, autor: detalhe.autor, capaUrl: detalhe.capaUrl }
    } else {
      const detalhe = await acervoService.obterLivroOficial(livroId.value)
      livro.value = {
        titulo: detalhe.titulo,
        autor: detalhe.autores.map((autor) => autor.nome).join(', ') || null,
        capaUrl: detalhe.capa.url,
      }
    }
  } catch {
    livro.value = null
  } finally {
    carregandoLivro.value = false
  }
}

onMounted(() => {
  void carregarLivro()
  void avaliacao.carregar(livroId.value)
})

// O texto existente entra quando a avaliação chega, só uma vez.
let preenchido = false
watch(
  () => avaliacao.estado.value,
  (estado) => {
    if (estado === 'pronta' && !preenchido) {
      preenchido = true
      texto.value = resenha.value?.texto ?? ''
      spoiler.value = resenha.value?.spoiler ?? false
    }
  },
  { immediate: true },
)

/**
 * Vindo da página do livro, volta a ela no histórico; senão troca o editor pela página. Um
 * `replace` vindo do livro deixaria o livro duas vezes seguidas no histórico.
 */
async function sairParaOLivro(): Promise<void> {
  saidaLiberada = true
  if (router.options.history.state.back === router.resolve(paginaDoLivro.value).fullPath) {
    router.back()
  } else {
    await router.replace(paginaDoLivro.value)
  }
}

/** A seleção do campo alimenta o estado ativo da barra. */
function lerSelecao(): void {
  if (campo.value) {
    selecao.value = { inicio: campo.value.selectionStart, fim: campo.value.selectionEnd }
  }
}

/** Aplica a edição da barra, do `Enter` ou do atalho, e devolve o cursor ao campo. */
async function aplicar(nova: Edicao): Promise<void> {
  texto.value = nova.texto
  selecao.value = { inicio: nova.inicio, fim: nova.fim }
  await nextTick()
  campo.value?.focus()
  campo.value?.setSelectionRange(nova.inicio, nova.fim)
}

/** `Enter` continua a lista; `Ctrl/Cmd+B` e `Ctrl/Cmd+I` aplicam negrito e itálico (§9). */
function aoTeclarNoCampo(evento: KeyboardEvent): void {
  if (formatacaoBloqueada.value || evento.isComposing) {
    return
  }
  lerSelecao()
  if (evento.key === 'Enter' && !evento.shiftKey && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
    const continuada = continuarLista(edicao.value)
    if (continuada) {
      evento.preventDefault()
      void aplicar(continuada)
    }
    return
  }
  const tecla = evento.key.toLowerCase()
  if ((evento.ctrlKey || evento.metaKey) && !evento.altKey && !evento.shiftKey && (tecla === 'b' || tecla === 'i')) {
    evento.preventDefault()
    void aplicar(alternarMarca(edicao.value, tecla === 'b' ? '**' : '*'))
  }
}

/**
 * Trocar de modo não publica, não salva e não descarta (§9). O campo fica no DOM, escondido, e
 * volta com o cursor e a rolagem de antes.
 */
async function trocarModo(novo: 'escrever' | 'visualizar'): Promise<void> {
  if (novo === modo.value) {
    return
  }
  if (novo === 'visualizar') {
    rolagemDoCampo = campo.value?.scrollTop ?? 0
  }
  modo.value = novo
  if (novo === 'escrever') {
    await nextTick()
    if (campo.value) {
      campo.value.setSelectionRange(edicao.value.inicio, edicao.value.fim)
      campo.value.scrollTop = rolagemDoCampo
    }
  }
}

/** Setas trocam de aba, como pede o padrão de abas da WAI-ARIA. */
function aoTeclarNasAbas(evento: KeyboardEvent): void {
  if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') {
    return
  }
  evento.preventDefault()
  const novo = modo.value === 'escrever' ? 'visualizar' : 'escrever'
  void trocarModo(novo)
  document.getElementById(`aba-${novo}`)?.focus()
}

// Mexer no texto depois de uma falha: o aviso de limite volta a aparecer, e o erro, que já foi
// lido, sai de cima dele.
watch(texto, () => {
  erro.value = null
})

async function publicar(): Promise<void> {
  if (!podePublicar.value) {
    return
  }
  enviando.value = true
  erro.value = null
  try {
    await avaliacao.salvarResenha(texto.value, spoiler.value)
    await sairParaOLivro()
  } catch {
    erro.value = 'Não foi possível publicar sua resenha. O texto continua aqui. Tente de novo.'
  } finally {
    enviando.value = false
  }
}

async function excluir(): Promise<void> {
  enviando.value = true
  excluindo.value = true
  erro.value = null
  try {
    await avaliacao.excluirResenha()
    confirmandoExclusao.value = false
    await sairParaOLivro()
  } catch {
    confirmandoExclusao.value = false
    erro.value = 'Não foi possível excluir sua resenha. Tente de novo.'
  } finally {
    enviando.value = false
    excluindo.value = false
  }
}

function cancelar(): void {
  if (window.history.state?.back) {
    router.back()
  } else {
    void router.push(paginaDoLivro.value)
  }
}

onBeforeRouteLeave((destino) => {
  if (saidaLiberada || !sujo.value) {
    return true
  }
  if (enviando.value) {
    return false
  }
  destinoPendente = destino.fullPath
  confirmandoDescarte.value = true
  return false
})

async function descartar(): Promise<void> {
  confirmandoDescarte.value = false
  saidaLiberada = true
  await router.push(destinoPendente ?? router.resolve(paginaDoLivro.value).fullPath)
}

/** Fechar a aba ou recarregar com texto não salvo: o navegador pergunta. */
function aoSairDaPagina(evento: BeforeUnloadEvent): void {
  if (sujo.value && !saidaLiberada) {
    evento.preventDefault()
  }
}

/**
 * `Esc` fora de um modal tenta sair, e a guarda de saída pergunta se houver texto. O modal trata o
 * próprio `Esc` antes (e marca `defaultPrevented`); quando o evento chega aqui ele já fechou.
 */
function aoTeclar(evento: KeyboardEvent): void {
  if (
    evento.key !== 'Escape' ||
    evento.defaultPrevented ||
    painelAberto.value ||
    confirmandoExclusao.value ||
    confirmandoDescarte.value
  ) {
    return
  }
  cancelar()
}

onMounted(() => {
  window.addEventListener('beforeunload', aoSairDaPagina)
  window.addEventListener('keydown', aoTeclar)
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', aoSairDaPagina)
  window.removeEventListener('keydown', aoTeclar)
})
</script>

<template>
  <div class="mx-auto max-w-[1120px] pb-space-24 pt-space-4 md:grid md:grid-cols-[280px_minmax(0,1fr)] md:gap-x-space-16 md:pb-space-10 md:pt-space-6">
    <!-- Coluna do livro: fixa ao rolar a partir de 768px; abaixo, o card horizontal do mobile. -->
    <aside class="flex gap-space-4 border-b border-linha pb-space-4 md:sticky md:top-space-6 md:flex-col md:self-start md:border-0 md:pb-0">
      <div
        v-if="carregandoLivro"
        class="h-[90px] w-[60px] shrink-0 bg-capa-placeholder md:h-[360px] md:w-[240px]"
        aria-hidden="true"
      />
      <CapaLivro
        v-else
        class="h-[90px] w-[60px] shrink-0 md:h-[360px] md:w-[240px]"
        :url="livro?.capaUrl ?? null"
        :titulo="livro?.titulo"
        :autor="livro?.autor ?? undefined"
        :rotulo="livro ? `Capa de ${livro.titulo}` : 'Capa do livro'"
      />
      <div class="min-w-0">
        <p class="line-clamp-2 text-title-sm text-tinta">
          {{ livro?.titulo }}
        </p>
        <p
          v-if="livro?.autor"
          class="text-caption text-grafite"
        >
          {{ livro.autor }}
        </p>
        <div class="mt-space-1 flex flex-wrap items-center gap-x-space-2">
          <EstrelasNota
            v-if="notaSalva !== null"
            :valor="notaSalva"
            tamanho="sm"
          />
          <template v-else>
            <span class="text-caption text-grafite-suave">Sem nota</span>
            <BotaoTextual
              class="min-h-12 md:min-h-10"
              :disabled="enviando || !livro || !avaliacaoPronta"
              @click="painelAberto = true"
            >
              Dar nota
            </BotaoTextual>
          </template>
        </div>
        <p
          v-if="resenha"
          class="mt-space-2 text-caption text-grafite-suave"
        >
          Publicada em {{ formatarData(resenha.criadoEm) }}
        </p>
      </div>
    </aside>

    <section class="flex min-h-[60vh] flex-col md:max-w-[68ch]">
      <!-- Linha de ferramentas: alternância e, no modo `Escrever`, a barra (§4.5). A linha mantém a
           altura no `Visualizar`, para o texto não subir ao trocar de modo. -->
      <div class="flex flex-wrap items-center gap-x-space-6 gap-y-space-2 pb-space-2 pt-space-3 md:mb-space-4 md:min-h-10 md:p-0">
        <div
          role="tablist"
          aria-label="Modo do editor"
          class="flex h-12 w-[240px] shrink-0 rounded-full border border-linha bg-papel-elevado p-space-1 md:h-10 md:w-[216px]"
        >
          <button
            v-for="aba in ABAS"
            :id="`aba-${aba.modo}`"
            :key="aba.modo"
            type="button"
            role="tab"
            :aria-selected="modo === aba.modo"
            :aria-controls="`painel-${aba.modo}`"
            :tabindex="modo === aba.modo ? 0 : -1"
            :disabled="enviando"
            class="flex-1 cursor-pointer rounded-full text-body-strong transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:cursor-not-allowed disabled:text-grafite-suave"
            :class="modo === aba.modo ? 'bg-musgo-fundo text-musgo' : 'text-grafite enabled:hover:bg-linha'"
            @click="trocarModo(aba.modo)"
            @keydown="aoTeclarNasAbas"
          >
            {{ aba.rotulo }}
          </button>
        </div>
        <BarraDeFormatacao
          v-if="modo === 'escrever'"
          :edicao="edicao"
          :desabilitada="formatacaoBloqueada"
          @aplicar="aplicar"
        />
      </div>

      <div
        v-show="modo === 'escrever'"
        id="painel-escrever"
        role="tabpanel"
        aria-labelledby="aba-escrever"
        class="flex flex-1 flex-col"
      >
        <label
          for="texto-da-resenha"
          class="sr-only"
        >Texto da resenha</label>
        <textarea
          id="texto-da-resenha"
          ref="campo"
          v-model="texto"
          :readonly="enviando || !avaliacaoPronta"
          :aria-busy="avaliacao.estado.value === 'carregando' || undefined"
          class="min-h-[50vh] w-full flex-1 resize-none bg-transparent font-editorial text-body-lg text-tinta caret-musgo outline-none placeholder:text-grafite-suave"
          placeholder="Escreva sobre o livro. O que ficou, o que incomodou, para quem você indicaria."
          @keydown="aoTeclarNoCampo"
          @select="lerSelecao"
          @keyup="lerSelecao"
          @mouseup="lerSelecao"
          @input="lerSelecao"
          @focus="lerSelecao"
        />
      </div>

      <!-- Pré-visualização: o que o leitor vai ver, sem véu de spoiler e sem barra (§5.3 e §5.4). -->
      <div
        v-show="modo === 'visualizar'"
        id="painel-visualizar"
        role="tabpanel"
        aria-labelledby="aba-visualizar"
        tabindex="0"
        class="min-h-[50vh] flex-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
      >
        <template v-if="modo === 'visualizar'">
          <div
            v-if="texto.trim().length === 0"
            class="flex min-h-[50vh] flex-col items-center justify-center gap-space-4 text-center"
          >
            <PhEye
              :size="32"
              weight="regular"
              class="text-grafite-suave"
              aria-hidden="true"
            />
            <p class="max-w-[260px] text-body text-grafite">
              Nada para visualizar ainda. Escreva sua resenha para ver como ela vai aparecer.
            </p>
          </div>
          <template v-else>
            <FaixaInformativa
              v-if="temMarcacaoLiteral"
              class="mb-space-4"
            >
              Links, imagens, tabelas, títulos, código e HTML aparecem como você digitou. A resenha aceita negrito, itálico, tachado, listas e citação.
            </FaixaInformativa>
            <TextoDaResenha
              lang="pt-BR"
              :texto="texto"
            />
          </template>
        </template>
      </div>

      <!-- Avisos acima da barra, como no `.html`. -->
      <div
        v-if="avaliacao.estado.value === 'erro'"
        class="mb-space-3 flex flex-wrap items-center gap-space-2"
      >
        <p class="text-body text-grafite">
          Não foi possível carregar sua resenha.
        </p>
        <BotaoTextual @click="avaliacao.carregar()">
          Tentar de novo
        </BotaoTextual>
      </div>
      <div
        v-else-if="erro"
        class="mb-space-3"
      >
        <BannerAviso variante="erro">
          {{ erro }}
        </BannerAviso>
      </div>
      <p
        v-else-if="excedente > 0"
        class="mb-space-2 text-caption text-rubi"
      >
        Sua resenha passou do limite em {{ excedente === 1 ? '1 caractere' : `${numero.format(excedente)} caracteres` }}, contando a formatação. Corte um trecho para publicar.
      </p>
      <p
        v-else-if="spoiler"
        class="mb-space-2 text-caption text-ambar"
      >
        Sua resenha será exibida oculta. Quem quiser ler precisa tocar para revelar.
      </p>

      <div class="fixed inset-x-0 bottom-0 z-10 flex min-h-14 items-center gap-space-3 border-t border-linha bg-papel-elevado px-space-5 pb-[env(safe-area-inset-bottom)] md:sticky md:bottom-0 md:bg-papel md:px-0 md:pb-0">
        <ToggleSpoiler
          v-model="spoiler"
          :desabilitado="enviando || !avaliacaoPronta"
        />
        <ContadorDeCaracteres
          class="ml-auto"
          :total="total"
          :limite="LIMITE"
        />
        <button
          v-if="editando"
          type="button"
          class="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-rubi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:cursor-not-allowed disabled:opacity-60 md:h-10 md:w-10 md:hover:bg-linha"
          aria-label="Excluir resenha"
          :disabled="enviando"
          @click="confirmandoExclusao = true"
        >
          <PhTrash
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </div>
    </section>

    <PainelDeNota
      v-if="livro"
      :aberta="painelAberto"
      :livro="livro"
      :avaliacao="avaliacao"
      @fechar="painelAberto = false"
    />

    <DialogoConfirmacao
      :aberta="confirmandoExclusao"
      compacto
      titulo="Excluir sua resenha?"
      rotulo-confirmar="Excluir resenha"
      :processando="enviando"
      @confirmar="excluir"
      @cancelar="confirmandoExclusao = false"
    >
      O texto será apagado e sai da página do livro e do seu perfil. Sua nota continua registrada.
    </DialogoConfirmacao>

    <DialogoConfirmacao
      :aberta="confirmandoDescarte"
      compacto
      titulo="Descartar a resenha?"
      rotulo-confirmar="Descartar"
      rotulo-cancelar="Continuar escrevendo"
      @confirmar="descartar"
      @cancelar="confirmandoDescarte = false"
    >
      O que você escreveu aqui não foi salvo e será perdido.
    </DialogoConfirmacao>
  </div>

  <Teleport
    to="#cabecalho-acoes"
    defer
  >
    <!-- Mobile: `Publicar` textual; web: `Cancelar` e o pill `Publicar`. -->
    <BotaoTextual
      class="-mr-space-3 min-h-12 px-space-3 text-body-strong md:hidden"
      :tom="podePublicar ? 'musgo' : 'grafite'"
      :disabled="!podePublicar"
      @click="publicar"
    >
      {{ rotuloDaAcao }}
    </BotaoTextual>
    <div class="hidden items-center gap-space-4 md:flex">
      <BotaoTextual
        class="min-h-10 px-space-3"
        tom="grafite"
        :disabled="enviando"
        @click="cancelar"
      >
        Cancelar
      </BotaoTextual>
      <BotaoPrimario
        class="w-auto px-space-6"
        :disabled="!podePublicar && !enviando"
        :carregando="enviando"
        aparencia-desabilitada="neutra"
        @click="publicar"
      >
        {{ rotuloDaAcao }}
      </BotaoPrimario>
    </div>
  </Teleport>
</template>
