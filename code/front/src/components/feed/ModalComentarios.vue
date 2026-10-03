<script setup lang="ts">
import { PhChatCircle, PhPaperPlaneRight, PhPencilSimple, PhX } from '@phosphor-icons/vue'
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
import DialogoConfirmacao from '../ui/DialogoConfirmacao.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'

const props = defineProps<{
  atividade: Atividade
  aberto: boolean
}>()

const emit = defineEmits<{ fechar: []; 'comentario-criado': []; 'comentarios-excluidos': [quantidade: number] }>()

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

const avatarDoLeitor = ref<string | null>(null)

onMounted(async () => {
  carregarComentarios()
  try {
    const meuPerfil = await perfilService.obterMeuPerfil()
    avatarDoLeitor.value = meuPerfil.avatarUrl
  } catch {
    avatarDoLeitor.value = null
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

const editando = ref<Comentario | null>(null)
const salvando = ref(false)
const mencoesLimitadas = ref(false)
const comentarioSumiu = ref(false)
const erroDeEdicao = ref<string | null>(null)

const podeSalvar = computed(
  () =>
    editando.value !== null &&
    texto.value.trim().length > 0 &&
    texto.value !== editando.value.texto &&
    !salvando.value &&
    !mencoesLimitadas.value &&
    !comentarioSumiu.value,
)

async function focarCampoNoFim(): Promise<void> {
  await nextTick()
  campo.value?.focus()
  campo.value?.setSelectionRange(texto.value.length, texto.value.length)
}

async function iniciarEdicao(alvo: Comentario): Promise<void> {
  respondendoA.value = null
  erroDeEnvio.value = null
  editando.value = alvo
  texto.value = alvo.texto
  await focarCampoNoFim()
}

function cancelarEdicao(): void {
  editando.value = null
  texto.value = ''
  mencoesLimitadas.value = false
  comentarioSumiu.value = false
  erroDeEdicao.value = null
}

function substituirComentarioLocal(editado: Comentario): void {
  for (const raiz of raizes.value) {
    if (raiz.comentario.id === editado.id) {
      raiz.comentario = { ...editado, totalRespostas: raiz.comentario.totalRespostas }
      return
    }
    const indice = raiz.respostas.findIndex((resposta) => resposta.id === editado.id)
    if (indice >= 0) {
      raiz.respostas[indice] = editado
      return
    }
  }
}

function removerComentarioLocal(alvo: Comentario): number {
  const indiceRaiz = raizes.value.findIndex((raiz) => raiz.comentario.id === alvo.id)
  if (indiceRaiz >= 0) {
    const [removida] = raizes.value.splice(indiceRaiz, 1)
    return 1 + (removida!.comentario.totalRespostas ?? 0)
  }
  const raiz = raizes.value.find((item) => item.comentario.id === alvo.comentarioRaizId)
  if (raiz) {
    raiz.respostas = raiz.respostas.filter((resposta) => resposta.id !== alvo.id)
    raiz.comentario.totalRespostas = Math.max(0, (raiz.comentario.totalRespostas ?? 1) - 1)
  }
  return 1
}

async function salvarEdicao(): Promise<void> {
  if (!podeSalvar.value || !editando.value) {
    return
  }
  salvando.value = true
  erroDeEdicao.value = null
  try {
    const editado = await socialService.editarComentario(editando.value.id, texto.value, novaChaveIdempotencia())
    substituirComentarioLocal(editado)
    cancelarEdicao()
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 429) {
      mencoesLimitadas.value = true
    } else if (erro instanceof ApiError && erro.status === 404) {
      comentarioSumiu.value = true
    } else {
      erroDeEdicao.value = 'Não foi possível salvar a edição. O texto continua no campo. Tente de novo.'
    }
  } finally {
    salvando.value = false
  }
}

function fecharEdicaoDeComentarioSumido(): void {
  if (editando.value) {
    removerComentarioLocal(editando.value)
  }
  cancelarEdicao()
}

function aoTeclarNoCampo(evento: KeyboardEvent): void {
  if (!editando.value) {
    return
  }
  if (evento.key === 'Escape') {
    evento.stopPropagation()
    cancelarEdicao()
  } else if (evento.key === 'Enter' && evento.ctrlKey) {
    evento.preventDefault()
    salvarEdicao()
  }
}

const confirmandoExclusao = ref<Comentario | null>(null)
const excluindo = ref(false)
const erroDeExclusao = ref<string | null>(null)

const tituloDaExclusao = computed(() =>
  confirmandoExclusao.value?.nivel === 'RESPOSTA' ? 'Excluir resposta?' : 'Excluir comentário?',
)

const consequenciaDaExclusao = computed(() => {
  const alvo = confirmandoExclusao.value
  if (!alvo) {
    return ''
  }
  if (alvo.nivel === 'RESPOSTA') {
    return 'Sua resposta será apagada. Não dá para desfazer.'
  }
  const raiz = raizes.value.find((item) => item.comentario.id === alvo.id)
  const respostas = alvo.totalRespostas ?? 0
  if (respostas === 0) {
    return 'Seu comentário será apagado. Não dá para desfazer.'
  }
  if (respostas === 1) {
    const autorDaResposta = raiz?.respostas[0]?.autor.nomeExibicao
    return autorDaResposta
      ? `Seu comentário e a resposta de ${autorDaResposta} serão apagados. Não dá para desfazer.`
      : 'Seu comentário e a resposta a ele serão apagados. Não dá para desfazer.'
  }
  return `Seu comentário e as ${respostas} respostas a ele serão apagados. Não dá para desfazer.`
})

function pedirExclusao(alvo: Comentario): void {
  erroDeExclusao.value = null
  confirmandoExclusao.value = alvo
}

function cancelarExclusao(): void {
  confirmandoExclusao.value = null
  erroDeExclusao.value = null
}

async function excluir(): Promise<void> {
  const alvo = confirmandoExclusao.value
  if (!alvo) {
    return
  }
  excluindo.value = true
  erroDeExclusao.value = null
  try {
    await socialService.excluirComentario(alvo.id, novaChaveIdempotencia())
    emit('comentarios-excluidos', removerComentarioLocal(alvo))
    confirmandoExclusao.value = null
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 404) {
      emit('comentarios-excluidos', removerComentarioLocal(alvo))
      confirmandoExclusao.value = null
    } else {
      erroDeExclusao.value = 'Não foi possível excluir o comentário. Ele continua publicado. Tente de novo.'
    }
  } finally {
    excluindo.value = false
  }
}

async function iniciarResposta(alvo: Comentario): Promise<void> {
  respondendoA.value = { comentarioId: alvo.id, autorPrimeiroNome: primeiroNome(alvo.autor.nomeExibicao) }
  texto.value = `@${alvo.autor.username} `
  await focarCampoNoFim()
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
      <header class="-mx-space-6 flex items-center justify-between gap-space-4 border-b border-linha px-space-6 pb-space-4">
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
          class="flex size-12 shrink-0 cursor-pointer items-center justify-center text-tinta"
          @click="emit('fechar')"
        >
          <PhX
            :size="24"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </header>

      <div class="-mx-space-6 flex items-center gap-space-3 border-b border-linha bg-papel-elevado px-space-6 py-space-3 dark:bg-papel">
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
            class="mt-space-2 block cursor-pointer text-body-strong text-musgo hover:underline focus-visible:underline"
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
              :em-edicao="editando?.id === raiz.comentario.id"
              :acoes-desabilitadas="editando !== null"
              @responder="iniciarResposta"
              @alternar-respostas="alternarRespostas(raiz)"
              @editar="iniciarEdicao"
              @excluir="pedirExclusao"
            />
            <ComentarioItem
              v-for="resposta in (raiz.expandida ? raiz.respostas : [])"
              :key="resposta.id"
              :comentario="resposta"
              :em-edicao="editando?.id === resposta.id"
              :acoes-desabilitadas="editando !== null"
              @responder="iniciarResposta"
              @editar="iniciarEdicao"
              @excluir="pedirExclusao"
            />
          </template>
        </template>
      </div>

      <div class="-mx-space-6 border-t border-linha px-space-6 pt-space-3">
        <template v-if="editando">
          <BannerAviso
            v-if="comentarioSumiu"
            variante="erro"
            class="mb-space-2"
          >
            Este comentário não existe mais. Ele pode ter sido excluído em outro aparelho.
            <button
              type="button"
              class="mt-space-2 block cursor-pointer text-body-strong text-musgo hover:underline focus-visible:underline"
              @click="fecharEdicaoDeComentarioSumido"
            >
              Fechar edição
            </button>
          </BannerAviso>
          <BannerAviso
            v-else-if="mencoesLimitadas"
            variante="alerta"
            class="mb-space-2"
          >
            Muitas menções seguidas. Espere alguns minutos para salvar de novo.
          </BannerAviso>
          <BannerAviso
            v-else-if="erroDeEdicao"
            variante="erro"
            class="mb-space-2"
          >
            {{ erroDeEdicao }}
          </BannerAviso>
          <p
            v-if="salvando"
            class="px-space-1 pb-space-2 text-caption text-grafite"
          >
            Salvando. O servidor está iniciando e isso pode levar alguns segundos.
          </p>
          <div
            v-else
            role="status"
            class="mb-space-2 flex items-center justify-between gap-space-3 rounded-base bg-musgo-fundo px-space-3 py-space-3"
          >
            <p class="flex items-center gap-space-2 text-caption text-musgo">
              <PhPencilSimple
                :size="16"
                weight="regular"
                aria-hidden="true"
              />
              Editando comentário
            </p>
            <button
              type="button"
              aria-label="Cancelar edição"
              class="flex size-12 shrink-0 cursor-pointer items-center justify-center text-musgo"
              @click="cancelarEdicao"
            >
              <PhX
                :size="20"
                weight="regular"
                aria-hidden="true"
              />
            </button>
          </div>
        </template>
        <p
          v-else-if="enviando"
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
            class="flex size-12 shrink-0 cursor-pointer items-center justify-center text-musgo"
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
            :disabled="editando ? salvando || mencoesLimitadas || comentarioSumiu : enviando || limitado"
            placeholder="Escreva um comentário"
            rows="1"
            class="field-sizing-content max-h-24 min-h-11 w-full resize-none overflow-y-auto rounded-full border border-linha bg-papel px-space-4 py-space-2 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave focus:border-[1.5px] focus:border-musgo disabled:cursor-not-allowed disabled:opacity-60"
            @keydown="aoTeclarNoCampo"
          />
          <button
            v-if="editando"
            type="button"
            :disabled="!podeSalvar"
            class="flex h-12 shrink-0 cursor-pointer items-center px-space-2 text-body-strong disabled:cursor-not-allowed"
            :class="podeSalvar ? 'text-musgo hover:text-musgo-vivo' : 'text-grafite-suave'"
            @click="salvarEdicao"
          >
            {{ salvando ? 'Salvando' : 'Salvar' }}
          </button>
          <button
            v-else
            type="button"
            aria-label="Enviar comentário"
            :disabled="!podeEnviar"
            class="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed"
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
    <DialogoConfirmacao
      :aberta="confirmandoExclusao !== null"
      :titulo="tituloDaExclusao"
      :rotulo-confirmar="confirmandoExclusao?.nivel === 'RESPOSTA' ? 'Excluir resposta' : 'Excluir comentário'"
      :processando="excluindo"
      :erro="erroDeExclusao ?? undefined"
      @confirmar="excluir"
      @cancelar="cancelarExclusao"
    >
      {{ consequenciaDaExclusao }}
    </DialogoConfirmacao>
  </SobreposicaoModal>
</template>
