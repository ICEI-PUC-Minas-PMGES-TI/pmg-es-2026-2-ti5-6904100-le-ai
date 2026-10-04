<script setup lang="ts">
import {
  PhBookmarkSimple,
  PhCheck,
  PhClock,
  PhInfo,
  PhMagnifyingGlass,
  PhPaperPlaneTilt,
  PhProhibit,
  PhUserMinus,
  PhUsersThree,
  PhWarning,
  PhX,
} from '@phosphor-icons/vue'
import { computed, onMounted, ref, useId, type Component } from 'vue'
import { useRouter } from 'vue-router'

import CapaLivro from '../livros/CapaLivro.vue'
import ContadorDeCaracteres from '../livros/ContadorDeCaracteres.vue'
import AvatarLeitor from '../perfil/AvatarLeitor.vue'
import BotaoPrimario from '../ui/BotaoPrimario.vue'
import BotaoTextual from '../ui/BotaoTextual.vue'
import DialogoConfirmacao from '../ui/DialogoConfirmacao.vue'
import EstadoVazio from '../ui/EstadoVazio.vue'
import SobreposicaoModal from '../ui/SobreposicaoModal.vue'
import { mostrarAviso } from '../../avisos'
import { contagem } from '../../perfil/textos'
import { LIMITE_DA_MENSAGEM, useRecomendar, type SituacaoDoLeitor } from '../../recomendacoes/useRecomendar'
import type { CandidatoARecomendacao, MotivoBloqueio } from '../../services/social'

const props = defineProps<{
  livro: { id: string; titulo: string; autor: string | null; capaUrl: string | null }
}>()

const emit = defineEmits<{ fechar: [] }>()

const router = useRouter()
const tela = useRecomendar(props.livro.id)
const {
  estado,
  coldStart,
  candidatos,
  filtrados,
  selecionados,
  busca,
  mensagem,
  caracteres,
  mensagemExcede,
  semMutuos,
  alterado,
  podeEnviar,
  podeConcluir,
  enviando,
  falha,
  avisoParcial,
} = tela

const confirmandoDescarte = ref(false)
const idMensagem = useId()
const idBusca = useId()

const MOTIVOS: Record<MotivoBloqueio, { texto: string; anuncio: string; icone: Component }> = {
  JA_TEM_LIVRO: {
    texto: 'Já tem esse livro em sua estante',
    anuncio: 'já tem esse livro em sua estante',
    icone: PhBookmarkSimple,
  },
  LIMITE_ATINGIDO: {
    texto: 'Limite de recomendações para esta pessoa',
    anuncio: 'limite de recomendações para esta pessoa',
    icone: PhProhibit,
  },
  SEM_MUTUO: { texto: 'Não segue mais você de volta', anuncio: 'não segue mais você de volta', icone: PhUserMinus },
  JA_RECOMENDADO: {
    texto: 'Já tem uma recomendação sua deste livro',
    anuncio: 'já tem uma recomendação sua deste livro',
    icone: PhBookmarkSimple,
  },
}

const escolhidos = computed(() =>
  selecionados.value.length === 0 ? 'Nenhum escolhido' : contagem(selecionados.value.length, 'escolhido', 'escolhidos'),
)

const rotuloDoEnvio = computed(() => {
  if (enviando.value) {
    return 'Enviando recomendação'
  }
  if (podeConcluir.value) {
    return 'Concluir'
  }
  const total = selecionados.value.length
  return total === 0 ? 'Enviar recomendação' : `Enviar para ${contagem(total, 'leitor', 'leitores')}`
})

function situacaoDe(candidato: CandidatoARecomendacao): SituacaoDoLeitor {
  return tela.situacao(candidato)
}

function motivoDe(candidato: CandidatoARecomendacao) {
  const situacao = situacaoDe(candidato)
  return situacao.tipo === 'indisponivel' ? MOTIVOS[situacao.motivo] : null
}

function rotuloDaLinha(candidato: CandidatoARecomendacao): string {
  const { nomeExibicao, username } = candidato.leitor
  if (situacaoDe(candidato).tipo === 'enviada') {
    return `${nomeExibicao}, recomendação enviada`
  }
  const motivo = motivoDe(candidato)
  if (motivo) {
    return `${nomeExibicao}, ${motivo.anuncio}, indisponível`
  }
  const marcado = selecionados.value.includes(candidato.leitor.id)
  return `${nomeExibicao}, @${username}, ${marcado ? 'selecionada' : 'não selecionada'}`
}

function pedirFechar(): void {
  if (enviando.value) {
    return
  }
  if (alterado.value && !podeConcluir.value) {
    confirmandoDescarte.value = true
  } else {
    emit('fechar')
  }
}

async function enviarOuConcluir(): Promise<void> {
  if (podeConcluir.value) {
    emit('fechar')
    return
  }
  const resultado = await tela.enviar()
  if (resultado.concluido && resultado.aviso) {
    mostrarAviso(resultado.aviso, PhPaperPlaneTilt)
    emit('fechar')
  }
}

function buscarLeitores(): void {
  emit('fechar')
  void router.push('/perfil/buscar')
}

onMounted(() => void tela.carregar())
</script>

<template>
  <SobreposicaoModal
    :aberta="true"
    rotulo="Recomendar a um leitor"
    foco-inicial="[data-fechar]"
    @fechar="pedirFechar"
  >
    <div class="-mx-space-6 -mb-space-6 flex max-h-[calc(100dvh-6rem)] flex-col md:max-h-[712px]">
      <header class="flex items-center justify-between gap-space-4 px-space-6 pb-space-4">
        <h2 class="text-title text-tinta">
          <span class="md:hidden">Recomendar</span>
          <span class="hidden md:inline">Recomendar a um leitor</span>
        </h2>
        <button
          type="button"
          data-fechar
          class="-mr-space-3 flex size-12 cursor-pointer items-center justify-center rounded-full text-grafite hover:bg-linha md:size-10"
          aria-label="Fechar"
          @click="pedirFechar"
        >
          <PhX
            :size="20"
            weight="regular"
            aria-hidden="true"
          />
        </button>
      </header>

      <div class="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-space-6">
        <div
          v-if="falha || avisoParcial"
          role="alert"
          class="mb-space-4 flex items-start gap-space-3 rounded-base p-space-4 text-body text-tinta"
          :class="falha === 'conexao' ? 'bg-rubi-fundo' : 'bg-ambar-fundo'"
        >
          <component
            :is="falha === 'conexao' ? PhWarning : falha === 'frequencia' ? PhClock : PhInfo"
            :size="20"
            weight="regular"
            class="mt-px shrink-0"
            :class="falha === 'conexao' ? 'text-rubi' : 'text-tinta'"
            aria-hidden="true"
          />
          <p v-if="falha === 'conexao'">
            Não foi possível enviar a recomendação. Verifique sua conexão e tente de novo.
          </p>
          <p v-else-if="falha === 'frequencia'">
            Você enviou muitas recomendações em pouco tempo. Espere alguns minutos e tente de novo.
          </p>
          <p v-else>
            {{ avisoParcial }}
          </p>
        </div>

        <div class="flex items-center gap-space-4 border-b border-linha pb-space-4">
          <CapaLivro
            :url="livro.capaUrl"
            class="h-[72px] w-12"
          />
          <div class="min-w-0">
            <p class="text-title-sm text-tinta">
              {{ livro.titulo }}
            </p>
            <p
              v-if="livro.autor"
              class="text-caption text-grafite"
            >
              {{ livro.autor }}
            </p>
          </div>
        </div>

        <template v-if="semMutuos">
          <EstadoVazio
            :icone="PhUsersThree"
            solto
            titulo="Ninguém para recomendar ainda"
            class="py-space-10"
          >
            <p class="mt-space-2 text-body text-grafite">
              Recomendações são trocadas entre leitores que se seguem. Quando alguém que você segue
              seguir você de volta, essa pessoa aparece aqui.
            </p>
            <BotaoPrimario
              class="mt-space-6 w-auto"
              @click="buscarLeitores"
            >
              Buscar leitores
            </BotaoPrimario>
          </EstadoVazio>
        </template>

        <template v-else>
          <div class="mt-space-4 flex flex-col gap-space-2">
            <label
              :for="idMensagem"
              class="text-label text-grafite"
            >Mensagem (opcional)</label>
            <textarea
              :id="idMensagem"
              v-model="mensagem"
              rows="3"
              placeholder="Conte por que esse livro combina com a pessoa"
              :aria-invalid="mensagemExcede ? 'true' : undefined"
              :aria-describedby="`${idMensagem}-ajuda`"
              class="field-sizing-content max-h-[152px] min-h-24 w-full resize-none rounded-base bg-papel-elevado px-space-4 py-space-3 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave"
              :class="mensagemExcede ? 'border-[1.5px] border-rubi' : 'border border-linha focus:border-[1.5px] focus:border-musgo'"
            />
            <div class="flex items-start justify-between gap-space-4">
              <p
                :id="`${idMensagem}-ajuda`"
                class="text-caption"
                :class="mensagemExcede ? 'text-rubi' : 'text-grafite'"
              >
                {{
                  mensagemExcede
                    ? 'A mensagem passou do limite de 280 caracteres.'
                    : 'Todos os escolhidos recebem a mesma mensagem.'
                }}
              </p>
              <ContadorDeCaracteres
                class="shrink-0"
                :total="caracteres"
                :limite="LIMITE_DA_MENSAGEM"
                :aviso="LIMITE_DA_MENSAGEM + 1"
              />
            </div>
          </div>

          <section class="mt-space-6">
            <div class="flex items-baseline justify-between gap-space-4">
              <h3 class="text-title-sm text-tinta">
                Para quem
              </h3>
              <p
                v-if="estado === 'pronta'"
                class="text-caption text-grafite"
                aria-live="polite"
              >
                {{ escolhidos }}
              </p>
            </div>
            <p class="mt-space-2 text-caption text-grafite">
              Aparecem aqui os leitores que você segue e que seguem você.
            </p>

            <div
              v-if="estado === 'erro'"
              role="alert"
              class="mt-space-4 flex items-start gap-space-3 rounded-base bg-rubi-fundo p-space-4"
            >
              <PhWarning
                :size="20"
                weight="regular"
                class="mt-px shrink-0 text-rubi"
                aria-hidden="true"
              />
              <div>
                <p class="text-body text-tinta">
                  Não foi possível carregar seus leitores. Verifique sua conexão e tente de novo.
                </p>
                <BotaoTextual
                  class="mt-space-1 min-h-10"
                  @click="tela.carregar()"
                >
                  Tentar de novo
                </BotaoTextual>
              </div>
            </div>

            <div
              v-else-if="estado === 'carregando'"
              class="entrada mt-space-3"
              aria-busy="true"
              aria-label="Carregando leitores"
            >
              <div
                v-for="linha in 4"
                :key="linha"
                class="flex min-h-16 items-center gap-space-3 border-t border-linha py-space-3 md:min-h-14"
              >
                <span class="size-10 shrink-0 rounded-full bg-capa-placeholder" />
                <span class="flex flex-1 flex-col gap-space-2">
                  <span class="h-[15px] w-[45%] rounded-sm bg-capa-placeholder" />
                  <span class="h-[13px] w-[30%] rounded-sm bg-capa-placeholder" />
                </span>
                <span class="size-6 rounded-sm bg-capa-placeholder md:size-5" />
              </div>
              <p
                v-if="coldStart"
                class="mt-space-3 text-caption text-grafite"
              >
                O serviço está iniciando. Isso pode levar alguns segundos.
              </p>
            </div>

            <template v-else>
              <div class="mt-space-4 flex flex-col gap-space-2">
                <label
                  :for="idBusca"
                  class="text-label text-grafite"
                >Buscar entre eles</label>
                <div class="relative">
                  <PhMagnifyingGlass
                    :size="20"
                    weight="regular"
                    class="pointer-events-none absolute left-space-4 top-1/2 -translate-y-1/2 text-grafite-suave"
                    aria-hidden="true"
                  />
                  <input
                    :id="idBusca"
                    v-model="busca"
                    type="search"
                    placeholder="Nome ou @username"
                    class="h-12 w-full rounded-base border border-linha bg-papel-elevado pl-[52px] pr-12 text-body text-tinta outline-none transition-colors duration-dur-fast placeholder:text-grafite-suave focus:border-[1.5px] focus:border-musgo md:h-11"
                  >
                  <button
                    v-if="busca"
                    type="button"
                    class="absolute right-0 top-1/2 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center text-grafite md:size-11"
                    aria-label="Limpar busca"
                    @click="busca = ''"
                  >
                    <PhX
                      :size="20"
                      weight="regular"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <p
                v-if="filtrados.length === 0 && candidatos.length > 0"
                class="mt-space-4 text-body text-grafite"
              >
                Ninguém com esse nome entre os leitores que você segue e que seguem você.
              </p>
              <ul
                v-else
                class="mt-space-3 divide-y divide-linha border-t border-linha"
              >
                <li
                  v-for="candidato in filtrados"
                  :key="candidato.leitor.id"
                >
                  <button
                    v-if="situacaoDe(candidato).tipo === 'disponivel'"
                    type="button"
                    role="checkbox"
                    :aria-checked="selecionados.includes(candidato.leitor.id)"
                    :aria-label="rotuloDaLinha(candidato)"
                    class="flex min-h-16 w-full cursor-pointer items-center gap-space-3 rounded-base py-space-3 text-left transition-colors duration-dur-fast hover:bg-papel-elevado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-musgo md:min-h-14"
                    @click="tela.alternar(candidato)"
                  >
                    <AvatarLeitor
                      :url="candidato.leitor.avatarUrl"
                      :nome="candidato.leitor.nomeExibicao"
                      :tamanho="40"
                    />
                    <span class="flex min-w-0 flex-1 flex-col">
                      <span class="truncate text-body-strong text-tinta">{{ candidato.leitor.nomeExibicao }}</span>
                      <span class="truncate text-caption text-grafite-suave">@{{ candidato.leitor.username }}</span>
                    </span>
                    <span
                      class="flex size-6 shrink-0 items-center justify-center rounded-sm transition-colors duration-dur-fast md:size-5"
                      :class="selecionados.includes(candidato.leitor.id) ? 'bg-musgo' : 'border-[1.5px] border-grafite'"
                      aria-hidden="true"
                    >
                      <PhCheck
                        v-if="selecionados.includes(candidato.leitor.id)"
                        :size="16"
                        weight="bold"
                        class="text-papel"
                      />
                    </span>
                  </button>
                  <div
                    v-else
                    role="group"
                    :aria-label="rotuloDaLinha(candidato)"
                    class="flex min-h-16 items-center gap-space-3 py-space-3 md:min-h-14"
                  >
                    <AvatarLeitor
                      :url="candidato.leitor.avatarUrl"
                      :nome="candidato.leitor.nomeExibicao"
                      :tamanho="40"
                      :class="situacaoDe(candidato).tipo === 'indisponivel' ? 'opacity-50' : ''"
                    />
                    <span class="flex min-w-0 flex-1 flex-col">
                      <span
                        class="truncate text-body-strong"
                        :class="situacaoDe(candidato).tipo === 'enviada' ? 'text-tinta' : 'text-grafite'"
                      >{{ candidato.leitor.nomeExibicao }}</span>
                      <span
                        v-if="situacaoDe(candidato).tipo === 'enviada'"
                        class="text-caption font-semibold text-musgo"
                      >Recomendação enviada</span>
                      <span
                        v-else
                        class="flex items-center gap-space-1 text-caption text-grafite"
                      >
                        <component
                          :is="motivoDe(candidato)?.icone"
                          :size="16"
                          weight="regular"
                          class="shrink-0"
                          aria-hidden="true"
                        />
                        {{ motivoDe(candidato)?.texto }}
                      </span>
                    </span>
                    <PhCheck
                      v-if="situacaoDe(candidato).tipo === 'enviada'"
                      :size="20"
                      weight="bold"
                      class="shrink-0 text-musgo"
                      aria-hidden="true"
                    />
                  </div>
                </li>
              </ul>
            </template>
          </section>
        </template>
      </div>

      <footer
        v-if="!semMutuos"
        class="flex items-center justify-end gap-space-3 border-t border-linha px-space-6 py-space-4 pb-[calc(var(--spacing-space-4)+env(safe-area-inset-bottom))] md:py-space-6"
      >
        <div class="hidden md:block">
          <BotaoTextual
            class="h-10"
            tom="grafite"
            :disabled="enviando"
            @click="pedirFechar"
          >
            Cancelar
          </BotaoTextual>
        </div>
        <BotaoPrimario
          class="h-12 min-w-0 md:h-10 md:w-auto"
          aparencia-desabilitada="neutra"
          :disabled="!podeEnviar && !podeConcluir"
          :carregando="enviando"
          @click="enviarOuConcluir"
        >
          <PhPaperPlaneTilt
            v-if="!podeConcluir"
            :size="20"
            weight="regular"
            class="mr-space-2"
            aria-hidden="true"
          />
          <span aria-live="polite">{{ rotuloDoEnvio }}</span>
        </BotaoPrimario>
      </footer>
    </div>
  </SobreposicaoModal>

  <DialogoConfirmacao
    :aberta="confirmandoDescarte"
    titulo="Descartar esta recomendação?"
    rotulo-confirmar="Descartar"
    rotulo-cancelar="Continuar editando"
    @confirmar="confirmandoDescarte = false; emit('fechar')"
    @cancelar="confirmandoDescarte = false"
  >
    A mensagem e os leitores escolhidos não serão guardados. Ninguém recebe nada.
  </DialogoConfirmacao>
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
