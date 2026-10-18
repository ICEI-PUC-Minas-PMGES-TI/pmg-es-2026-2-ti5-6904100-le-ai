<script setup lang="ts">
import {
  PhArchive,
  PhArrowLeft,
  PhCaretRight,
  PhInfo,
  PhShieldCheck,
  PhTrash,
  PhWarning,
} from '@phosphor-icons/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import EstrelasNota from '../../components/livros/EstrelasNota.vue'
import TextoDaResenha from '../../components/livros/TextoDaResenha.vue'
import AvatarLeitor from '../../components/perfil/AvatarLeitor.vue'
import AvisoFlutuante from '../../components/ui/AvisoFlutuante.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import DialogoConfirmacao from '../../components/ui/DialogoConfirmacao.vue'
import {
  acaoDoRegistro,
  alvoDoRegistro,
  consequenciaDaRemocao,
  CONTA_EXCLUIDA,
  dataCurta,
  dataDoRegistro,
  linhaDoCard,
  lugarDaDenuncia,
  nomeDoAutor,
  quemDenunciou,
} from '../../moderacao/textos'
import { usePainelDeModeracao, type OpcoesDoPainel } from '../../moderacao/usePainelDeModeracao'
import { useRegistroDeModeracao, type OpcoesDoRegistro } from '../../moderacao/useRegistroDeModeracao'
import { aquecerLeitura } from '../../services/moderacao'

/**
 * Painel de moderação (F-MOD, painel-de-moderacao.md), só web e só para o administrador. Duas abas:
 * a fila de denúncias pendentes, com o detalhe ao lado a partir de 1024px, e o registro de
 * auditoria. Quem garante que só o administrador chega aqui é o servidor (403); a rota e a
 * sidebar só escondem.
 */
const props = defineProps<{ servico?: OpcoesDoPainel['servico'] & OpcoesDoRegistro['servico'] }>()

const painel = usePainelDeModeracao({ servico: props.servico })
const registro = useRegistroDeModeracao({ servico: props.servico })
const {
  estado,
  coldStart,
  fila,
  temMais,
  carregandoMais,
  falhouMais,
  selecionadaId,
  selecionada,
  acao,
  coldStartDaAcao,
  naoConfirmada,
  erroDaAcao,
  aviso,
} = painel

const aba = ref<'denuncias' | 'registro'>('denuncias')
/** Abaixo de 1024px, fila e detalhe se alternam (§4). */
const detalheAberto = ref(false)
const confirmandoRemocao = ref(false)

const ehResenha = computed(() => selecionada.value?.tipo === 'resenha')
const rotuloRemover = computed(() => (ehResenha.value ? 'Remover resenha' : 'Remover comentário'))
const conteudoIndisponivel = computed(() => selecionada.value !== null && selecionada.value.conteudo === null)
const mostrarNaoConfirmada = computed(
  () => naoConfirmada.value || (selecionada.value?.remocaoNaoConfirmada ?? false),
)

function abrir(id: string): void {
  painel.selecionar(id)
  detalheAberto.value = true
}

function trocarAba(nova: 'denuncias' | 'registro'): void {
  aba.value = nova
  if (nova === 'registro' && registro.estado.value !== 'pronta') {
    void registro.carregar()
  }
}

async function confirmarRemocao(): Promise<void> {
  confirmandoRemocao.value = false
  await painel.remover()
}

watch(fila, (atual) => {
  if (atual.length === 0) {
    detalheAberto.value = false
  }
})

onMounted(() => {
  aquecerLeitura()
  void painel.carregar()
})
</script>

<template>
  <div class="pb-space-10 pt-space-4 md:pt-space-6">
    <!-- Faixa de abas (§5). -->
    <div
      class="flex gap-space-6 border-b border-linha"
      role="tablist"
      aria-label="Moderação"
    >
      <button
        v-for="opcao in ([['denuncias', 'Denúncias pendentes'], ['registro', 'Registro de auditoria']] as const)"
        :key="opcao[0]"
        type="button"
        role="tab"
        :aria-selected="aba === opcao[0]"
        class="-mb-px min-h-12 border-b-2 text-body-strong transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:min-h-11"
        :class="aba === opcao[0] ? 'border-musgo text-musgo' : 'border-transparent text-grafite hover:text-tinta'"
        @click="trocarAba(opcao[0])"
      >
        {{ opcao[1] }}
      </button>
    </div>

    <!-- ===================================================== Denúncias pendentes -->
    <section
      v-if="aba === 'denuncias'"
      class="mt-space-6"
    >
      <!-- 5.9 Carregando -->
      <div
        v-if="estado === 'carregando'"
        class="entrada lg:max-w-[400px]"
        aria-busy="true"
        aria-label="Carregando denúncias"
      >
        <div
          v-for="indice in 5"
          :key="indice"
          class="flex flex-col gap-space-2 border-b border-linha p-space-4"
        >
          <div class="flex justify-between">
            <span class="h-6 w-[72px] rounded-sm bg-capa-placeholder" />
            <span class="h-4 w-16 rounded-sm bg-capa-placeholder" />
          </div>
          <span class="h-4 w-[60%] rounded-sm bg-capa-placeholder" />
          <span class="h-4 w-[90%] rounded-sm bg-capa-placeholder" />
        </div>
        <p
          v-if="coldStart"
          class="mt-space-3 text-caption text-grafite"
          role="status"
        >
          O serviço está iniciando. Isso pode levar alguns segundos.
        </p>
      </div>

      <!-- 5.10 Erro -->
      <div
        v-else-if="estado === 'erro'"
        role="alert"
        class="flex max-w-[720px] items-start gap-space-3 rounded-base bg-rubi-fundo p-space-4"
      >
        <PhWarning
          :size="20"
          weight="regular"
          class="mt-px shrink-0 text-rubi"
          aria-hidden="true"
        />
        <div>
          <p class="text-body text-tinta">
            Não foi possível carregar as denúncias. Verifique sua conexão e tente de novo.
          </p>
          <BotaoTextual
            class="mt-space-2 min-h-12 md:min-h-10"
            @click="painel.carregar()"
          >
            Tentar de novo
          </BotaoTextual>
        </div>
      </div>

      <!-- 5.8 Fila vazia -->
      <div
        v-else-if="fila.length === 0"
        class="mx-auto flex max-w-[420px] flex-col items-center gap-space-6 py-space-12 text-center"
      >
        <PhShieldCheck
          :size="32"
          weight="regular"
          class="text-grafite-suave"
          aria-hidden="true"
        />
        <h2 class="text-title text-tinta">
          Nenhuma denúncia pendente
        </h2>
        <p class="text-body text-grafite">
          Quando um leitor denunciar uma resenha ou um comentário, a denúncia aparece aqui, da mais
          antiga para a mais recente.
        </p>
        <BotaoTextual
          class="min-h-12 md:min-h-10"
          @click="trocarAba('registro')"
        >
          Ver registro de auditoria
        </BotaoTextual>
      </div>

      <!-- Fila e detalhe -->
      <div
        v-else
        class="lg:grid lg:grid-cols-[400px_minmax(0,1fr)]"
      >
        <!-- Coluna da fila -->
        <div :class="detalheAberto ? 'hidden lg:block' : ''">
          <p class="text-caption text-grafite">
            Da mais antiga para a mais recente
          </p>
          <ul class="mt-space-3 divide-y divide-linha">
            <li
              v-for="denuncia in fila"
              :key="denuncia.id"
            >
              <button
                type="button"
                class="flex w-full cursor-pointer flex-col rounded-base p-space-4 text-left transition-colors duration-dur-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo"
                :class="selecionadaId === denuncia.id ? 'bg-musgo-fundo' : 'hover:bg-papel-elevado'"
                :aria-current="selecionadaId === denuncia.id ? 'true' : undefined"
                @click="abrir(denuncia.id)"
              >
                <span class="flex items-center justify-between gap-space-3">
                  <span class="flex items-center gap-space-2">
                    <span class="inline-flex h-6 items-center rounded-full border border-linha px-space-3 text-label text-grafite">
                      {{ denuncia.tipo === 'resenha' ? 'Resenha' : 'Comentário' }}
                    </span>
                    <span
                      v-if="denuncia.livro?.pessoal"
                      class="inline-flex h-6 items-center rounded-full bg-musgo-fundo px-space-3 text-label text-musgo"
                    >Livro pessoal</span>
                  </span>
                  <span class="font-mono text-caption text-grafite">{{ dataCurta(denuncia.criadoEm) }}</span>
                </span>
                <span class="mt-space-2 truncate">
                  <span
                    class="text-body-strong"
                    :class="selecionadaId === denuncia.id ? 'text-musgo' : 'text-tinta'"
                  >{{ nomeDoAutor(denuncia) }}</span>
                  <span class="text-body text-grafite"> · {{ lugarDaDenuncia(denuncia) }}</span>
                </span>
                <span class="mt-space-1 line-clamp-2 break-words text-body text-grafite">{{ denuncia.motivo }}</span>
              </button>
            </li>
          </ul>
          <p
            v-if="falhouMais"
            class="mt-space-3 text-caption text-grafite"
            role="alert"
          >
            Não foi possível carregar mais denúncias. Verifique sua conexão.
          </p>
          <BotaoTextual
            v-if="temMais"
            class="mt-space-3 min-h-12 md:min-h-10"
            :disabled="carregandoMais"
            @click="painel.carregarMais()"
          >
            {{ falhouMais ? 'Tentar de novo' : 'Carregar mais denúncias' }}
          </BotaoTextual>
        </div>

        <!-- Coluna do detalhe -->
        <article
          v-if="selecionada"
          class="flex min-w-0 flex-col lg:border-l lg:border-linha lg:pl-space-8 lg:ml-space-8"
          :class="detalheAberto ? '' : 'hidden lg:flex'"
          aria-live="polite"
        >
          <BotaoTextual
            class="mb-space-4 min-h-12 w-fit lg:hidden"
            tom="grafite"
            @click="detalheAberto = false"
          >
            <PhArrowLeft
              :size="20"
              weight="regular"
              class="mr-space-2"
              aria-hidden="true"
            />
            Denúncias pendentes
          </BotaoTextual>

          <!-- 5.5 Remoção não confirmada -->
          <div
            v-if="mostrarNaoConfirmada"
            role="alert"
            class="mb-space-6 flex items-start gap-space-3 rounded-base bg-rubi-fundo p-space-4"
          >
            <PhWarning
              :size="20"
              weight="regular"
              class="mt-px shrink-0 text-rubi"
              aria-hidden="true"
            />
            <p class="text-body text-tinta">
              A remoção não foi confirmada a tempo. A denúncia continua pendente. Tente de novo: se a
              remoção já tiver acontecido, ela não é aplicada duas vezes.
            </p>
          </div>

          <h2 class="text-title-lg text-tinta">
            {{ ehResenha ? 'Denúncia de resenha' : 'Denúncia de comentário' }}
          </h2>
          <p class="mt-space-2 text-caption text-grafite">
            {{ quemDenunciou(selecionada) }}
          </p>

          <h3 class="mt-space-6 text-title-sm text-tinta">
            Motivo
          </h3>
          <p class="mt-space-3 whitespace-pre-line break-words border-l-2 border-linha pl-space-4 text-body-lg text-tinta">
            {{ selecionada.motivo }}
          </p>

          <h3 class="mt-space-6 text-title-sm text-tinta">
            Conteúdo denunciado
          </h3>
          <!-- 5.7 Conteúdo já excluído -->
          <div
            v-if="conteudoIndisponivel"
            class="mt-space-3 flex items-start gap-space-3 rounded-base bg-musgo-fundo p-space-4"
          >
            <PhInfo
              :size="20"
              weight="regular"
              class="mt-px shrink-0 text-musgo"
              aria-hidden="true"
            />
            <p class="text-body text-tinta">
              {{ ehResenha ? 'Quem escreveu excluiu esta resenha depois da denúncia. Não há o que remover.' : 'Quem escreveu excluiu este comentário depois da denúncia. Não há o que remover.' }}
            </p>
          </div>
          <div
            v-else-if="selecionada.conteudo"
            class="mt-space-3 rounded-md bg-papel-elevado p-space-5"
          >
            <div class="flex items-center gap-space-3">
              <AvatarLeitor
                :url="selecionada.autor?.avatarUrl ?? null"
                :nome="selecionada.autor?.nomeExibicao"
                :tamanho="40"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-title-sm text-tinta">
                  {{ selecionada.autor?.nomeExibicao ?? CONTA_EXCLUIDA }}
                </p>
                <p
                  v-if="selecionada.autor"
                  class="truncate text-caption text-grafite-suave"
                >
                  @{{ selecionada.autor.username }}
                </p>
              </div>
              <EstrelasNota
                v-if="ehResenha && selecionada.conteudo.nota !== null"
                tamanho="sm"
                :valor="selecionada.conteudo.nota"
              />
            </div>
            <p class="mt-space-2 text-caption text-grafite">
              {{ linhaDoCard(selecionada) }}
            </p>
            <p
              v-if="ehResenha && selecionada.conteudo.spoiler"
              class="mt-space-4 text-caption text-grafite"
            >
              Marcada com spoiler por quem escreveu.
            </p>
            <TextoDaResenha
              v-if="ehResenha"
              class="mt-space-4"
              :texto="selecionada.conteudo.texto"
            />
            <p
              v-else
              class="mt-space-4 whitespace-pre-wrap break-words text-body text-tinta"
            >
              {{ selecionada.conteudo.texto }}
            </p>
            <RouterLink
              v-if="ehResenha && selecionada.livro && !selecionada.livro.pessoal"
              :to="{ name: 'livro-oficial', params: { id: selecionada.livro.id } }"
              class="mt-space-4 inline-flex min-h-12 items-center gap-space-1 text-body-strong text-musgo hover:underline md:min-h-10"
            >
              Ver na página do livro
              <PhCaretRight
                :size="16"
                weight="regular"
                aria-hidden="true"
              />
            </RouterLink>
            <RouterLink
              v-else-if="!ehResenha && selecionada.atividade?.visivelParaAdmin"
              to="/feed"
              class="mt-space-4 inline-flex min-h-12 items-center gap-space-1 text-body-strong text-musgo hover:underline md:min-h-10"
            >
              Ver no feed
              <PhCaretRight
                :size="16"
                weight="regular"
                aria-hidden="true"
              />
            </RouterLink>
          </div>
          <div
            v-if="!ehResenha && (selecionada.conteudo?.respostas ?? 0) > 0"
            class="mt-space-4 flex items-start gap-space-3 rounded-base bg-musgo-fundo p-space-4"
          >
            <PhInfo
              :size="20"
              weight="regular"
              class="mt-px shrink-0 text-musgo"
              aria-hidden="true"
            />
            <p class="text-body text-tinta">
              Este comentário tem {{ selecionada.conteudo!.respostas === 1 ? '1 resposta' : `${selecionada.conteudo!.respostas} respostas` }}.
              Remover o comentário remove {{ selecionada.conteudo!.respostas === 1 ? 'a resposta' : 'as respostas' }} também.
            </p>
          </div>

          <!-- Barra de ações -->
          <div class="sticky bottom-0 mt-space-6 border-t border-linha bg-papel py-space-4">
            <p
              v-if="coldStartDaAcao"
              class="mb-space-3 text-right text-caption text-grafite"
              role="status"
            >
              O serviço está iniciando. Isso pode levar alguns segundos.
            </p>
            <p
              v-if="erroDaAcao"
              role="alert"
              class="mb-space-3 text-right text-caption text-rubi"
            >
              {{ erroDaAcao }}
            </p>
            <div class="flex flex-col-reverse gap-space-3 md:flex-row md:justify-end">
              <button
                v-if="!mostrarNaoConfirmada"
                type="button"
                class="inline-flex h-12 items-center justify-center gap-space-2 rounded-base border border-linha px-space-5 text-body-strong text-tinta transition-colors duration-dur-fast hover:bg-papel-elevado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo disabled:cursor-not-allowed disabled:text-grafite-suave md:h-10"
                :disabled="acao !== null"
                @click="painel.arquivar()"
              >
                <PhArchive
                  :size="20"
                  weight="regular"
                  aria-hidden="true"
                />
                {{ conteudoIndisponivel ? 'Arquivar denúncia' : 'Arquivar como improcedente' }}
              </button>
              <button
                v-if="!conteudoIndisponivel"
                type="button"
                class="inline-flex h-12 items-center justify-center gap-space-2 rounded-base border border-rubi px-space-5 text-body-strong text-rubi transition-colors duration-dur-fast hover:bg-rubi-fundo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:h-10"
                :aria-busy="acao === 'remover' ? 'true' : undefined"
                :disabled="acao !== null"
                @click="confirmandoRemocao = true"
              >
                <PhTrash
                  :size="20"
                  weight="regular"
                  aria-hidden="true"
                />
                <span aria-live="polite">{{ acao === 'remover' ? (ehResenha ? 'Removendo resenha' : 'Removendo comentário') : rotuloRemover }}</span>
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ===================================================== Registro de auditoria -->
    <section
      v-else
      class="mt-space-6 max-w-[1080px]"
    >
      <p class="text-caption text-grafite">
        Toda ação de moderação fica registrada, da mais recente para a mais antiga. Conteúdo removido e
        motivos não ficam no registro.
      </p>
      <p
        v-if="registro.estado.value === 'carregando'"
        class="mt-space-4 text-body text-grafite"
        aria-busy="true"
      >
        Carregando o registro…
      </p>
      <div
        v-else-if="registro.estado.value === 'erro'"
        role="alert"
        class="mt-space-4 flex max-w-[720px] items-start gap-space-3 rounded-base bg-rubi-fundo p-space-4"
      >
        <PhWarning
          :size="20"
          weight="regular"
          class="mt-px shrink-0 text-rubi"
          aria-hidden="true"
        />
        <div>
          <p class="text-body text-tinta">
            Não foi possível carregar o registro. Verifique sua conexão e tente de novo.
          </p>
          <BotaoTextual
            class="mt-space-2 min-h-12 md:min-h-10"
            @click="registro.carregar()"
          >
            Tentar de novo
          </BotaoTextual>
        </div>
      </div>
      <p
        v-else-if="registro.itens.value.length === 0"
        class="mt-space-4 text-body text-grafite"
      >
        Nenhuma ação de moderação registrada ainda.
      </p>
      <template v-else>
        <div class="mt-space-4 overflow-x-auto">
          <table class="w-full min-w-[640px] table-fixed border-collapse text-left">
            <thead>
              <tr class="h-10 border-b border-linha text-label text-grafite">
                <th class="w-[180px] font-normal">
                  Data e hora
                </th>
                <th class="w-[160px] font-normal">
                  Autor
                </th>
                <th class="w-[240px] font-normal">
                  Ação
                </th>
                <th class="font-normal">
                  Alvo
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-linha">
              <tr
                v-for="linha in registro.itens.value"
                :key="linha.id"
                class="h-14"
              >
                <td class="font-mono text-body text-tinta tabular-nums">
                  {{ dataDoRegistro(linha.criadoEm) }}
                </td>
                <td class="text-body text-grafite">
                  Administrador
                </td>
                <td class="text-body-strong text-tinta">
                  {{ acaoDoRegistro(linha) }}
                </td>
                <td
                  class="truncate text-body text-tinta"
                  :aria-label="alvoDoRegistro(linha)"
                >
                  {{ alvoDoRegistro(linha) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p
          v-if="registro.falhouMais.value"
          class="mt-space-3 text-caption text-grafite"
          role="alert"
        >
          Não foi possível carregar mais registros. Verifique sua conexão.
        </p>
        <BotaoTextual
          v-if="registro.temMais.value"
          class="mt-space-3 min-h-12 md:min-h-10"
          :disabled="registro.carregandoMais.value"
          @click="registro.carregarMais()"
        >
          {{ registro.falhouMais.value ? 'Tentar de novo' : 'Carregar mais registros' }}
        </BotaoTextual>
      </template>
    </section>

    <DialogoConfirmacao
      :aberta="confirmandoRemocao && selecionada !== null"
      :titulo="selecionada ? `${ehResenha ? 'Remover a resenha' : 'Remover o comentário'} de ${nomeDoAutor(selecionada)}?` : ''"
      :rotulo-confirmar="rotuloRemover"
      @confirmar="confirmarRemocao"
      @cancelar="confirmandoRemocao = false"
    >
      {{ selecionada ? consequenciaDaRemocao(selecionada) : '' }}
    </DialogoConfirmacao>
    <AvisoFlutuante
      :aberto="aviso !== null"
      @fechar="aviso = null"
    >
      {{ aviso?.texto }}
    </AvisoFlutuante>
  </div>
</template>
