<script setup lang="ts">
import { PhTrash } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import CapaLivro from '../../components/livros/CapaLivro.vue'
import ContadorDeCaracteres from '../../components/livros/ContadorDeCaracteres.vue'
import EstrelasNota from '../../components/livros/EstrelasNota.vue'
import PainelDeNota from '../../components/livros/PainelDeNota.vue'
import ToggleSpoiler from '../../components/livros/ToggleSpoiler.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import { formatarData } from '../../livros/formatos'
import { useMinhaAvaliacao, type LivroAvaliado } from '../../livros/useMinhaAvaliacao'
import { acervoService } from '../../services/acervo'

/**
 * Editor de resenha (RF-AVA-02..04, a partir de `escrever-resenha.html`).
 *
 * - Texto puro em Newsreader, sem borda: Markdown é do Período 2.
 * - O texto nunca é cortado nem bloqueado na digitação; acima de 5.000 caracteres só a publicação
 *   fica bloqueada. A contagem é por code point, como no servidor.
 * - Fechar com texto não salvo pede confirmação: pelo `X`, pelo `Esc`, pela navegação e ao fechar
 *   a aba ou recarregar. Nada é descartado em silêncio (§9).
 * - Depois de publicar ou excluir, sai com `replace`, para o voltar do navegador não reabrir o
 *   editor.
 */
const LIMITE = 5000

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
const erro = ref<string | null>(null)
const painelAberto = ref(false)
const confirmandoExclusao = ref(false)
const confirmandoDescarte = ref(false)
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
const rotuloDaAcao = computed(() => (enviando.value ? 'Publicando' : editando.value ? 'Salvar' : 'Publicar'))
const notaSalva = computed(() => avaliacao.nota.value?.valor ?? null)

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

async function sairParaOLivro(): Promise<void> {
  saidaLiberada = true
  await router.replace(paginaDoLivro.value)
}

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

/** `Esc` fora de um modal tenta sair, e a guarda de saída pergunta se houver texto. */
function aoTeclar(evento: KeyboardEvent): void {
  if (evento.key !== 'Escape' || painelAberto.value || confirmandoExclusao.value || confirmandoDescarte.value) {
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
              :disabled="enviando || !livro"
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
      <label
        for="texto-da-resenha"
        class="sr-only"
      >Texto da resenha</label>
      <textarea
        id="texto-da-resenha"
        v-model="texto"
        :readonly="enviando || !avaliacaoPronta"
        :aria-busy="avaliacao.estado.value === 'carregando' || undefined"
        class="mt-space-5 min-h-[50vh] w-full flex-1 resize-none bg-transparent font-editorial text-body-lg text-tinta caret-musgo outline-none placeholder:text-grafite-suave md:mt-0"
        placeholder="Escreva sobre o livro. O que ficou, o que incomodou, para quem você indicaria."
      />

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
        Sua resenha passou do limite em {{ excedente === 1 ? '1 caractere' : `${numero.format(excedente)} caracteres` }}. Corte um trecho para publicar.
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
