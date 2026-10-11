<script setup lang="ts">
import { PhInfo, PhPlus, PhQuotes, PhWarning } from '@phosphor-icons/vue'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { usarRotuloVoltar } from '../../cabecalho'
import AdicionarFrase, { type LivroDaFrase } from '../../components/livros/AdicionarFrase.vue'
import CapaLivro from '../../components/livros/CapaLivro.vue'
import FraseCitada from '../../components/livros/FraseCitada.vue'
import FimDaLista from '../../components/perfil/FimDaLista.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import { linhaDaCota, rotuloDeFrases, TEXTOS_DAS_FRASES as T } from '../../livros/frases'
import { acervoService } from '../../services/acervo'
import { novaChaveIdempotencia } from '../../services/api'
import { leituraService, type Frase } from '../../services/leitura'

/**
 * Lista completa de frases de um livro (frases-do-livro.md, F-AVA-2, RF-AVA-07): bloco do livro
 * com a linha de cota e `Adicionar frase`, e as frases de todos os leitores (RN-08 no servidor),
 * mais recentes primeiro, com rolagem infinita. Só a frase de quem olha tem `Trash`, com
 * confirmação (RNF-USA-04); a exclusão não tem toast nem desfazer, e é anunciada ao leitor de tela.
 *
 * No limite de 10, o botão dá lugar à explicação, que não é erro. A rota do livro pessoal só serve
 * ao dono: o servidor responde 404 a qualquer outro.
 */
const route = useRoute()
const pessoal = computed(() => route.name === 'frases-do-livro-pessoal')
const livroId = computed(() => String(route.params.id))

const livro = ref<LivroDaFrase | null>(null)
const frases = ref<Frase[]>([])
const total = ref(0)
const minhas = ref(0)
const limite = ref(10)
const pagina = ref(0)
const totalPaginas = ref(0)
const estado = ref<'carregando' | 'pronta' | 'erro'>('carregando')
const carregandoMais = ref(false)
const falhouMais = ref(false)
const adicionando = ref(false)
const anuncio = ref('')

const paraExcluir = ref<Frase | null>(null)
const excluindo = ref(false)
const erroExclusao = ref<string | null>(null)
let chaveExclusao: { id: string; chave: string } | null = null

const temMais = computed(() => pagina.value < totalPaginas.value)
const noLimite = computed(() => minhas.value >= limite.value)

usarRotuloVoltar(() => livro.value?.titulo ?? null)

async function carregarLivro(): Promise<LivroDaFrase> {
  if (pessoal.value) {
    const dados = await acervoService.obterLivroPessoal(livroId.value)
    return { id: dados.id, titulo: dados.titulo, autor: dados.autor, capaUrl: dados.capaUrl, paginas: dados.paginas }
  }
  const dados = await acervoService.obterLivroOficial(livroId.value)
  return {
    id: dados.id,
    titulo: dados.titulo,
    autor: dados.autores.map((autor) => autor.nome).join(', ') || null,
    capaUrl: dados.capa.url,
    paginas: dados.paginas,
  }
}

async function carregar(): Promise<void> {
  estado.value = 'carregando'
  try {
    const [dadosDoLivro, primeira] = await Promise.all([carregarLivro(), leituraService.listarFrases(livroId.value, 1)])
    livro.value = dadosDoLivro
    frases.value = primeira.itens
    total.value = primeira.paginacao.totalItens
    totalPaginas.value = primeira.paginacao.totalPaginas
    pagina.value = 1
    minhas.value = primeira.minhasFrases
    limite.value = primeira.limitePorLivro
    estado.value = 'pronta'
  } catch {
    estado.value = 'erro'
  }
}

/** Página seguinte no fim da lista, sem mexer no que já está na tela (§4.8). */
async function carregarMais(): Promise<void> {
  if (carregandoMais.value || !temMais.value) return
  carregandoMais.value = true
  falhouMais.value = false
  try {
    const seguinte = await leituraService.listarFrases(livroId.value, pagina.value + 1)
    const vistos = new Set(frases.value.map((frase) => frase.id))
    frases.value = [...frases.value, ...seguinte.itens.filter((frase) => !vistos.has(frase.id))]
    pagina.value += 1
    totalPaginas.value = seguinte.paginacao.totalPaginas
  } catch {
    falhouMais.value = true
  } finally {
    carregandoMais.value = false
  }
}

watch(livroId, carregar, { immediate: true })

function aoSalvar(frase: Frase): void {
  adicionando.value = false
  frases.value = [frase, ...frases.value]
  total.value += 1
  minhas.value += 1
}

function pedirExclusao(frase: Frase): void {
  erroExclusao.value = null
  paraExcluir.value = frase
}

async function confirmarExclusao(): Promise<void> {
  const frase = paraExcluir.value
  if (!frase || excluindo.value) return
  if (chaveExclusao?.id !== frase.id) {
    chaveExclusao = { id: frase.id, chave: novaChaveIdempotencia() }
  }
  excluindo.value = true
  erroExclusao.value = null
  try {
    await leituraService.excluirFrase(frase.id, chaveExclusao.chave)
    chaveExclusao = null
    const posicao = frases.value.findIndex((item) => item.id === frase.id)
    frases.value = frases.value.filter((item) => item.id !== frase.id)
    total.value = Math.max(0, total.value - 1)
    minhas.value = Math.max(0, minhas.value - 1)
    paraExcluir.value = null
    anuncio.value = `Frase excluída. ${rotuloDeFrases(total.value)}.`
    // O foco vai para a frase que ocupou o lugar da excluída (§9).
    await nextTick()
    const proxima = document.querySelectorAll<HTMLElement>('[data-frase]')[Math.max(0, posicao)]
    proxima?.focus()
  } catch {
    erroExclusao.value = T.excluirFalha
  } finally {
    excluindo.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1120px] px-space-5 py-space-4 md:px-space-8 md:py-space-6">
    <p
      class="sr-only"
      aria-live="polite"
    >
      {{ anuncio }}
    </p>

    <div
      v-if="estado === 'erro'"
      class="flex flex-col items-start gap-space-3"
    >
      <div
        role="alert"
        class="flex w-full items-start gap-space-3 rounded-base bg-rubi-fundo p-space-4"
      >
        <PhWarning
          :size="20"
          weight="regular"
          class="shrink-0 text-rubi"
          aria-hidden="true"
        />
        <p class="text-body text-tinta">
          {{ T.erroCarga }}
        </p>
      </div>
      <BotaoTextual @click="carregar">
        {{ T.tentarDeNovo }}
      </BotaoTextual>
    </div>

    <div
      v-else-if="estado === 'carregando'"
      class="flex flex-col gap-space-6 md:flex-row md:gap-space-8"
      aria-hidden="true"
    >
      <div class="flex gap-space-4 md:w-[280px] md:flex-col">
        <div class="h-[72px] w-12 bg-capa-placeholder md:h-[180px] md:w-[120px]" />
        <div class="flex flex-1 flex-col gap-space-2">
          <div class="h-[17px] w-[60%] rounded-sm bg-capa-placeholder" />
          <div class="h-[13px] w-[45%] rounded-sm bg-capa-placeholder" />
          <div class="h-12 w-full rounded-base bg-capa-placeholder md:h-10" />
        </div>
      </div>
      <div class="flex flex-1 flex-col gap-space-6">
        <div
          v-for="indice in 4"
          :key="indice"
          class="flex flex-col gap-space-2 border-l-2 border-capa-placeholder pl-space-4"
        >
          <div class="h-[17px] w-[95%] rounded-sm bg-capa-placeholder" />
          <div class="h-[17px] w-[55%] rounded-sm bg-capa-placeholder" />
          <div class="h-[13px] w-[35%] rounded-sm bg-capa-placeholder" />
        </div>
      </div>
    </div>

    <div
      v-else-if="livro"
      class="flex flex-col gap-space-5 md:flex-row md:items-start md:gap-space-8"
    >
      <aside class="flex flex-col md:sticky md:top-space-8 md:w-[280px] md:shrink-0">
        <div class="flex items-start gap-space-4 md:flex-col">
          <CapaLivro
            class="h-[72px] w-12 shrink-0 md:h-[180px] md:w-[120px] md:shadow-1"
            :url="livro.capaUrl"
            :rotulo="`Capa de ${livro.titulo}`"
            :titulo="livro.titulo"
            :autor="livro.autor"
            :icone="false"
          />
          <div class="flex min-w-0 flex-col gap-space-1">
            <p class="text-title-sm text-tinta md:text-title-lg">
              {{ livro.titulo }}
            </p>
            <p
              v-if="livro.autor"
              class="text-caption text-grafite md:text-body"
            >
              {{ livro.autor }}
            </p>
            <p class="text-caption text-grafite md:hidden">
              {{ rotuloDeFrases(total) }}
            </p>
          </div>
        </div>
        <p class="mt-space-4 text-caption text-grafite">
          {{ linhaDaCota(minhas, limite) }}
        </p>
        <p
          v-if="noLimite"
          class="mt-space-3 flex items-start gap-space-2 text-caption text-grafite"
        >
          <PhInfo
            :size="16"
            weight="regular"
            class="mt-[2px] shrink-0"
            aria-hidden="true"
          />
          {{ T.limite }}
        </p>
        <button
          v-else-if="total > 0"
          type="button"
          class="mt-space-3 flex h-12 w-full items-center justify-center gap-space-2 rounded-base border border-linha text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
          @click="adicionando = true"
        >
          <PhPlus
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
          {{ T.adicionar }}
        </button>
      </aside>

      <section
        class="min-w-0 flex-1 border-t border-linha md:border-t-0"
        aria-labelledby="titulo-lista-frases"
      >
        <div class="hidden items-baseline gap-space-3 md:flex">
          <h1
            id="titulo-lista-frases"
            class="text-display text-tinta"
          >
            {{ T.titulo }}
          </h1>
          <span class="text-caption text-grafite">{{ rotuloDeFrases(total) }}</span>
        </div>

        <div
          v-if="frases.length === 0"
          class="mt-space-10 flex flex-col items-center gap-space-6 text-center"
        >
          <PhQuotes
            :size="32"
            weight="regular"
            class="text-grafite-suave"
            aria-hidden="true"
          />
          <p class="text-title text-tinta">
            {{ T.vazioTitulo }}
          </p>
          <p class="max-w-[280px] text-body text-grafite">
            {{ T.vazioTexto }}
          </p>
          <BotaoPrimario
            class="h-12 md:h-10 md:w-auto"
            @click="adicionando = true"
          >
            {{ T.vazioBotao }}
          </BotaoPrimario>
        </div>

        <ul
          v-else
          class="max-w-[68ch] divide-y divide-linha md:mt-space-6"
        >
          <li
            v-for="frase in frases"
            :key="frase.id"
            data-frase
            tabindex="-1"
            class="py-space-5 outline-none"
          >
            <FraseCitada
              :frase="frase"
              com-excluir
              @excluir="pedirExclusao(frase)"
            />
          </li>
        </ul>
        <FimDaLista
          v-if="temMais || falhouMais"
          :falhou="falhouMais"
          :carregando="carregandoMais"
          @carregar="carregarMais"
        />
      </section>
    </div>

    <AdicionarFrase
      v-if="livro"
      :aberta="adicionando"
      :livro="livro"
      :minhas-frases="minhas"
      :limite="limite"
      @salva="aoSalvar"
      @fechar="adicionando = false"
      @ver-minhas="adicionando = false"
    />

    <DialogoConfirmacao
      :aberta="paraExcluir !== null"
      :titulo="T.excluirTitulo"
      :rotulo-confirmar="T.excluirBotao"
      :processando="excluindo"
      :erro="erroExclusao ?? undefined"
      @confirmar="confirmarExclusao"
      @cancelar="paraExcluir = null"
    >
      <FraseCitada
        v-if="paraExcluir"
        :frase="paraExcluir"
        compacta
      />
      <p class="mt-space-4 text-body text-grafite">
        {{ T.excluirConsequencia }}
      </p>
    </DialogoConfirmacao>
  </div>
</template>
