<script setup lang="ts">
import { PhBookOpen, PhDotsThreeVertical, PhPencilSimple, PhTrash } from '@phosphor-icons/vue'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AcoesLeitura from '../../components/estante/AcoesLeitura.vue'
import StatusPill from '../../components/estante/StatusPill.vue'
import BlocoDeSpoiler from '../../components/livros/BlocoDeSpoiler.vue'
import BlocoSuaAvaliacao from '../../components/livros/BlocoSuaAvaliacao.vue'
import CapaLivro from '../../components/livros/CapaLivro.vue'
import EstrelasNota from '../../components/livros/EstrelasNota.vue'
import RegistrarProgresso from '../../components/progresso/RegistrarProgresso.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import FolhaAcoes, { type AcaoDaFolha } from '../../components/ui/FolhaAcoes.vue'
import { TEXTOS_DO_PAINEL, textoVezesLido } from '../../estante/textos'
import { usePainelDeAcoes } from '../../estante/usePainelDeAcoes'
import { formatarData, formatarPaginas } from '../../livros/formatos'
import { useMinhaAvaliacao } from '../../livros/useMinhaAvaliacao'
import { caminhoDoProgresso } from '../../progresso/caminhos'
import { useDialogoDeRegistro } from '../../progresso/useDialogoDeRegistro'
import { acervoService, type LivroPessoalDetalhe, type ViaDeAcesso } from '../../services/acervo'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { leituraService, type ItemEstante } from '../../services/leitura'

/**
 * Página do livro pessoal (RF-ACV-09, RN-03, RN-15). Estrutura e copy de
 * docs/design/periodo-1/F-ACV-CADASTRO/livro-pessoal.md §4, §5 e §8.
 *
 * Dois públicos: o dono, que vê editar e excluir, e o terceiro que chega pelo feed, em **modo
 * consulta**. Quem decide é o servidor (`modoConsulta`); no modo consulta as ações do dono não
 * são desenhadas nem desabilitadas, simplesmente não existem (RN-15.3). Livro excluído e acesso
 * negado caem no mesmo estado, sem confirmar a existência do livro (§4.8).
 *
 * Na web, duas colunas (capa, etiqueta e ficha à esquerda; título e conteúdo à direita) dentro
 * de 1080px. Abaixo de 768px as colunas se desfazem (`display: contents`) e a ordem do mobile
 * vem de `order`: hero, etiqueta, atribuição, ficha e conteúdo.
 */
const route = useRoute()
const router = useRouter()

const livro = ref<LivroPessoalDetalhe | null>(null)
const carregando = ref(true)
const indisponivel = ref(false)
const erroDeCarga = ref<string | null>(null)

const menuAberto = ref(false)
const confirmandoExclusao = ref(false)
const excluindo = ref(false)
const erroDaExclusao = ref<string | null>(null)

const acesso = computed<ViaDeAcesso | undefined>(() =>
  route.query.via === 'feed' && typeof route.query.referenciaId === 'string'
    ? { via: 'feed', referenciaId: route.query.referenciaId }
    : undefined,
)

const ehDono = computed(() => livro.value !== null && !livro.value.modoConsulta)
const nomeDoDono = computed(() => livro.value?.dono?.nome ?? null)
const primeiroNome = computed(() => nomeDoDono.value?.split(/\s+/)[0] ?? null)
const avaliado = computed(() => livro.value !== null && (livro.value.notaDoDono !== null || livro.value.resenhaDoDono !== null))

/**
 * O dono avalia o próprio livro pessoal pelo bloco "Sua avaliação" (F-AVA, RN-03), carregado do
 * `leitura`. O terceiro vê a nota e a resenha do dono que o `acervo` já traz, sem ação nenhuma.
 */
const minhaAvaliacao = useMinhaAvaliacao()
const rotaDoEditor = computed(() => ({ name: 'escrever-resenha-pessoal', params: { id: String(route.params.id) } }))

/** Resenha do dono com spoiler, vista por terceiro: fora do DOM até a ação (RF-AVA-03). */
const spoilerRevelado = ref(false)
const textoDaResenhaDoDono = useTemplateRef<HTMLParagraphElement>('textoDaResenhaDoDono')

/** Ao revelar o spoiler, o foco vai para o texto, para o leitor de tela continuar dali. */
async function revelarSpoiler(): Promise<void> {
  spoilerRevelado.value = true
  await nextTick()
  textoDaResenhaDoDono.value?.focus()
}
const livroAvaliado = computed(() => ({
  titulo: livro.value?.titulo ?? '',
  autor: livro.value?.autor ?? null,
  capaUrl: livro.value?.capaUrl ?? null,
}))

const acoesDoMenu: AcaoDaFolha[] = [
  { id: 'editar', rotulo: 'Editar livro', icone: PhPencilSimple },
  { id: 'excluir', rotulo: 'Excluir livro', icone: PhTrash, destrutiva: true },
]

watch(
  () => [route.params.id, route.query.via, route.query.referenciaId],
  () => void carregar(),
  { immediate: true },
)

const naEstante = ref<ItemEstante | null>(null)
const vezesLido = ref(0)
const situacaoCarregada = ref(false)
const situacaoFalhou = ref(false)
const painel = usePainelDeAcoes((leituraId) => leituraService.detalharLeitura(leituraId))
const registro = useDialogoDeRegistro()

function abrirRegistro(): void {
  painel.fechar()
  registro.abrir(painel.livro.value, painel.estado.value)
}

function aoSalvarProgresso(): void {
  registro.fechar()
  void carregarSituacao()
}

function verAtualizacoes(leituraId: string): void {
  painel.fechar()
  void router.push(caminhoDoProgresso(leituraId))
}

async function carregarSituacao(): Promise<void> {
  const livroId = String(route.params.id)
  situacaoCarregada.value = false
  situacaoFalhou.value = false
  try {
    const [item, conclusoes] = await Promise.all([
      leituraService.consultarItemEstante(livroId),
      leituraService.consultarConclusoes(livroId),
    ])
    naEstante.value = item
    vezesLido.value = conclusoes.vezesLido
    situacaoCarregada.value = true
  } catch {
    situacaoFalhou.value = true
  }
}

function abrirAcoes(): void {
  if (!livro.value) return
  const { titulo, autor, capaUrl } = livro.value
  void painel.abrir({ livroId: String(route.params.id), titulo, autor, capaUrl }, naEstante.value)
}

async function carregar(): Promise<void> {
  carregando.value = true
  indisponivel.value = false
  erroDeCarga.value = null
  try {
    livro.value = await acervoService.obterLivroPessoal(String(route.params.id), acesso.value)
    if (ehDono.value) {
      void carregarSituacao()
      void minhaAvaliacao.carregar(livro.value.id)
    }
  } catch (erro) {
    livro.value = null
    if (erro instanceof ApiError && (erro.status === 403 || erro.status === 404)) {
      indisponivel.value = true
    } else {
      erroDeCarga.value = erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
    }
  } finally {
    carregando.value = false
  }
}

function editar(): void {
  void router.push({ name: 'livro-pessoal-editar', params: { id: String(route.params.id) } })
}

function escolherNoMenu(id: string): void {
  menuAberto.value = false
  if (id === 'editar') {
    editar()
  } else {
    confirmandoExclusao.value = true
  }
}

async function excluir(): Promise<void> {
  excluindo.value = true
  erroDaExclusao.value = null
  try {
    await acervoService.excluirLivroPessoal(String(route.params.id), novaChaveIdempotencia())
    confirmandoExclusao.value = false
    await router.replace('/estante')
  } catch (erro) {
    erroDaExclusao.value = erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
  } finally {
    excluindo.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1080px] pb-space-12 pt-space-6">
    <!-- Skeleton com a forma do layout final (§4.7). -->
    <div
      v-if="carregando"
      class="flex flex-col items-center gap-space-3 md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-space-12"
      aria-busy="true"
      aria-label="Carregando livro"
    >
      <div class="h-[187px] w-[140px] rounded-base bg-linha md:aspect-[3/4] md:h-auto md:w-full" />
      <div class="flex w-full flex-col items-center gap-space-3 md:items-start">
        <div class="h-8 w-[70%] rounded-sm bg-linha" />
        <div class="h-8 w-[50%] rounded-sm bg-linha" />
        <div class="h-5 w-[40%] rounded-sm bg-linha" />
        <div class="mt-space-6 h-4 w-full rounded-sm bg-linha" />
        <div class="h-4 w-full rounded-sm bg-linha" />
        <div class="h-4 w-[80%] rounded-sm bg-linha" />
      </div>
    </div>

    <EstadoVazio
      v-else-if="indisponivel"
      :icone="PhBookOpen"
      titulo="Este livro não está mais disponível"
      class="mx-auto max-w-[480px] pt-space-2"
    >
      <p class="mt-space-3 text-body text-grafite">
        Ele pode ter sido excluído por quem o cadastrou.
      </p>
      <BotaoTextual
        class="mt-space-6 min-h-12 md:min-h-10"
        @click="router.push('/feed')"
      >
        Voltar ao feed
      </BotaoTextual>
    </EstadoVazio>

    <div
      v-else-if="erroDeCarga"
      class="mx-auto max-w-[640px]"
    >
      <BannerAviso variante="erro">
        {{ erroDeCarga }}
      </BannerAviso>
      <BotaoTextual
        class="mt-space-4 min-h-12 md:min-h-10"
        @click="carregar"
      >
        Tentar de novo
      </BotaoTextual>
    </div>

    <article
      v-else-if="livro"
      class="flex flex-col md:grid md:grid-cols-[280px_1fr] md:items-start md:gap-space-12"
    >
      <div class="contents md:flex md:flex-col">
        <CapaLivro
          :url="livro.capaUrl"
          :rotulo="`Capa de ${livro.titulo}`"
          class="order-1 mx-auto h-[187px] w-[140px] shadow-2 md:order-none md:mx-0 md:aspect-[3/4] md:h-auto md:w-full"
        />
        <p class="order-3 mt-space-3 self-center md:order-none md:mt-space-5 md:self-start">
          <span class="inline-flex h-6 items-center rounded-full bg-musgo-fundo px-space-3 text-label text-musgo">Livro pessoal</span>
        </p>
        <dl class="order-5 mt-space-6 flex items-center justify-between border-y border-linha py-space-5 md:order-none">
          <dt class="text-label text-grafite">
            Páginas
          </dt>
          <dd class="text-body text-tinta">
            {{ formatarPaginas(livro.paginas) }}
          </dd>
        </dl>
      </div>

      <div class="contents md:flex md:min-w-0 md:flex-col">
        <header class="order-2 mt-space-5 flex flex-col items-center text-center md:order-none md:mt-0 md:items-stretch md:text-left">
          <div class="flex flex-col md:flex-row md:items-start md:justify-between md:gap-space-6">
            <div class="min-w-0">
              <h2 class="line-clamp-3 text-display text-tinta">
                {{ livro.titulo }}
              </h2>
              <!-- Não é link: livro pessoal não tem página de autor (RN-03). -->
              <p class="mt-space-2 text-body-lg text-grafite">
                {{ livro.autor }}
              </p>
            </div>
            <div
              v-if="ehDono"
              class="hidden shrink-0 items-center gap-space-4 md:flex"
            >
              <BotaoTextual @click="editar">
                Editar
              </BotaoTextual>
              <BotaoTextual
                tom="rubi"
                @click="confirmandoExclusao = true"
              >
                Excluir
              </BotaoTextual>
            </div>
          </div>
        </header>

        <section
          v-if="ehDono"
          class="order-4 mt-space-5 flex flex-col items-center gap-space-3 md:order-none md:items-start"
        >
          <template v-if="situacaoCarregada">
            <div
              v-if="naEstante || vezesLido > 0"
              class="flex items-center gap-space-3"
            >
              <StatusPill
                v-if="naEstante"
                :status="naEstante.status"
              />
              <span
                v-if="vezesLido > 0"
                class="text-caption text-grafite"
              >{{ textoVezesLido(vezesLido) }}</span>
            </div>
            <button
              type="button"
              class="flex h-12 w-full items-center justify-center rounded-full bg-musgo px-space-8 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:opacity-60 md:h-10 md:w-auto"
              :disabled="painel.preparando.value"
              @click="abrirAcoes"
            >
              {{ naEstante ? TEXTOS_DO_PAINEL.alterarStatus : TEXTOS_DO_PAINEL.adicionarNaEstante }}
            </button>
          </template>
          <BannerAviso
            v-if="situacaoFalhou || painel.falhou.value"
            variante="erro"
          >
            {{ TEXTOS_DO_PAINEL.erroAoAbrir }}
            <BotaoTextual
              v-if="situacaoFalhou"
              class="mt-space-2"
              @click="carregarSituacao"
            >
              {{ TEXTOS_DO_PAINEL.tentarDeNovo }}
            </BotaoTextual>
          </BannerAviso>
        </section>

        <p
          v-if="!ehDono && nomeDoDono"
          class="order-4 mt-space-3 flex items-center justify-center gap-space-2 text-caption text-grafite md:order-none md:justify-start"
        >
          <img
            v-if="livro.dono?.avatarUrl"
            :src="livro.dono.avatarUrl"
            alt=""
            class="size-6 rounded-full object-cover"
          >
          <span
            v-else
            class="flex size-6 items-center justify-center rounded-full bg-papel-elevado text-label text-grafite"
            aria-hidden="true"
          >{{ nomeDoDono.charAt(0) }}</span>
          <span>Livro pessoal de <span class="text-musgo">{{ nomeDoDono }}</span></span>
        </p>

        <div class="order-6 divide-y divide-linha md:order-none md:mt-space-6 md:border-t md:border-linha">
          <section
            v-if="livro.sinopse"
            class="py-space-5"
          >
            <h3 class="text-title-sm text-tinta">
              Sinopse
            </h3>
            <p
              lang="pt-BR"
              class="mt-space-3 max-w-[68ch] whitespace-pre-line font-editorial text-body-lg text-tinta"
            >
              {{ livro.sinopse }}
            </p>
          </section>

          <BlocoSuaAvaliacao
            v-if="ehDono"
            class="py-space-5"
            :avaliacao="minhaAvaliacao"
            :livro="livroAvaliado"
            :rota-do-editor="rotaDoEditor"
          />
          <template v-else-if="avaliado">
            <section
              v-if="livro.notaDoDono"
              class="py-space-5"
            >
              <h3 class="text-title-sm text-tinta">
                {{ `Nota de ${primeiroNome ?? 'quem cadastrou'}` }}
              </h3>
              <EstrelasNota
                class="mt-space-3"
                :valor="livro.notaDoDono.valor"
              />
            </section>
            <section
              v-if="livro.resenhaDoDono"
              class="py-space-5"
            >
              <h3 class="text-title-sm text-tinta">
                {{ `Resenha de ${primeiroNome ?? 'quem cadastrou'}` }}
              </h3>
              <BlocoDeSpoiler
                v-if="livro.resenhaDoDono.spoiler && !spoilerRevelado"
                class="mt-space-3"
                @revelar="revelarSpoiler"
              />
              <p
                v-else
                ref="textoDaResenhaDoDono"
                tabindex="-1"
                lang="pt-BR"
                class="mt-space-3 max-w-[68ch] outline-none whitespace-pre-line font-editorial text-body-lg text-tinta"
              >
                {{ livro.resenhaDoDono.texto }}
              </p>
              <p class="mt-space-3 text-caption text-grafite-suave">
                {{ formatarData(livro.resenhaDoDono.atualizadoEm) }}
              </p>
            </section>
          </template>
          <!-- Sem avaliação do dono, o terceiro não vê nada (§4.6). -->
        </div>
      </div>
    </article>

    <!-- Menu de três pontos no header, só abaixo de 768px e só para o dono (§4 e §5). -->
    <Teleport
      v-if="ehDono"
      to="#cabecalho-acoes"
      defer
    >
      <button
        type="button"
        class="-mr-space-3 flex size-12 items-center justify-center rounded-base text-tinta md:hidden"
        aria-label="Ações do livro"
        @click="menuAberto = true"
      >
        <PhDotsThreeVertical
          :size="24"
          weight="regular"
          aria-hidden="true"
        />
      </button>
    </Teleport>

    <AcoesLeitura
      v-if="painel.livro.value"
      :aberta="painel.aberto.value"
      :livro="painel.livro.value"
      :estado="painel.estado.value"
      @fechar="painel.fechar()"
      @registrar-progresso="abrirRegistro"
      @ver-atualizacoes="verAtualizacoes"
      @atualizado="carregarSituacao()"
    >
      <template #status="{ status }">
        <StatusPill :status="status" />
      </template>
    </AcoesLeitura>

    <RegistrarProgresso
      v-if="registro.contexto.value"
      :aberta="registro.aberto.value"
      :leitura="registro.contexto.value"
      @fechar="registro.fechar()"
      @salvo="aoSalvarProgresso"
    />

    <FolhaAcoes
      :aberta="menuAberto"
      rotulo="Ações do livro"
      :acoes="acoesDoMenu"
      @escolher="escolherNoMenu"
      @fechar="menuAberto = false"
    />

    <DialogoConfirmacao
      :aberta="confirmandoExclusao"
      titulo="Excluir este livro?"
      rotulo-confirmar="Excluir livro"
      :processando="excluindo"
      :erro="erroDaExclusao ?? undefined"
      @confirmar="excluir"
      @cancelar="confirmandoExclusao = false; erroDaExclusao = null"
    >
      {{ livro?.titulo }} sai da sua estante e sua nota e resenha dele são perdidas. Quem viu esse
      livro pelo seu feed deixa de conseguir abri-lo. Não dá para desfazer.
    </DialogoConfirmacao>
  </div>
</template>
