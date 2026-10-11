<script setup lang="ts">
import { PhCaretRight, PhGear, PhMagnifyingGlass, PhUserPlus, PhWarning } from '@phosphor-icons/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import CardEstante from '../../components/estante/CardEstante.vue'
import EsqueletoEstante from '../../components/estante/EsqueletoEstante.vue'
import ListasDoPerfil from '../../components/listas/ListasDoPerfil.vue'
import AvatarLeitor from '../../components/perfil/AvatarLeitor.vue'
import ChipPrivacidade from '../../components/perfil/ChipPrivacidade.vue'
import FimDaLista from '../../components/perfil/FimDaLista.vue'
import SecoesDeLeitura from '../../components/perfil/SecoesDeLeitura.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import { TEXTOS_DA_ESTANTE_DE_PERFIL } from '../../estante/textos'
import { useEstante } from '../../estante/useEstante'
import { contagem } from '../../perfil/textos'
import { leituraService } from '../../services/leitura'
import { perfilService, type Perfil } from '../../services/perfil'

/**
 * Meu perfil (RF-SOC-01, RF-SOC-04, RF-SOC-08), a partir de
 * docs/design/periodo-1/F-PERFIL/meu-perfil.md. Mobile: identidade centralizada e contadores numa
 * linha com divisor. Web: coluna de identidade de 300px com os contadores empilhados, e a linha
 * de solicitações no topo da coluna direita, sobre as abas Estante/Resenhas.
 *
 * **Estante e Resenhas do `leitura`** (`listarEstantePerfil`, F-EST, e `listarResenhasPerfil`,
 * F-AVA). A estante usa o mesmo grid só leitura do perfil de outro leitor; vazia ou indisponível,
 * fica o vazio de `SecoesDeLeitura`, com o CTA "Buscar livros". O contador `livros lidos` vem dos
 * totais da estante e leva a ela filtrada por `Lido`; aparece só depois que a estante carrega.
 *
 * Sem sino na web, o perfil é o único lugar em que um pedido para seguir aparece (§1): a contagem
 * vem de uma página de um item da caixa, e falhar nela só esconde a linha.
 */
const route = useRoute()
const perfil = ref<Perfil | null>(null)
const carregando = ref(true)
const falhou = ref(false)
const pedidosPendentes = ref(0)

async function carregar(): Promise<void> {
  carregando.value = true
  falhou.value = false
  try {
    perfil.value = await perfilService.obterMeuPerfil()
  } catch {
    falhou.value = true
  } finally {
    carregando.value = false
  }
}

async function contarPedidos(): Promise<void> {
  try {
    pedidosPendentes.value = (await perfilService.listarSolicitacoes(0, 1)).totalElements
  } catch {
    pedidosPendentes.value = 0
  }
}

onMounted(() => {
  void carregar()
  void contarPedidos()
})

const estante = useEstante((filtro) => leituraService.listarEstantePerfil(perfil.value?.id ?? '', filtro))
watch(
  () => perfil.value?.id,
  (id) => {
    if (id) {
      void estante.carregar()
    }
  },
)

const livrosLidos = computed(() => (estante.indisponivel.value ? null : estante.livrosLidos.value))

/** Sem livros (ou com o `leitura` respondendo 404), vale o vazio padrão da seção, com o CTA. */
const mostraEstante = computed(
  () => !estante.indisponivel.value && (estante.carregando.value || estante.falhou.value || estante.itens.value.length > 0),
)

// Célula: dá a folga entre o hover e o divisor (mobile, dos dois lados; web, em cima e embaixo).
const CELULA_DE_CONTADOR = 'flex p-space-1 md:px-0'

// Link: no mobile, número sobre o rótulo, centralizado; na web, número à esquerda e rótulo à
// direita nas pontas da coluna. O `-mx-space-3` com `px-space-3` mantém o texto alinhado à
// coluna e deixa o hover respirar para fora dela.
const LINK_DE_CONTADOR =
  'flex min-h-12 flex-1 flex-col-reverse items-center justify-center gap-0.5 rounded-base px-space-2 py-space-2 transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:-mx-space-3 md:min-h-0 md:flex-row-reverse md:items-baseline md:justify-between md:px-space-3'
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
      <!-- A barra do botão só existe no skeleton web; o mobile do protótipo não tem. -->
      <span class="mt-space-4 hidden h-10 w-full rounded-base bg-capa-placeholder md:block" />
    </div>

    <div
      v-else-if="falhou || !perfil"
      class="flex items-start gap-space-3 rounded-base bg-rubi-fundo p-space-4"
      role="alert"
    >
      <PhWarning
        :size="20"
        weight="regular"
        class="mt-0.5 shrink-0 text-rubi"
        aria-hidden="true"
      />
      <!-- 8 de gap mais o `py-space-1` do botão textual dão os 12 do protótipo. -->
      <div class="flex flex-col items-start gap-space-2">
        <p class="text-body text-tinta">
          Não foi possível carregar seu perfil. Verifique sua conexão e tente de novo.
        </p>
        <BotaoTextual
          class="-mx-space-1"
          @click="carregar"
        >
          Tentar de novo
        </BotaoTextual>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col gap-space-6 md:grid md:grid-cols-[300px_minmax(0,1fr)] md:gap-space-12"
    >
      <section
        class="flex flex-col items-center text-center md:items-start md:text-left"
        aria-label="Seu perfil"
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
          v-if="perfil.privacidade === 'privado'"
          class="mt-space-2 text-caption text-grafite"
        >
          Só quem você aceita vê sua estante e suas resenhas.
        </p>

        <!-- Texto de usuário: interpolação do Vue, com escape (RNF-SEC-14). -->
        <p
          v-if="perfil.biografia"
          class="mt-space-4 line-clamp-3 whitespace-pre-line text-body text-grafite"
        >
          {{ perfil.biografia }}
        </p>

        <RouterLink
          to="/perfil/editar"
          class="mt-space-5 flex h-12 w-full max-w-[240px] items-center justify-center rounded-base border border-linha text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10 md:max-w-none"
        >
          Editar perfil
        </RouterLink>

        <!-- Mobile: números numa linha com divisor vertical (§4); web: empilhados, número à
             esquerda e rótulo à direita, com divisor horizontal (§5). O divisor fica na célula,
             que não tem raio; o link dentro dela tem padding e hover arredondado próprios, sem
             encostar no separador. -->
        <nav
          class="mt-space-6 grid w-full border-b border-linha md:grid-cols-1 md:border-b-0"
          :class="livrosLidos === null ? 'grid-cols-2' : 'grid-cols-3'"
          aria-label="Contadores"
        >
          <div
            v-if="livrosLidos !== null"
            :class="CELULA_DE_CONTADOR"
          >
            <RouterLink
              to="/estante?status=LIDO"
              :class="LINK_DE_CONTADOR"
              :aria-label="contagem(livrosLidos, 'livro lido', 'livros lidos')"
            >
              <span class="text-caption text-grafite md:text-body">
                {{ livrosLidos === 1 ? 'livro lido' : 'livros lidos' }}
              </span>
              <span class="font-mono text-num-inline tabular-nums text-tinta">
                {{ livrosLidos }}
              </span>
            </RouterLink>
          </div>
          <div :class="[CELULA_DE_CONTADOR, livrosLidos === null ? '' : 'border-l border-linha md:border-l-0 md:border-t']">
            <RouterLink
              to="/perfil/conexoes?aba=seguidores"
              :class="LINK_DE_CONTADOR"
              :aria-label="contagem(perfil.contadores.seguidores, 'seguidor', 'seguidores')"
            >
              <span class="text-caption text-grafite md:text-body">
                {{ perfil.contadores.seguidores === 1 ? 'seguidor' : 'seguidores' }}
              </span>
              <span class="font-mono text-num-inline tabular-nums text-tinta">
                {{ perfil.contadores.seguidores }}
              </span>
            </RouterLink>
          </div>
          <div :class="[CELULA_DE_CONTADOR, 'border-l border-linha md:border-l-0 md:border-t']">
            <RouterLink
              to="/perfil/conexoes?aba=seguidos"
              :class="LINK_DE_CONTADOR"
              :aria-label="`${perfil.contadores.seguidos} seguindo`"
            >
              <span class="text-caption text-grafite md:text-body">
                seguindo
              </span>
              <span class="font-mono text-num-inline tabular-nums text-tinta">
                {{ perfil.contadores.seguidos }}
              </span>
            </RouterLink>
          </div>
        </nav>
      </section>

      <div>
        <!-- §4.3: sem badge vermelho nem ponto pulsando; o número está escrito com unidade. -->
        <RouterLink
          v-if="pedidosPendentes > 0"
          to="/perfil/solicitacoes"
          class="flex items-center gap-space-3 rounded-base bg-musgo-fundo p-space-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
        >
          <PhUserPlus
            :size="20"
            weight="regular"
            class="shrink-0 text-musgo"
            aria-hidden="true"
          />
          <span class="flex-1 text-body text-tinta">
            {{ contagem(pedidosPendentes, 'solicitação', 'solicitações') }} para seguir você
          </span>
          <PhCaretRight
            :size="20"
            weight="regular"
            class="shrink-0 text-musgo"
            aria-hidden="true"
          />
        </RouterLink>

        <!-- Mobile: 48 abaixo do divisor dos contadores (ou da linha de pedidos); web: as abas
             logo no topo da coluna, ou 24 abaixo da linha de pedidos. -->
        <SecoesDeLeitura
          :proprio="true"
          :usuario-id="perfil.id"
          :aba-inicial="typeof route.query.aba === 'string' ? route.query.aba : undefined"
          :class="pedidosPendentes > 0 ? 'mt-space-12 md:mt-space-6' : 'mt-space-6 md:mt-0'"
        >
          <template #listas>
            <ListasDoPerfil
              :usuario-id="perfil.id"
              :proprio="true"
              :privacidade="perfil.privacidade"
            />
          </template>
          <template
            v-if="mostraEstante"
            #estante
          >
            <div class="mt-space-5 md:mt-0 md:pt-space-6">
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
                  :carregando="estante.carregandoMais.value"
                  @carregar="estante.carregarMais()"
                />
              </template>
            </div>
          </template>
        </SecoesDeLeitura>
      </div>
    </div>
  </div>

  <Teleport
    to="#cabecalho-acoes"
    defer
  >
    <!-- Mobile: lupa e engrenagem (§4); web: dois botões secundários (§5). A lupa busca pessoas. -->
    <div class="-mr-space-3 flex items-center md:hidden">
      <RouterLink
        to="/perfil/buscar"
        class="flex size-12 items-center justify-center rounded-base text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
        aria-label="Buscar leitor"
      >
        <PhMagnifyingGlass
          :size="24"
          weight="regular"
          aria-hidden="true"
        />
      </RouterLink>
      <RouterLink
        to="/perfil/configuracoes"
        class="flex size-12 items-center justify-center rounded-base text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-none focus-visible:ring-[1.5px] focus-visible:ring-musgo"
        aria-label="Configurações"
      >
        <PhGear
          :size="24"
          weight="regular"
          aria-hidden="true"
        />
      </RouterLink>
    </div>
    <div class="hidden items-center gap-space-3 md:flex">
      <RouterLink
        to="/perfil/buscar"
        class="flex h-10 items-center gap-space-2 rounded-base border border-linha px-space-5 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
      >
        <PhMagnifyingGlass
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        Buscar leitor
      </RouterLink>
      <RouterLink
        to="/perfil/configuracoes"
        class="flex h-10 items-center gap-space-2 rounded-base border border-linha px-space-5 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-linha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
      >
        <PhGear
          :size="20"
          weight="regular"
          aria-hidden="true"
        />
        Configurações
      </RouterLink>
    </div>
  </Teleport>
</template>
