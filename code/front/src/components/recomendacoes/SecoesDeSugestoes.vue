<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'

import BannerAviso from '../ui/BannerAviso.vue'
import AvisoFlutuante from '../ui/AvisoFlutuante.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import ItemSugestao from './ItemSugestao.vue'
import { ApiError } from '../../services/api'
import { socialService, type SecaoDeSugestao, type Sugestao, type Sugestoes } from '../../services/social'

/**
 * Seções `Quem você segue leu` e `Do seu gosto` da aterrissagem do Descobrir (F-REC-ALG,
 * RF-REC-08..12), descobrir.md do Período 3.
 *
 * - **Uma chamada traz as duas seções.** Se ela falha, o banner aparece sem título de seção, porque
 *   nenhuma das duas pôde ser montada (§5.10). As recebidas são outra chamada e não dependem desta.
 * - **Seção vazia some por inteiro** (§5, RF-REC-14): sem título e sem linha de vazio.
 * - **`Mostrar mais`** acrescenta a página seguinte na mesma seção, pelo `proximoOffset` do
 *   servidor. Cada descarte desloca os seguintes uma posição para trás no servidor, por isso o
 *   offset guardado desce um a cada descarte confirmado: sem isso, a página seguinte pularia um livro.
 *   Descarte confirmado enquanto a página seguinte ainda vem desconta também do `proximoOffset` que
 *   ela trouxer, calculado antes dele.
 * - **Descarte** sem confirmação, item a 50% até o servidor responder, toast sem `Desfazer` (§5.6).
 *   O mesmo livro pode estar nas duas seções, e o descarte vale para as duas (RF-REC-12): sai de
 *   todas e o offset de cada uma desce. `404` (livro pessoal, inativo ou que já não existe) também
 *   tira o livro, porque ele não volta. O foco vai para o item que subiu; sem ele, para o título
 *   da seção seguinte ou para o das recebidas (§9).
 */
interface EstadoDaSecao {
  itens: Sugestao[]
  proximoOffset: number | null
  carregandoMais: boolean
  falhouMais: boolean
  /** Descartes confirmados que tiraram um livro desta seção, para corrigir a página em voo. */
  descartados: number
}

const TITULOS: Record<SecaoDeSugestao, string> = { seguidos: 'Quem você segue leu', gosto: 'Do seu gosto' }
const ORDEM: SecaoDeSugestao[] = ['seguidos', 'gosto']

const estado = ref<'carregando' | 'pronta' | 'erro'>('carregando')
const secoes = reactive<Record<SecaoDeSugestao, EstadoDaSecao>>({
  seguidos: { itens: [], proximoOffset: null, carregandoMais: false, falhouMais: false, descartados: 0 },
  gosto: { itens: [], proximoOffset: null, carregandoMais: false, falhouMais: false, descartados: 0 },
})
/** Livros descartados nesta tela: uma página que já vinha a caminho não os traz de volta. */
const descartados = new Set<string>()
const descartando = ref<string[]>([])
const aviso = ref<{ texto: string; falhou?: { secao: SecaoDeSugestao; sugestao: Sugestao } } | null>(null)
const anuncio = ref('')
const raiz = ref<HTMLElement | null>(null)

function preencher(resposta: Sugestoes): void {
  for (const secao of ORDEM) {
    const pagina = resposta[secao]
    secoes[secao].itens = pagina?.itens ?? []
    secoes[secao].proximoOffset = pagina?.proximoOffset ?? null
    secoes[secao].carregandoMais = false
    secoes[secao].falhouMais = false
  }
}

async function carregar(): Promise<void> {
  estado.value = 'carregando'
  try {
    preencher(await socialService.listarSugestoes())
    estado.value = 'pronta'
  } catch {
    estado.value = 'erro'
  }
}

function focarItem(secao: SecaoDeSugestao, livroId: string): void {
  raiz.value?.querySelector<HTMLElement>(`[data-secao="${secao}"] [data-livro="${livroId}"] a`)?.focus()
}

async function mostrarMais(secao: SecaoDeSugestao): Promise<void> {
  const atual = secoes[secao]
  if (atual.proximoOffset === null || atual.carregandoMais) {
    return
  }
  atual.carregandoMais = true
  atual.falhouMais = false
  const descartadosAntes = atual.descartados
  try {
    const pagina = (await socialService.listarSugestoes(secao, atual.proximoOffset))[secao]
    const vistos = new Set(atual.itens.map((item) => item.livro.id))
    const novos = (pagina?.itens ?? []).filter((item) => !vistos.has(item.livro.id) && !descartados.has(item.livro.id))
    atual.itens = [...atual.itens, ...novos]
    const proximo = pagina?.proximoOffset ?? null
    atual.proximoOffset = proximo === null ? null : Math.max(0, proximo - (atual.descartados - descartadosAntes))
    anuncio.value = novos.length === 1 ? '1 sugestão carregada' : `${novos.length} sugestões carregadas`
    await nextTick()
    const alvo = novos[0] ?? atual.itens[atual.itens.length - 1]
    if (alvo) {
      focarItem(secao, alvo.livro.id)
    }
  } catch {
    atual.falhouMais = true
  } finally {
    atual.carregandoMais = false
  }
}

async function descartar(secao: SecaoDeSugestao, sugestao: Sugestao): Promise<void> {
  const livroId = sugestao.livro.id
  if (descartando.value.includes(livroId)) {
    return
  }
  descartando.value = [...descartando.value, livroId]
  try {
    await socialService.descartarSugestao(livroId)
  } catch (erro) {
    if (!(erro instanceof ApiError && erro.status === 404)) {
      aviso.value = {
        texto: 'Não foi possível descartar a sugestão. Verifique sua conexão e tente de novo.',
        falhou: { secao, sugestao },
      }
      return
    }
  } finally {
    descartando.value = descartando.value.filter((outro) => outro !== livroId)
  }
  const atual = secoes[secao]
  const posicao = atual.itens.findIndex((item) => item.livro.id === livroId)
  descartados.add(livroId)
  for (const outra of ORDEM) {
    const daSecao = secoes[outra]
    if (!daSecao.itens.some((item) => item.livro.id === livroId)) {
      continue
    }
    daSecao.itens = daSecao.itens.filter((item) => item.livro.id !== livroId)
    daSecao.descartados += 1
    if (daSecao.proximoOffset !== null) {
      daSecao.proximoOffset = Math.max(0, daSecao.proximoOffset - 1)
    }
  }
  aviso.value = { texto: 'Sugestão descartada.' }
  await nextTick()
  const quemSubiu = atual.itens[Math.min(posicao, atual.itens.length - 1)]
  if (quemSubiu) {
    focarItem(secao, quemSubiu.livro.id)
    return
  }
  const seguinte = ORDEM.slice(ORDEM.indexOf(secao) + 1).find((outra) => secoes[outra].itens.length > 0)
  const titulo = seguinte ? `titulo-sugestoes-${seguinte}` : 'titulo-recomendacoes'
  document.getElementById(titulo)?.focus()
}

function tentarDeNovo(): void {
  const falhou = aviso.value?.falhou
  aviso.value = null
  if (falhou) {
    void descartar(falhou.secao, falhou.sugestao)
  }
}

onMounted(carregar)
</script>

<template>
  <div ref="raiz">
    <p
      class="sr-only"
      role="status"
    >
      {{ anuncio }}
    </p>

    <section
      v-if="estado === 'carregando'"
      class="entrada mt-space-6 md:mt-space-8"
      aria-labelledby="titulo-sugestoes-carregando"
      aria-busy="true"
    >
      <h2
        id="titulo-sugestoes-carregando"
        class="text-title-lg text-tinta"
      >
        {{ TITULOS.seguidos }}
      </h2>
      <ul
        class="mt-space-3 divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0"
        aria-hidden="true"
      >
        <li
          v-for="n in 2"
          :key="n"
          class="flex gap-space-4 py-space-4 md:p-space-4"
          :class="n === 2 ? 'hidden md:flex' : ''"
        >
          <span class="h-[90px] w-[60px] shrink-0 bg-capa-placeholder md:h-[120px] md:w-20" />
          <span class="flex flex-1 flex-col gap-space-2">
            <span class="h-[17px] w-[70%] rounded-sm bg-capa-placeholder" />
            <span class="h-[15px] w-[45%] rounded-sm bg-capa-placeholder" />
            <span class="h-[13px] w-[55%] rounded-sm bg-capa-placeholder" />
          </span>
        </li>
      </ul>
    </section>

    <BannerAviso
      v-else-if="estado === 'erro'"
      variante="erro"
      triangulo
      class="mt-space-6 md:mt-space-8"
    >
      Não foi possível carregar as sugestões. Verifique sua conexão e tente de novo.
      <span class="mt-space-1 flex">
        <BotaoTextual
          class="min-h-12 md:min-h-10"
          @click="carregar()"
        >
          Tentar de novo
        </BotaoTextual>
      </span>
    </BannerAviso>

    <template v-else>
      <template
        v-for="secao in ORDEM"
        :key="secao"
      >
        <section
          v-if="secoes[secao].itens.length > 0"
          class="mt-space-6 md:mt-space-8"
          :data-secao="secao"
          :aria-labelledby="`titulo-sugestoes-${secao}`"
        >
          <h2
            :id="`titulo-sugestoes-${secao}`"
            class="text-title-lg text-tinta"
            tabindex="-1"
          >
            {{ TITULOS[secao] }}
          </h2>
          <ul class="mt-space-3 divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0">
            <li
              v-for="sugestao in secoes[secao].itens"
              :key="sugestao.livro.id"
              :data-livro="sugestao.livro.id"
              class="py-space-4 md:rounded-base md:p-space-4 md:transition-colors md:duration-dur-fast md:hover:bg-papel-elevado"
              :class="descartando.includes(sugestao.livro.id) ? 'pointer-events-none opacity-50' : ''"
            >
              <ItemSugestao
                :sugestao="sugestao"
                @descartar="descartar(secao, sugestao)"
              />
            </li>
          </ul>

          <ul
            v-if="secoes[secao].carregandoMais"
            class="entrada divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0"
            aria-hidden="true"
          >
            <li
              v-for="n in 2"
              :key="n"
              class="flex gap-space-4 py-space-4 md:p-space-4"
            >
              <span class="h-[90px] w-[60px] shrink-0 bg-capa-placeholder md:h-[120px] md:w-20" />
              <span class="flex flex-1 flex-col gap-space-2">
                <span class="h-[17px] w-[70%] rounded-sm bg-capa-placeholder" />
                <span class="h-[15px] w-[45%] rounded-sm bg-capa-placeholder" />
                <span class="h-[13px] w-[55%] rounded-sm bg-capa-placeholder" />
              </span>
            </li>
          </ul>
          <div
            v-else-if="secoes[secao].falhouMais"
            class="mt-space-3"
          >
            <p class="text-body text-grafite">
              Não foi possível carregar mais sugestões.
            </p>
            <BotaoTextual
              class="min-h-12 md:min-h-10"
              @click="mostrarMais(secao)"
            >
              Tentar de novo
            </BotaoTextual>
          </div>
          <BotaoTextual
            v-else-if="secoes[secao].proximoOffset !== null"
            class="mt-space-3 min-h-12 md:min-h-10"
            @click="mostrarMais(secao)"
          >
            Mostrar mais
          </BotaoTextual>
        </section>
      </template>
    </template>

    <AvisoFlutuante
      :aberto="aviso !== null"
      :tom="aviso?.falhou ? 'rubi' : 'musgo'"
      :acao="aviso?.falhou ? 'Tentar de novo' : undefined"
      @acao="tentarDeNovo"
      @fechar="aviso = null"
    >
      {{ aviso?.texto }}
    </AvisoFlutuante>
  </div>
</template>

<style scoped>
.entrada {
  animation: surgir var(--duration-base) var(--easing-out);
}

@keyframes surgir {
  from {
    opacity: 0;
  }
}
</style>
