<script setup lang="ts">
import { PhChatCircle, PhPaperPlaneRight, PhX } from '@phosphor-icons/vue'
import { computed, nextTick, onMounted, ref } from 'vue'

import ComentarioItem from './ComentarioItem.vue'
import { verboDeAtividade } from '../../feed/verbos'
import { contagem, primeiroNome } from '../../perfil/textos'
import { ApiError, mensagemDeErro, novaChaveIdempotencia } from '../../services/api'
import { perfilService } from '../../services/perfil'
import { socialService, type Atividade, type Comentario } from '../../services/social'
import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import BannerAviso from '../ui/BannerAviso.vue'
import CapaLivro from '../livros/CapaLivro.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'

/**
 * Modal de comentários (comentarios.md §4/§5, RF-SOC-12/14): bottom sheet no mobile, dialog de
 * 640px na web, sobre `SobreposicaoModal`. Autocontido: recebe `atividade`/`aberto`, emite
 * `fechar` e `comentario-criado` (a `FeedView` decide o que fazer com a contagem, Task 8 §3).
 */
const props = defineProps<{
  atividade: Atividade
  aberto: boolean
}>()

const emit = defineEmits<{ fechar: []; 'comentario-criado': [] }>()

interface EstadoRaiz {
  comentario: Comentario
  respostas: Comentario[]
  expandida: boolean
  carregandoRespostas: boolean
}

const carregando = ref(true)
const erroAoCarregar = ref(false)
const raizes = ref<EstadoRaiz[]>([])

function criarEstadoRaiz(comentario: Comentario): EstadoRaiz {
  return { comentario, respostas: [], expandida: false, carregandoRespostas: false }
}

async function carregarComentarios(): Promise<void> {
  carregando.value = true
  erroAoCarregar.value = false
  try {
    const pagina = await socialService.listarComentariosRaiz(props.atividade.id, 0)
    raizes.value = pagina.items.map(criarEstadoRaiz)
  } catch {
    erroAoCarregar.value = true
  } finally {
    carregando.value = false
  }
}

async function alternarRespostas(estado: EstadoRaiz): Promise<void> {
  if (estado.expandida) {
    estado.expandida = false
    return
  }
  if (estado.respostas.length === 0) {
    estado.carregandoRespostas = true
    try {
      const resultado = await socialService.listarRespostas(estado.comentario.id)
      estado.respostas = resultado.itens
    } finally {
      estado.carregandoRespostas = false
    }
  }
  estado.expandida = true
}

/** Avatar do leitor logado, para o campo de escrita (perfil.ts, sem novo estado global). */
const avatarDoLeitor = ref<string | null>(null)

onMounted(async () => {
  carregarComentarios()
  try {
    const meuPerfil = await perfilService.obterMeuPerfil()
    avatarDoLeitor.value = meuPerfil.avatarUrl
  } catch {
    // Sem avatar, `AvatarLeitor` cai no ícone padrão: não impede comentar.
  }
})

const verbo = computed(() => verboDeAtividade(props.atividade.tipo))
const contagemDeComentarios = computed(() =>
  props.atividade.totalComentarios === 0 ? 'Nenhum comentário' : contagem(props.atividade.totalComentarios, 'comentário', 'comentários'),
)

interface RespondendoA {
  comentarioId: string
  autorPrimeiroNome: string
}

const respondendoA = ref<RespondendoA | null>(null)
const texto = ref('')
const enviando = ref(false)
const limitado = ref(false)
const erroDeEnvio = ref<string | null>(null)
const campo = ref<HTMLTextAreaElement | null>(null)

const podeEnviar = computed(() => texto.value.trim().length > 0 && !enviando.value && !limitado.value)

async function iniciarResposta(alvo: Comentario): Promise<void> {
  respondendoA.value = { comentarioId: alvo.id, autorPrimeiroNome: primeiroNome(alvo.autor.nomeExibicao) }
  texto.value = `@${alvo.autor.username} `
  await nextTick()
  campo.value?.focus()
  campo.value?.setSelectionRange(texto.value.length, texto.value.length)
}

function cancelarResposta(): void {
  respondendoA.value = null
  texto.value = ''
}

function inserirComentarioLocal(comentario: Comentario): void {
  if (comentario.nivel === 'RAIZ') {
    raizes.value.push(criarEstadoRaiz(comentario))
    return
  }
  const raiz = raizes.value.find((item) => item.comentario.id === comentario.comentarioRaizId)
  if (!raiz) {
    return
  }
  raiz.respostas.push(comentario)
  raiz.expandida = true
  raiz.comentario.totalRespostas = (raiz.comentario.totalRespostas ?? 0) + 1
}

async function enviar(): Promise<void> {
  if (!podeEnviar.value) {
    return
  }
  enviando.value = true
  erroDeEnvio.value = null
  try {
    const criado = await socialService.comentar(
      props.atividade.id,
      { texto: texto.value, comentarioRespondidoId: respondendoA.value?.comentarioId },
      novaChaveIdempotencia(),
    )
    inserirComentarioLocal(criado)
    texto.value = ''
    respondendoA.value = null
    emit('comentario-criado')
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 429) {
      limitado.value = true
    } else {
      erroDeEnvio.value = mensagemDeErro(erro)
    }
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <SobreposicaoModal
    :aberta="aberto"
    rotulo="Comentários"
    largura-dialogo="640px"
    foco-inicial="[data-fechar-comentarios]"
    @fechar="emit('fechar')"
  >
    <div class="flex max-h-[80vh] flex-col md:max-h-[calc(80vh-var(--spacing-space-12))]">
      <header class="flex items-center justify-between gap-space-4 border-b border-linha pb-space-4">
        <div>
          <h2 class="text-title text-tinta">
            Comentários
          </h2>
          <p
            v-if="!carregando"
            class="text-caption text-grafite"
          >
            {{ contagemDeComentarios }}
          </p>
        </div>
        <button
          type="button"
          data-fechar-comentarios
          aria-label="Fechar comentários"
          class="flex size-12 shrink-0 items-center justify-center text-tinta"
          @click="emit('fechar')"
        >
          <PhX
            :size="24"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </header>

      <div class="flex items-center gap-space-3 border-b border-linha bg-papel py-space-3">
        <CapaLivro
          class="h-12 w-8"
          :url="atividade.livro.capaUrl"
          :icone="false"
        />
        <p class="text-caption text-grafite">
          {{ atividade.autor.nomeExibicao }} {{ verbo }}<br>
          {{ atividade.livro.titulo }}, de {{ atividade.livro.autor }}
        </p>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div
          v-if="carregando"
          class="flex flex-col"
        >
          <div
            v-for="indice in 3"
            :key="indice"
            class="flex gap-space-3 py-space-4"
          >
            <div class="size-8 shrink-0 rounded-full bg-capa-placeholder" />
            <div class="flex flex-1 flex-col gap-space-2">
              <div class="h-[15px] w-[35%] rounded-sm bg-capa-placeholder" />
              <div class="h-[15px] w-[90%] rounded-sm bg-capa-placeholder" />
              <div class="h-[15px] w-[60%] rounded-sm bg-capa-placeholder" />
            </div>
          </div>
        </div>

        <BannerAviso
          v-else-if="erroAoCarregar"
          variante="erro"
        >
          Não foi possível carregar os comentários. Verifique sua conexão e tente de novo.
          <button
            type="button"
            class="mt-space-2 block text-body-strong text-musgo hover:underline focus-visible:underline"
            @click="carregarComentarios"
          >
            Tentar de novo
          </button>
        </BannerAviso>

        <div
          v-else-if="raizes.length === 0"
          class="flex flex-col items-center gap-space-5 py-space-16 text-center"
        >
          <PhChatCircle
            :size="32"
            weight="regular"
            class="text-grafite-suave"
            aria-hidden="true"
          />
          <p class="max-w-[260px] text-body text-grafite">
            Seja o primeiro a comentar esta atividade.
          </p>
        </div>

        <template v-else>
          <template
            v-for="raiz in raizes"
            :key="raiz.comentario.id"
          >
            <ComentarioItem
              :comentario="raiz.comentario"
              :mostrar-alternador-de-respostas="(raiz.comentario.totalRespostas ?? 0) > 0"
              :respostas-expandidas="raiz.expandida"
              :carregando-respostas="raiz.carregandoRespostas"
              @responder="iniciarResposta"
              @alternar-respostas="alternarRespostas(raiz)"
            />
            <ComentarioItem
              v-for="resposta in (raiz.expandida ? raiz.respostas : [])"
              :key="resposta.id"
              :comentario="resposta"
              @responder="iniciarResposta"
            />
          </template>
        </template>
      </div>

      <div class="border-t border-linha pt-space-3">
        <p
          v-if="enviando"
          class="px-space-1 pb-space-2 text-caption text-grafite"
        >
          Enviando. O servidor está iniciando e isso pode levar alguns segundos.
        </p>
        <BannerAviso
          v-else-if="limitado"
          variante="alerta"
          class="mb-space-2"
        >
          Muitos comentários seguidos. Espere alguns minutos para comentar de novo.
        </BannerAviso>
        <div
          v-else-if="respondendoA"
          role="status"
          class="mb-space-2 flex items-center justify-between gap-space-3 rounded-base bg-musgo-fundo px-space-3 py-space-3"
        >
          <p class="text-caption text-musgo">
            Respondendo a {{ respondendoA.autorPrimeiroNome }}
          </p>
          <button
            type="button"
            aria-label="Cancelar resposta"
            class="flex size-12 shrink-0 items-center justify-center text-musgo"
            @click="cancelarResposta"
          >
            <PhX
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
          </button>
        </div>
        <BannerAviso
          v-else-if="erroDeEnvio"
          variante="erro"
          class="mb-space-2"
        >
          {{ erroDeEnvio }}
        </BannerAviso>

        <div class="flex items-center gap-space-3">
          <AvatarLeitor
            :url="avatarDoLeitor"
            :tamanho="32"
          />
          <textarea
            ref="campo"
            v-model="texto"
            :disabled="enviando || limitado"
            placeholder="Escreva um comentário"
            rows="1"
            class="field-sizing-content max-h-24 min-h-11 w-full resize-none overflow-y-auto rounded-full border border-linha bg-papel px-space-4 py-space-2 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave focus:border-[1.5px] focus:border-musgo disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            aria-label="Enviar comentário"
            :disabled="!podeEnviar"
            class="flex size-12 shrink-0 items-center justify-center rounded-full"
            :class="podeEnviar ? 'text-musgo hover:text-musgo-vivo' : 'text-grafite-suave'"
            @click="enviar"
          >
            <PhPaperPlaneRight
              :size="24"
              weight="regular"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>
  </SobreposicaoModal>
</template>
