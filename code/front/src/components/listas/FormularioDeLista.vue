<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

import { caracteres, textoDaExclusao, visibilidadeDaLista } from '../../listas/textos'
import { useMinhaPrivacidade } from '../../listas/useMinhaPrivacidade'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { LIMITE_DA_DESCRICAO, LIMITE_DO_TITULO, listasService, type Lista } from '../../services/listas'
import BannerAviso from '../ui/BannerAviso.vue'
import BotaoDestrutivo from '../ui/BotaoDestrutivo.vue'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import FaixaInformativa from '../ui/FaixaInformativa.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'
import CapaDeItem from './CapaDeItem.vue'

/**
 * Criar e editar lista (docs/design/periodo-2/F-LST/criar-lista.md). Um título obrigatório e
 * uma descrição opcional, os dois texto puro; a faixa diz quem vai ver a lista, sem chave de
 * visibilidade (RN-08). Na edição, a zona de exclusão no fim; confirmar a exclusão **troca o
 * conteúdo do mesmo dialog**, e `Cancelar` volta ao formulário com o que foi digitado (§5.5).
 *
 * Com `livro`, é a criação a partir da página do livro: o livro entra na posição 1 na mesma
 * transação (`POST /listas` com `livroId`).
 *
 * Reenviar a mesma intenção (mesmo corpo) repete a `Idempotency-Key` (RNF-ERR-04): se a primeira
 * tiver chegado, não nasce uma segunda lista.
 *
 * Divergência: abaixo de 768px o formulário abre como a folha da `SobreposicaoModal`, e não como
 * tela cheia sobreposta (§1). Registrada na feature.
 */
export interface LivroDeOrigem {
  id: string
  titulo: string
  autor: string | null
  capaUrl: string | null
  pessoal: boolean
}

const props = withDefaults(
  defineProps<{
    aberto: boolean
    /** Sem lista, cria; com ela, edita. */
    lista?: Lista | null
    livro?: LivroDeOrigem | null
  }>(),
  { lista: null, livro: null },
)
const emit = defineEmits<{ fechar: []; criada: [lista: Lista]; salva: [lista: Lista]; excluida: [] }>()

const id = useId()
const privacidade = useMinhaPrivacidade()

const titulo = ref('')
const descricao = ref('')
const tituloTocado = ref(false)
const tentouEnviar = ref(false)
const enviando = ref(false)
const demorando = ref(false)
const erroDoServidor = ref<string | null>(null)
const errosDoServidor = ref<{ titulo?: string; descricao?: string }>({})

const confirmandoExclusao = ref(false)
const excluindo = ref(false)
const erroDaExclusao = ref<string | null>(null)

let chave: { corpo: string; valor: string } | null = null
let chaveDaExclusao: string | null = null
let relogio: ReturnType<typeof setTimeout> | null = null

const edicao = computed(() => props.lista !== null)

watch(
  () => props.aberto,
  (aberto) => {
    if (aberto) {
      titulo.value = props.lista?.titulo ?? ''
      descricao.value = props.lista?.descricao ?? ''
      tituloTocado.value = false
      tentouEnviar.value = false
      erroDoServidor.value = null
      errosDoServidor.value = {}
      confirmandoExclusao.value = false
      erroDaExclusao.value = null
      chave = null
      chaveDaExclusao = null
    }
  },
  { immediate: true },
)

const tamanhoDoTitulo = computed(() => caracteres(titulo.value))
const tamanhoDaDescricao = computed(() => caracteres(descricao.value))
const tituloLimpo = computed(() => titulo.value.trim())
const descricaoLimpa = computed(() => descricao.value.trim() || null)

const erroDoTitulo = computed(() => {
  if (errosDoServidor.value.titulo) {
    return errosDoServidor.value.titulo
  }
  if (tamanhoDoTitulo.value > LIMITE_DO_TITULO) {
    return 'Use até 80 caracteres no título.'
  }
  if ((tituloTocado.value || tentouEnviar.value) && tituloLimpo.value === '') {
    return 'Dê um título para a lista.'
  }
  return null
})
const erroDaDescricao = computed(() =>
  errosDoServidor.value.descricao ??
  (tamanhoDaDescricao.value > LIMITE_DA_DESCRICAO ? 'Use até 300 caracteres na descrição.' : null),
)

const mudou = computed(
  () =>
    !edicao.value ||
    tituloLimpo.value !== props.lista?.titulo ||
    descricaoLimpa.value !== (props.lista?.descricao ?? null),
)
const valido = computed(
  () =>
    tituloLimpo.value !== '' &&
    tamanhoDoTitulo.value <= LIMITE_DO_TITULO &&
    tamanhoDaDescricao.value <= LIMITE_DA_DESCRICAO,
)
const podeEnviar = computed(() => valido.value && mudou.value && !enviando.value)

const rotuloDoEnvio = computed(() => {
  if (edicao.value) {
    return enviando.value ? 'Salvando alterações' : 'Salvar alterações'
  }
  if (enviando.value) {
    return 'Criando lista'
  }
  return props.livro ? 'Criar lista com este livro' : 'Criar lista'
})

function chaveDaIntencao(corpo: unknown): string {
  const serializado = JSON.stringify(corpo)
  if (!chave || chave.corpo !== serializado) {
    chave = { corpo: serializado, valor: novaChaveIdempotencia() }
  }
  return chave.valor
}

function comecarRelogio(): void {
  demorando.value = false
  relogio = setTimeout(() => {
    demorando.value = true
  }, 3000)
}

function pararRelogio(): void {
  if (relogio) {
    clearTimeout(relogio)
    relogio = null
  }
  demorando.value = false
}

onBeforeUnmount(pararRelogio)

async function enviar(): Promise<void> {
  tentouEnviar.value = true
  errosDoServidor.value = {}
  if (!podeEnviar.value) {
    return
  }
  enviando.value = true
  erroDoServidor.value = null
  comecarRelogio()
  try {
    if (props.lista) {
      const corpo: { titulo?: string; descricao?: string | null } = {}
      if (tituloLimpo.value !== props.lista.titulo) {
        corpo.titulo = tituloLimpo.value
      }
      if (descricaoLimpa.value !== props.lista.descricao) {
        corpo.descricao = descricaoLimpa.value
      }
      emit('salva', await listasService.editar(props.lista.id, corpo, chaveDaIntencao(corpo)))
    } else {
      const corpo = {
        titulo: tituloLimpo.value,
        descricao: descricaoLimpa.value,
        ...(props.livro ? { livroId: props.livro.id } : {}),
      }
      emit('criada', await listasService.criar(corpo, chaveDaIntencao(corpo)))
    }
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 400 && erro.campos) {
      errosDoServidor.value = { titulo: erro.campos.titulo, descricao: erro.campos.descricao }
    }
    if (!errosDoServidor.value.titulo && !errosDoServidor.value.descricao) {
      erroDoServidor.value = edicao.value
        ? 'Não foi possível salvar as alterações. Verifique sua conexão e tente de novo.'
        : erro instanceof ApiError && erro.status === 422
          ? 'Este livro não pode entrar numa lista.'
          : 'Não foi possível criar a lista. Verifique sua conexão e tente de novo.'
    }
  } finally {
    enviando.value = false
    pararRelogio()
  }
}

async function excluir(): Promise<void> {
  if (!props.lista) {
    return
  }
  excluindo.value = true
  erroDaExclusao.value = null
  chaveDaExclusao ??= novaChaveIdempotencia()
  try {
    await listasService.excluir(props.lista.id, chaveDaExclusao)
    emit('excluida')
  } catch {
    erroDaExclusao.value = 'Não foi possível excluir a lista. Verifique sua conexão e tente de novo.'
  } finally {
    excluindo.value = false
  }
}

function fechar(): void {
  if (enviando.value || excluindo.value) {
    return
  }
  if (confirmandoExclusao.value) {
    confirmandoExclusao.value = false
    return
  }
  emit('fechar')
}

const CAMPO =
  'w-full rounded-base bg-papel-elevado px-space-4 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave disabled:cursor-not-allowed disabled:text-grafite'
</script>

<template>
  <SobreposicaoModal
    :aberta="aberto"
    :rotulo="confirmandoExclusao ? `Excluir a lista ${lista?.titulo}?` : edicao ? 'Editar lista' : 'Nova lista'"
    :foco-inicial="confirmandoExclusao ? '[data-cancelar-exclusao]' : `#${id}-titulo`"
    @fechar="fechar"
  >
    <Transition
      name="troca"
      mode="out-in"
    >
      <!-- §5.5: a confirmação ocupa o mesmo dialog, sem um segundo empilhado. -->
      <div
        v-if="confirmandoExclusao && lista"
        key="confirmacao"
      >
        <h2 class="text-title-sm text-tinta">
          Excluir a lista {{ lista.titulo }}?
        </h2>
        <p class="mt-space-3 text-body text-grafite">
          {{ textoDaExclusao(lista.quantidadeLivros) }}
        </p>
        <p
          v-if="erroDaExclusao"
          role="alert"
          class="mt-space-4 text-caption text-rubi"
        >
          {{ erroDaExclusao }}
        </p>
        <div class="mt-space-6 flex flex-col-reverse gap-space-3 md:flex-row md:items-center md:justify-end md:gap-space-4">
          <BotaoTextual
            data-cancelar-exclusao
            class="h-12 w-full justify-center md:h-10 md:w-auto"
            tom="grafite"
            :disabled="excluindo"
            @click="confirmandoExclusao = false"
          >
            Cancelar
          </BotaoTextual>
          <BotaoDestrutivo
            class="h-12 w-full md:h-10 md:w-auto"
            :carregando="excluindo"
            @click="excluir"
          >
            {{ excluindo ? 'Excluindo lista' : 'Excluir lista' }}
          </BotaoDestrutivo>
        </div>
      </div>

      <form
        v-else
        key="formulario"
        novalidate
        @submit.prevent="enviar"
      >
        <div class="flex items-center justify-between gap-space-4">
          <h2 class="text-title-lg text-tinta">
            {{ edicao ? 'Editar lista' : 'Nova lista' }}
          </h2>
          <button
            type="button"
            class="-mr-space-2 flex size-10 shrink-0 items-center justify-center rounded-base text-grafite transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
            aria-label="Fechar sem salvar"
            @click="fechar"
          >
            <PhX
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
          </button>
        </div>

        <div class="mt-space-6 flex flex-col gap-space-6">
          <div v-if="livro">
            <p class="text-label text-grafite">
              Este livro entra na lista
            </p>
            <div class="mt-space-2 flex items-start gap-space-4 rounded-md bg-papel-elevado p-space-5">
              <CapaDeItem
                :url="livro.capaUrl"
                :titulo="livro.titulo"
                :pessoal="livro.pessoal"
              />
              <div class="min-w-0">
                <p class="text-title-sm text-tinta">
                  {{ livro.titulo }}
                </p>
                <p
                  v-if="livro.autor"
                  class="mt-space-1 text-body text-grafite"
                >
                  {{ livro.autor }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-space-2">
            <label
              :for="`${id}-titulo`"
              class="text-label text-grafite"
            >Título</label>
            <input
              :id="`${id}-titulo`"
              v-model="titulo"
              type="text"
              autocomplete="off"
              placeholder="Ex.: Para ler nas férias"
              :disabled="enviando"
              :aria-invalid="erroDoTitulo ? 'true' : undefined"
              :aria-describedby="`${id}-titulo-ajuda ${id}-titulo-contador`"
              class="h-12 md:h-11"
              :class="[CAMPO, erroDoTitulo ? 'border-[1.5px] border-rubi' : 'border border-linha focus:border-[1.5px] focus:border-musgo']"
              @blur="tituloTocado = true"
            >
            <div class="flex items-start justify-between gap-space-4 text-caption">
              <p
                :id="`${id}-titulo-ajuda`"
                :class="erroDoTitulo ? 'text-rubi' : 'text-grafite'"
              >
                {{ erroDoTitulo ?? 'É o nome que aparece no seu perfil.' }}
              </p>
              <p
                :id="`${id}-titulo-contador`"
                class="shrink-0 font-mono tabular-nums"
                :class="tamanhoDoTitulo > LIMITE_DO_TITULO ? 'text-rubi' : 'text-grafite'"
              >
                {{ tamanhoDoTitulo }}/{{ LIMITE_DO_TITULO }}
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-space-2">
            <label
              :for="`${id}-descricao`"
              class="text-label text-grafite"
            >Descrição (opcional)</label>
            <textarea
              :id="`${id}-descricao`"
              v-model="descricao"
              placeholder="O que junta estes livros?"
              :disabled="enviando"
              :aria-invalid="erroDaDescricao ? 'true' : undefined"
              :aria-describedby="`${id}-descricao-ajuda ${id}-descricao-contador`"
              class="field-sizing-content max-h-[200px] min-h-[120px] resize-none py-space-3"
              :class="[CAMPO, erroDaDescricao ? 'border-[1.5px] border-rubi' : 'border border-linha focus:border-[1.5px] focus:border-musgo']"
            />
            <div class="flex items-start justify-between gap-space-4 text-caption">
              <p
                :id="`${id}-descricao-ajuda`"
                :class="erroDaDescricao ? 'text-rubi' : 'text-grafite'"
              >
                {{ erroDaDescricao ?? 'Aparece abaixo do título, na página da lista.' }}
              </p>
              <p
                :id="`${id}-descricao-contador`"
                class="shrink-0 font-mono tabular-nums"
                :class="tamanhoDaDescricao > LIMITE_DA_DESCRICAO ? 'text-rubi' : 'text-grafite'"
              >
                {{ tamanhoDaDescricao }}/{{ LIMITE_DA_DESCRICAO }}
              </p>
            </div>
          </div>

          <FaixaInformativa v-if="privacidade">
            {{ visibilidadeDaLista(privacidade) }}
          </FaixaInformativa>

          <BannerAviso
            v-if="erroDoServidor"
            variante="erro"
            triangulo
          >
            {{ erroDoServidor }}
          </BannerAviso>
        </div>

        <div class="mt-space-6 flex flex-col-reverse gap-space-3 md:flex-row md:items-center md:justify-end">
          <BotaoTextual
            class="h-12 w-full justify-center md:h-10 md:w-auto"
            tom="grafite"
            :disabled="enviando"
            @click="fechar"
          >
            Cancelar
          </BotaoTextual>
          <BotaoPrimario
            tipo="submit"
            class="w-full md:w-auto"
            :carregando="enviando"
            :disabled="!enviando && !(valido && mudou)"
            aparencia-desabilitada="neutra"
          >
            {{ rotuloDoEnvio }}
          </BotaoPrimario>
        </div>
        <p
          v-if="demorando"
          class="mt-space-2 text-center text-caption text-grafite"
          role="status"
        >
          O serviço está iniciando. Isso pode levar alguns segundos.
        </p>

        <div
          v-if="edicao"
          class="mt-space-6 border-t border-linha pt-space-5"
        >
          <p class="text-caption text-grafite">
            Excluir esta lista
          </p>
          <BotaoDestrutivo
            class="mt-space-3 h-12 w-full md:h-10 md:w-auto"
            :disabled="enviando"
            @click="confirmandoExclusao = true"
          >
            Excluir lista
          </BotaoDestrutivo>
        </div>
      </form>
    </Transition>
  </SobreposicaoModal>
</template>

<style scoped>
/* Crossfade de `dur-base` entre formulário e confirmação (§5.5); estático sob `reduce`. */
.troca-enter-active,
.troca-leave-active {
  transition: opacity var(--duration-base) var(--easing-out);
}

.troca-enter-from,
.troca-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .troca-enter-active,
  .troca-leave-active {
    transition: none;
  }
}
</style>
