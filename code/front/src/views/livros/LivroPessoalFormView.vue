<script setup lang="ts">
import { PhBookOpen } from '@phosphor-icons/vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AreaUploadCapa, { type EstadoDaCapa } from '../../components/livros/AreaUploadCapa.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoDestrutivo from '../../components/ui/BotaoDestrutivo.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import CampoAreaTexto from '../../components/ui/CampoAreaTexto.vue'
import CampoTexto from '../../components/ui/CampoTexto.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import { acervoService, type DadosLivroPessoal } from '../../services/acervo'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { enviarCapa, validarCapa } from '../../services/capa'

/**
 * Cadastro e edição de livro pessoal (RF-ACV-08, RF-ACV-09). Estrutura e copy de
 * docs/design/periodo-1/F-ACV-CADASTRO/cadastro-pessoal.md §4, §5 e §8. Na web, duas colunas
 * (capa à esquerda, campos à direita) dentro de 880px; abaixo de 768px, uma coluna com a capa no
 * topo e o dialog de exclusão vira bottom sheet.
 *
 * **Não existe campo de ISBN**, nem de editora, série ou assunto (RN-02, RN-03; RF-ACV-22 é do
 * Período 3). A capa sobe direto ao Cloudinary depois de validada pelos bytes, e o upload nunca
 * trava os campos de texto nem apaga o que foi digitado.
 */
const LIMITE_DA_SINOPSE = 4000
const AVISO_DA_SINOPSE = 3800

type Campo = 'titulo' | 'autor' | 'paginas' | 'sinopse'
const OBRIGATORIOS: Record<Exclude<Campo, 'sinopse'>, string> = {
  titulo: 'Informe o título do livro.',
  autor: 'Informe quem escreveu.',
  paginas: 'Informe quantas páginas o livro tem.',
}

const route = useRoute()
const router = useRouter()

const livroId = computed(() => (route.name === 'livro-pessoal-editar' ? String(route.params.id) : null))
const edicao = computed(() => livroId.value !== null)
const origem = computed(() => String(route.params.origem ?? 'estante'))

const campos = reactive<Record<Campo, string>>({ titulo: '', autor: '', paginas: '', sinopse: '' })
const erros = reactive<Partial<Record<Campo, string>>>({})
const tocados = new Set<Campo>()

const carregando = ref(false)
const indisponivel = ref(false)
const tituloOriginal = ref('')

const estadoDaCapa = ref<EstadoDaCapa>('vazia')
const imagemDaCapa = ref<string | null>(null)
const capaUrl = ref<string | null>(null)
const progressoDaCapa = ref(0)
const erroDaCapa = ref<string | null>(null)
let envioAtual = 0
let previaLocal: string | null = null

const banner = ref<string | null>(null)
const salvando = ref(false)
const coldStart = ref(false)
let coldStartTimer: ReturnType<typeof setTimeout> | undefined

const confirmandoExclusao = ref(false)
const excluindo = ref(false)
const erroDaExclusao = ref<string | null>(null)

// A chave acompanha a intenção: reenviar o mesmo formulário depois de uma falha reaproveita a
// chave e o servidor devolve a resposta original; mudar o conteúdo gera outra (RNF-ERR-04).
let chave: string | null = null
let conteudoDaChave: string | null = null

const paginasValidas = computed(() => {
  const texto = campos.paginas.trim()
  const valor = Number(texto)
  return /^[0-9]+$/.test(texto) && valor > 0 ? valor : null
})

const podeSalvar = computed(
  () =>
    campos.titulo.trim() !== '' &&
    campos.autor.trim() !== '' &&
    campos.paginas.trim() !== '' &&
    campos.sinopse.length <= LIMITE_DA_SINOPSE &&
    estadoDaCapa.value !== 'enviando' &&
    !salvando.value &&
    !excluindo.value,
)

// Campo obrigatório que a pessoa esvaziou: o erro aparece no campo, sem banner (§4.5).
for (const campo of Object.keys(campos) as Campo[]) {
  watch(
    () => campos[campo],
    (valor) => {
      banner.value = null
      if (valor.trim() !== '') {
        tocados.add(campo)
        delete erros[campo]
      } else if (tocados.has(campo) && campo !== 'sinopse') {
        erros[campo] = OBRIGATORIOS[campo]
      }
    },
  )
}

onMounted(() => {
  if (livroId.value) {
    void carregar(livroId.value)
  }
})

onBeforeUnmount(() => {
  clearTimeout(coldStartTimer)
  envioAtual++
  liberarPrevia()
})

async function carregar(id: string): Promise<void> {
  carregando.value = true
  try {
    const livro = await acervoService.obterLivroPessoal(id)
    if (livro.modoConsulta) {
      // Só o dono edita (RN-03); o servidor recusa a escrita de qualquer forma.
      indisponivel.value = true
      return
    }
    campos.titulo = livro.titulo
    campos.autor = livro.autor
    campos.paginas = String(livro.paginas)
    campos.sinopse = livro.sinopse ?? ''
    capaUrl.value = livro.capaUrl
    imagemDaCapa.value = livro.capaUrl
    estadoDaCapa.value = livro.capaUrl ? 'preenchida' : 'vazia'
    tituloOriginal.value = livro.titulo
    await nextTick()
    for (const campo of Object.keys(erros) as Campo[]) {
      delete erros[campo]
    }
    banner.value = null
  } catch (erro) {
    if (erro instanceof ApiError && (erro.status === 403 || erro.status === 404)) {
      indisponivel.value = true
    } else {
      banner.value = erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
    }
  } finally {
    carregando.value = false
  }
}

function liberarPrevia(): void {
  if (previaLocal) {
    URL.revokeObjectURL(previaLocal)
    previaLocal = null
  }
}

async function escolherCapa(arquivo: File): Promise<void> {
  const meu = ++envioAtual
  const recusa = await validarCapa(arquivo)
  if (meu !== envioAtual) {
    return
  }
  if (recusa) {
    liberarPrevia()
    capaUrl.value = null
    imagemDaCapa.value = null
    erroDaCapa.value = recusa
    estadoDaCapa.value = 'erro'
    return
  }

  liberarPrevia()
  previaLocal = URL.createObjectURL(arquivo)
  imagemDaCapa.value = previaLocal
  capaUrl.value = null
  erroDaCapa.value = null
  progressoDaCapa.value = 0
  estadoDaCapa.value = 'enviando'
  try {
    const url = await enviarCapa(arquivo, (fracao) => {
      if (meu === envioAtual) {
        progressoDaCapa.value = fracao
      }
    })
    if (meu !== envioAtual) {
      return
    }
    capaUrl.value = url
    estadoDaCapa.value = 'preenchida'
  } catch {
    if (meu !== envioAtual) {
      return
    }
    liberarPrevia()
    imagemDaCapa.value = null
    erroDaCapa.value = 'Não foi possível enviar a capa. Tente de novo.'
    estadoDaCapa.value = 'erro'
  }
}

function removerCapa(): void {
  envioAtual++
  liberarPrevia()
  capaUrl.value = null
  imagemDaCapa.value = null
  erroDaCapa.value = null
  estadoDaCapa.value = 'vazia'
}

function validar(): Campo | null {
  let primeiro: Campo | null = null
  for (const campo of ['titulo', 'autor', 'paginas'] as const) {
    tocados.add(campo)
    const vazio = campos[campo].trim() === ''
    if (vazio || (campo === 'paginas' && paginasValidas.value === null)) {
      erros[campo] = OBRIGATORIOS[campo]
      primeiro ??= campo
    }
  }
  return primeiro
}

async function salvar(): Promise<void> {
  const invalido = validar()
  if (invalido) {
    // O foco vai para o primeiro campo inválido (§4.5).
    await nextTick()
    document.getElementById(`campo-${invalido}`)?.focus()
    return
  }
  if (!podeSalvar.value) {
    return
  }

  const dados: DadosLivroPessoal = {
    titulo: campos.titulo.trim(),
    autor: campos.autor.trim(),
    paginas: paginasValidas.value!,
    sinopse: campos.sinopse.trim() === '' ? null : campos.sinopse.trim(),
    capaUrl: capaUrl.value,
  }
  const conteudo = JSON.stringify(dados)
  if (conteudo !== conteudoDaChave) {
    chave = novaChaveIdempotencia()
    conteudoDaChave = conteudo
  }

  banner.value = null
  salvando.value = true
  coldStart.value = false
  coldStartTimer = setTimeout(() => {
    coldStart.value = true
  }, 3_000)

  try {
    const livro = livroId.value
      ? await acervoService.atualizarLivroPessoal(livroId.value, dados, chave!)
      : await acervoService.criarLivroPessoal(dados, chave!)
    if (livroId.value && window.history.state?.back) {
      router.back()
    } else {
      // `replace`: voltar da página do livro recém-criado leva de onde o cadastro foi aberto.
      await router.replace({ name: 'livro-pessoal', params: { id: livro.id } })
    }
  } catch (erro) {
    tratarErroDeEnvio(erro)
  } finally {
    clearTimeout(coldStartTimer)
    coldStart.value = false
    salvando.value = false
  }
}

function tratarErroDeEnvio(erro: unknown): void {
  if (!(erro instanceof ApiError)) {
    banner.value = 'Não foi possível acessar o servidor. Tente novamente.'
    return
  }
  const porCampo = erro.campos ?? {}
  let algumCampo = false
  for (const [campo, mensagem] of Object.entries(porCampo)) {
    if (campo === 'capaUrl') {
      removerCapa()
      erroDaCapa.value = mensagem
      estadoDaCapa.value = 'erro'
      algumCampo = true
    } else if (campo in campos) {
      erros[campo as Campo] = mensagem
      algumCampo = true
    }
  }
  if (!algumCampo) {
    banner.value = erro.message
  }
}

function cancelar(): void {
  if (window.history.state?.back) {
    router.back()
  } else {
    void router.push(livroId.value ? { name: 'livro-pessoal', params: { id: livroId.value } } : `/${origem.value}`)
  }
}

async function excluir(): Promise<void> {
  if (!livroId.value) {
    return
  }
  excluindo.value = true
  erroDaExclusao.value = null
  try {
    // Chave nova por confirmação: a exclusão não tem corpo para comparar, e o servidor responde
    // igual ao reenvio de uma exclusão já feita.
    await acervoService.excluirLivroPessoal(livroId.value, novaChaveIdempotencia())
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
  <div class="mx-auto w-full max-w-[880px] pb-space-12 pt-space-6">
    <div
      v-if="carregando"
      class="grid gap-space-6 md:grid-cols-[240px_1fr] md:gap-space-8"
      aria-busy="true"
      aria-label="Carregando livro"
    >
      <div class="h-[160px] w-[120px] rounded-base bg-linha md:h-[267px] md:w-[200px]" />
      <div class="flex flex-col gap-space-5">
        <div class="h-11 rounded-base bg-linha" />
        <div class="h-11 rounded-base bg-linha" />
        <div class="h-11 w-[180px] rounded-base bg-linha" />
        <div class="h-[120px] rounded-base bg-linha" />
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
    </EstadoVazio>

    <template v-else>
      <BannerAviso
        v-if="banner"
        variante="erro"
        class="mb-space-6"
      >
        {{ banner }}
      </BannerAviso>

      <form
        novalidate
        class="grid gap-space-6 md:grid-cols-[240px_1fr] md:gap-space-8"
        @submit.prevent="salvar"
      >
        <AreaUploadCapa
          :estado="estadoDaCapa"
          :imagem="imagemDaCapa"
          :progresso="progressoDaCapa"
          :erro="erroDaCapa"
          :desabilitada="salvando"
          @escolher="escolherCapa"
          @remover="removerCapa"
        />

        <div class="flex min-w-0 flex-col">
          <fieldset
            :disabled="salvando"
            class="m-0 flex min-w-0 flex-col gap-space-5 border-0 p-0"
          >
            <CampoTexto
              id="campo-titulo"
              v-model="campos.titulo"
              label="Título"
              placeholder="Cartas de um sertanejo"
              required
              :erro="erros.titulo"
            />
            <CampoTexto
              id="campo-autor"
              v-model="campos.autor"
              label="Autor"
              placeholder="Marina Albuquerque"
              required
              :erro="erros.autor"
            />
            <CampoTexto
              id="campo-paginas"
              v-model="campos.paginas"
              largura-do-campo="w-[160px] md:w-[180px]"
              label="Número de páginas"
              inputmode="numeric"
              required
              :helper="erros.paginas ? undefined : 'Usamos as páginas para calcular seu progresso de leitura.'"
              :erro="erros.paginas"
            />
            <CampoAreaTexto
              id="campo-sinopse"
              v-model="campos.sinopse"
              label="Sinopse"
              helper="Opcional."
              :erro="erros.sinopse"
              :limite="LIMITE_DA_SINOPSE"
              :aviso="AVISO_DA_SINOPSE"
            />
          </fieldset>

          <div class="mt-space-8 flex flex-col items-center gap-space-3 md:flex-row md:gap-space-4">
            <BotaoPrimario
              tipo="submit"
              class="md:w-auto md:px-space-8"
              aparencia-desabilitada="neutra"
              :disabled="!podeSalvar"
              :carregando="salvando"
            >
              {{ salvando ? 'Salvando' : edicao ? 'Salvar alterações' : 'Salvar livro' }}
            </BotaoPrimario>
            <BotaoTextual
              class="min-h-12 md:min-h-10"
              tom="grafite"
              :disabled="salvando"
              @click="cancelar"
            >
              Cancelar
            </BotaoTextual>
          </div>
          <p
            v-if="coldStart"
            class="mt-space-3 text-caption text-grafite"
            role="status"
          >
            O serviço está iniciando. Isso pode levar alguns segundos.
          </p>

          <section
            v-if="edicao"
            class="mt-space-8 border-t border-linha pt-space-5"
          >
            <h2 class="text-caption text-grafite">
              Excluir este livro
            </h2>
            <BotaoDestrutivo
              class="mt-space-3 h-12 w-full md:h-10 md:w-auto"
              :disabled="salvando"
              @click="confirmandoExclusao = true"
            >
              Excluir livro
            </BotaoDestrutivo>
          </section>
        </div>
      </form>
    </template>

    <DialogoConfirmacao
      :aberta="confirmandoExclusao"
      titulo="Excluir este livro?"
      rotulo-confirmar="Excluir livro"
      :processando="excluindo"
      :erro="erroDaExclusao ?? undefined"
      @confirmar="excluir"
      @cancelar="confirmandoExclusao = false; erroDaExclusao = null"
    >
      {{ tituloOriginal }} sai da sua estante e sua nota e resenha dele são perdidas. Quem viu esse
      livro pelo seu feed deixa de conseguir abri-lo. Não dá para desfazer.
    </DialogoConfirmacao>
  </div>
</template>
