<script setup lang="ts">
import { PhBooks, PhCaretRight, PhCheck, PhClock, PhLock, PhUserCircle, PhUserPlus } from '@phosphor-icons/vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import CardEstante from '../../components/estante/CardEstante.vue'
import EsqueletoEstante from '../../components/estante/EsqueletoEstante.vue'
import AvatarLeitor from '../../components/perfil/AvatarLeitor.vue'
import ChipPrivacidade from '../../components/perfil/ChipPrivacidade.vue'
import FimDaLista from '../../components/perfil/FimDaLista.vue'
import SecoesDeLeitura from '../../components/perfil/SecoesDeLeitura.vue'
import ListasDoPerfil from '../../components/listas/ListasDoPerfil.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import { TEXTOS_DA_ESTANTE_DE_PERFIL, textoEstanteDePerfilVazia } from '../../estante/textos'
import { useEstante } from '../../estante/useEstante'
import { contagem, primeiroNome } from '../../perfil/textos'
import { ApiError, novaChaveIdempotencia } from '../../services/api'
import { leituraService } from '../../services/leitura'
import { perfilService, type Perfil } from '../../services/perfil'

/**
 * Perfil de outro leitor (RF-SOC-02, RF-SOC-05..07, RN-08), a partir de
 * docs/design/periodo-1/F-PERFIL/perfil-de-outro-leitor.md. Nome, avatar, biografia e
 * contadores são públicos; o botão de relação muda com a privacidade e com `relacao`. Quem decide
 * o que é restrito é o servidor (`conteudoRestrito`), e os serviços donos revalidam (RNF-SEC-03).
 *
 * - **Estante (F-EST) e Resenhas (F-AVA)** vêm do `leitura` quando o conteúdo é visível. Com
 *   `conteudoRestrito` (RN-08), as seções não aparecem, e sim o bloco "Este perfil é privado".
 * - Os contadores não são acionáveis: não há lista do grafo de terceiros (RNF-SEC-19/44).
 * - Username do próprio leitor abre o próprio perfil.
 */
const route = useRoute()
const router = useRouter()

const perfil = ref<Perfil | null>(null)
const carregando = ref(true)
const naoEncontrado = ref(false)
const falhou = ref(false)

const agindo = ref(false)
const erroDaAcao = ref<string | null>(null)
const confirmando = ref(false)
const erroDaConfirmacao = ref<string | null>(null)

const username = computed(() => String(route.params.username ?? ''))
const nome = computed(() => (perfil.value ? primeiroNome(perfil.value.displayName) : ''))
const privado = computed(() => perfil.value?.privacidade === 'privado')

async function carregar(): Promise<void> {
  carregando.value = true
  naoEncontrado.value = false
  falhou.value = false
  erroDaAcao.value = null
  try {
    const encontrado = await perfilService.obterPerfil(username.value)
    if (encontrado.relacao === 'proprio') {
      await router.replace('/perfil')
      return
    }
    perfil.value = encontrado
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 404) {
      naoEncontrado.value = true
    } else {
      falhou.value = true
    }
  } finally {
    carregando.value = false
  }
}

watch(username, () => void carregar(), { immediate: true })

const estante = useEstante((filtro) => leituraService.listarEstantePerfil(perfil.value?.id ?? '', filtro))

const estanteVisivel = computed(() => (perfil.value && !perfil.value.conteudoRestrito ? perfil.value.id : null))
watch(estanteVisivel, (id) => {
  if (id) {
    void estante.carregar()
  }
})

const restrito = computed(() => Boolean(perfil.value?.conteudoRestrito) || estante.restrita.value)

/** Seguir perfil público é imediato; em privado vira pedido (RF-SOC-05/06). Sem modal. */
async function seguir(): Promise<void> {
  const atual = perfil.value
  if (!atual || agindo.value) {
    return
  }
  agindo.value = true
  erroDaAcao.value = null
  try {
    const resultado = await perfilService.seguir(atual.username, novaChaveIdempotencia())
    if (resultado.estado === 'seguindo') {
      perfil.value = {
        ...atual,
        relacao: 'seguindo',
        conteudoRestrito: false,
        contadores: { ...atual.contadores, seguidores: atual.contadores.seguidores + 1 },
      }
    } else {
      perfil.value = { ...atual, relacao: 'solicitacao_enviada' }
    }
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 409) {
      // A relação mudou por outro caminho (outra aba, resposta perdida): o servidor sabe o estado.
      await carregar()
    } else {
      erroDaAcao.value = erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
    }
  } finally {
    agindo.value = false
  }
}

async function deixarDeSeguir(): Promise<void> {
  const atual = perfil.value
  if (!atual) {
    return
  }
  agindo.value = true
  erroDaConfirmacao.value = null
  try {
    await perfilService.deixarDeSeguir(atual.username, novaChaveIdempotencia())
    confirmando.value = false
    perfil.value = {
      ...atual,
      relacao: 'nenhuma',
      conteudoRestrito: atual.privacidade === 'privado',
      contadores: { ...atual.contadores, seguidores: Math.max(0, atual.contadores.seguidores - 1) },
    }
  } catch (erro) {
    erroDaConfirmacao.value = erro instanceof ApiError ? erro.message : 'Não foi possível acessar o servidor. Tente novamente.'
  } finally {
    agindo.value = false
  }
}

// Célula de contador: 12 em cima e embaixo nas duas larguras, com o divisor encostando na borda.
const CONTADOR =
  'flex flex-col-reverse items-center gap-0.5 py-space-3 md:flex-row-reverse md:items-baseline md:justify-between md:gap-0'

const textoDaConfirmacao = computed(() =>
  privado.value
    ? 'As atividades dessa pessoa saem do seu feed, e você perde o acesso à estante e às resenhas. Seguir de novo exige uma solicitação nova.'
    : 'As atividades dessa pessoa saem do seu feed. Você pode seguir de novo quando quiser.',
)
</script>

<template>
  <div class="pb-space-10 pt-space-6">
    <div
      v-if="carregando"
      class="flex flex-col items-center gap-space-3 md:w-[300px] md:items-start"
      aria-busy="true"
      aria-label="Carregando perfil"
    >
      <span class="size-24 rounded-full bg-capa-placeholder md:size-[120px]" />
      <span class="mt-space-1 h-8 w-[55%] rounded-sm bg-capa-placeholder" />
      <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
      <span class="h-[15px] w-[80%] rounded-sm bg-capa-placeholder" />
      <span class="mt-space-4 h-12 w-full max-w-[240px] rounded-full bg-capa-placeholder md:max-w-none" />
    </div>

    <!-- O protótipo centraliza o bloco na vertical da área de conteúdo. -->
    <div
      v-else-if="naoEncontrado"
      class="flex min-h-[70vh] flex-col items-center justify-center"
    >
      <EstadoVazio
        :icone="PhUserCircle"
        solto
        titulo="Perfil não encontrado"
        class="max-w-[280px]"
      >
        <p class="mt-space-6 text-body text-grafite">
          Confira o nome de usuário e tente de novo.
        </p>
        <RouterLink
          to="/perfil/buscar"
          class="mt-space-6 flex h-12 items-center justify-center rounded-full bg-musgo px-space-6 text-body-strong text-papel transition-colors duration-dur-fast hover:bg-musgo-vivo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
        >
          Buscar leitor
        </RouterLink>
      </EstadoVazio>
    </div>

    <BannerAviso
      v-else-if="falhou || !perfil"
      variante="erro"
      triangulo
    >
      Não foi possível carregar este perfil. Verifique sua conexão e tente de novo.
      <!-- 8 mais o `py-space-1` do botão textual dão os 12 do protótipo. -->
      <span class="mt-space-2 block">
        <BotaoTextual
          class="-mx-space-1"
          @click="carregar"
        >
          Tentar de novo
        </BotaoTextual>
      </span>
    </BannerAviso>

    <div
      v-else
      class="md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-space-12"
    >
      <section
        class="flex flex-col items-center text-center md:items-start md:text-left"
        :aria-label="`Perfil de ${perfil.displayName}`"
      >
        <AvatarLeitor
          class="md:hidden"
          :url="perfil.avatarUrl"
          :nome="perfil.displayName"
          :tamanho="96"
        />
        <AvatarLeitor
          class="hidden md:flex"
          :url="perfil.avatarUrl"
          :nome="perfil.displayName"
          :tamanho="120"
        />
        <h2 class="mt-space-4 text-display text-tinta md:text-title-lg">
          {{ perfil.displayName }}
        </h2>
        <p class="mt-space-1 text-caption text-grafite-suave">
          @{{ perfil.username }}
        </p>
        <ChipPrivacidade
          class="mt-space-3"
          :privacidade="perfil.privacidade"
        />
        <p
          v-if="privado && perfil.relacao === 'seguindo'"
          class="mt-space-2 text-caption text-grafite"
        >
          Você vê este perfil porque segue {{ nome }}.
        </p>
        <!-- Texto de usuário: interpolação do Vue, com escape (RNF-SEC-14). -->
        <p
          v-if="perfil.biografia"
          class="mt-space-4 line-clamp-3 whitespace-pre-line text-body text-grafite"
        >
          {{ perfil.biografia }}
        </p>

        <!-- §4.8: o pedido recebido tem um lugar, mas a decisão mora na caixa de solicitações. -->
        <RouterLink
          v-if="perfil.relacao === 'solicitacao_recebida'"
          to="/perfil/solicitacoes"
          class="mt-space-4 flex w-full items-center gap-space-3 rounded-base bg-musgo-fundo p-space-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:text-left"
        >
          <PhUserPlus
            :size="20"
            weight="regular"
            class="shrink-0 text-musgo"
            aria-hidden="true"
          />
          <span class="flex-1 text-body text-tinta">{{ nome }} pediu para seguir você.</span>
          <PhCaretRight
            :size="20"
            weight="regular"
            class="shrink-0 text-musgo"
            aria-hidden="true"
          />
        </RouterLink>

        <div class="mt-space-5 w-full max-w-[240px] md:max-w-none">
          <button
            v-if="perfil.relacao === 'seguindo'"
            type="button"
            class="flex h-12 w-full items-center justify-center gap-space-2 rounded-base border border-linha text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
            @click="confirmando = true; erroDaConfirmacao = null"
          >
            <PhCheck
              :size="20"
              weight="bold"
              class="text-musgo"
              aria-hidden="true"
            />
            Seguindo
          </button>
          <p
            v-else-if="perfil.relacao === 'solicitacao_enviada'"
            class="flex h-12 w-full items-center justify-center gap-space-2 rounded-base border border-linha text-body-strong text-grafite md:h-10"
            role="status"
          >
            <PhClock
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
            Solicitação enviada
          </p>
          <BotaoPrimario
            v-else
            class="h-12 gap-space-2 md:h-10"
            :carregando="agindo"
            @click="seguir"
          >
            <PhUserPlus
              :size="20"
              weight="regular"
              aria-hidden="true"
            />
            {{ privado ? 'Solicitar para seguir' : 'Seguir' }}
          </BotaoPrimario>
        </div>
        <BannerAviso
          v-if="erroDaAcao"
          variante="erro"
          class="mt-space-4 w-full text-left"
        >
          {{ erroDaAcao }}
        </BannerAviso>

        <!-- Mesmo arranjo do meu perfil, sem link: mobile numa linha com divisor vertical de
             altura total; web empilhados, número à esquerda e rótulo encostado na direita. -->
        <dl class="mt-space-6 grid w-full grid-cols-2 divide-x divide-linha border-b border-linha md:grid-cols-1 md:divide-x-0 md:divide-y md:border-b-0">
          <div
            :class="CONTADOR"
            :aria-label="contagem(perfil.contadores.seguidores, 'seguidor', 'seguidores')"
          >
            <dt class="text-caption text-grafite md:text-body">
              {{ perfil.contadores.seguidores === 1 ? 'seguidor' : 'seguidores' }}
            </dt>
            <dd class="font-mono text-num-inline tabular-nums text-tinta">
              {{ perfil.contadores.seguidores }}
            </dd>
          </div>
          <div
            :class="CONTADOR"
            :aria-label="`${perfil.contadores.seguidos} seguindo`"
          >
            <dt class="text-caption text-grafite md:text-body">
              seguindo
            </dt>
            <dd class="font-mono text-num-inline tabular-nums text-tinta">
              {{ perfil.contadores.seguidos }}
            </dd>
          </div>
        </dl>
      </section>

      <!-- §4.3: restrito não é erro. Nenhuma capa nem trecho aparece, nem desfocado. -->
      <EstadoVazio
        v-if="restrito"
        :icone="PhLock"
        solto
        titulo="Este perfil é privado"
        class="mx-auto mt-space-10 max-w-[280px] md:mt-space-16 md:max-w-[360px]"
      >
        <p class="mt-space-6 text-body text-grafite">
          <template v-if="perfil.relacao === 'solicitacao_enviada'">
            Sua solicitação está aguardando resposta.
          </template>
          <template v-else>
            Envie uma solicitação para ver a estante, as resenhas e as listas de {{ nome }}.
          </template>
        </p>
      </EstadoVazio>
      <SecoesDeLeitura
        v-else
        :proprio="false"
        :nome="nome"
        :usuario-id="perfil?.id"
        :aba-inicial="typeof route.query.aba === 'string' ? route.query.aba : undefined"
        class="mt-space-12 md:mt-0"
      >
        <template #listas>
          <ListasDoPerfil
            v-if="perfil"
            :usuario-id="perfil.id"
            :proprio="false"
            :nome="nome"
            :username="perfil.username"
          />
        </template>
        <template #estante>
          <div
            v-if="!estante.indisponivel.value"
            class="mt-space-5 md:mt-0 md:pt-space-6"
          >
            <EsqueletoEstante
              v-if="estante.carregando.value"
              :rotulo="TEXTOS_DA_ESTANTE_DE_PERFIL.carregando"
            />
            <BannerAviso
              v-else-if="estante.falhou.value"
              variante="erro"
            >
              {{ TEXTOS_DA_ESTANTE_DE_PERFIL.erroTexto }}
              <BotaoTextual
                class="mt-space-2"
                @click="estante.carregar()"
              >
                Tentar de novo
              </BotaoTextual>
            </BannerAviso>
            <EstadoVazio
              v-else-if="estante.itens.value.length === 0"
              :icone="PhBooks"
              :titulo="textoEstanteDePerfilVazia(nome)"
              class="mx-auto max-w-[280px] pt-space-4"
            />
            <template v-else>
              <ul class="grid grid-cols-2 gap-space-4 md:grid-cols-4 lg:grid-cols-6">
                <li
                  v-for="item in estante.itens.value"
                  :key="item.id"
                  class="flex"
                >
                  <CardEstante
                    :item="item"
                    :acionavel="false"
                  />
                </li>
              </ul>
              <FimDaLista
                v-if="estante.temMais.value || estante.falhouMais.value"
                :falhou="estante.falhouMais.value"
                @carregar="estante.carregarMais()"
              />
            </template>
          </div>
        </template>
      </SecoesDeLeitura>
    </div>

    <DialogoConfirmacao
      compacto
      :aberta="confirmando"
      :titulo="`Deixar de seguir ${nome}?`"
      rotulo-confirmar="Deixar de seguir"
      :processando="agindo"
      :erro="erroDaConfirmacao ?? undefined"
      @confirmar="deixarDeSeguir"
      @cancelar="confirmando = false"
    >
      {{ textoDaConfirmacao }}
    </DialogoConfirmacao>
  </div>
</template>
