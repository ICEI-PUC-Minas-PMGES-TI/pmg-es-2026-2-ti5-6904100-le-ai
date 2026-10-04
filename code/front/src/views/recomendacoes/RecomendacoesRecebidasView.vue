<script setup lang="ts">
import { PhDotsThree, PhPaperPlaneTilt, PhUserCircle, PhXCircle } from '@phosphor-icons/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import FimDaLista from '../../components/perfil/FimDaLista.vue'
import ItemRecomendacao from '../../components/recomendacoes/ItemRecomendacao.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import EstadoVazio from '../../components/ui/EstadoVazio.vue'
import type { AcaoDaFolha } from '../../components/ui/FolhaAcoes.vue'
import MenuDeAcoes from '../../components/ui/MenuDeAcoes.vue'
import { fecharAviso, mostrarAviso } from '../../avisos'
import { usePaginacao } from '../../perfil/usePaginacao'
import { novaChaveIdempotencia } from '../../services/api'
import { socialService, type RecomendacaoRecebida } from '../../services/social'

const router = useRouter()
const lista = usePaginacao((pagina) => socialService.listarRecebidas(pagina))
const { itens, total, carregando, carregandoMais, falhou, falhouMais, temMais } = lista

const menu = ref<InstanceType<typeof MenuDeAcoes> | null>(null)
const daVez = ref<RecomendacaoRecebida | null>(null)
const descartando = ref<string[]>([])
const chaves = new Map<string, string>()

const acoes = computed<AcaoDaFolha[]>(() => [
  { id: 'perfil', rotulo: `Ver perfil de ${daVez.value?.remetente.nomeExibicao ?? ''}`, icone: PhUserCircle },
  {
    id: 'descartar',
    rotulo: 'Descartar recomendação',
    detalhe: 'Quem recomendou não fica sabendo.',
    icone: PhXCircle,
  },
])

function abrirMenu(recomendacao: RecomendacaoRecebida, evento: MouseEvent): void {
  daVez.value = recomendacao
  menu.value?.alternar(evento.currentTarget as HTMLElement)
}

function escolher(id: string): void {
  const recomendacao = daVez.value
  if (!recomendacao) {
    return
  }
  if (id === 'perfil') {
    void router.push(`/leitores/${recomendacao.remetente.username}`)
  } else {
    void descartar(recomendacao)
  }
}

async function descartar(recomendacao: RecomendacaoRecebida): Promise<void> {
  const { id } = recomendacao
  if (descartando.value.includes(id)) {
    return
  }
  const chave = chaves.get(id) ?? novaChaveIdempotencia()
  chaves.set(id, chave)
  descartando.value = [...descartando.value, id]
  try {
    await socialService.descartarRecomendacao(id, chave)
    chaves.delete(id)
    lista.retirar(id)
    mostrarAviso('Recomendação descartada.')
  } catch {
    mostrarAviso('Não foi possível descartar a recomendação. Verifique sua conexão e tente de novo.', {
      tom: 'erro',
      acao: {
        rotulo: 'Tentar de novo',
        executar: () => {
          fecharAviso()
          void descartar(recomendacao)
        },
      },
    })
  } finally {
    descartando.value = descartando.value.filter((outro) => outro !== id)
  }
}

onMounted(() => void lista.carregar())
</script>

<template>
  <div class="max-w-[1120px] pb-space-10 pt-space-2 md:pt-space-4">
    <ul
      v-if="carregando"
      class="entrada divide-y divide-linha md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0"
      aria-busy="true"
      aria-label="Carregando recomendações"
    >
      <li
        v-for="n in 3"
        :key="n"
        class="flex gap-space-4 py-space-4 md:p-space-4"
      >
        <span class="h-[90px] w-[60px] shrink-0 bg-capa-placeholder" />
        <span class="flex flex-1 flex-col gap-space-2">
          <span class="h-[17px] w-[70%] rounded-sm bg-capa-placeholder" />
          <span class="h-[15px] w-[45%] rounded-sm bg-capa-placeholder" />
          <span class="h-[13px] w-[55%] rounded-sm bg-capa-placeholder" />
        </span>
      </li>
    </ul>

    <BannerAviso
      v-else-if="falhou"
      variante="erro"
      triangulo
    >
      Não foi possível carregar suas recomendações. Verifique sua conexão e tente de novo.
      <BotaoTextual
        class="mt-space-2"
        @click="lista.carregar()"
      >
        Tentar de novo
      </BotaoTextual>
    </BannerAviso>

    <EstadoVazio
      v-else-if="itens.length === 0"
      :icone="PhPaperPlaneTilt"
      solto
      titulo="Nenhuma recomendação agora"
      class="mx-auto mt-space-12 max-w-[320px] md:mt-space-16"
    >
      <p class="mt-space-6 max-w-[280px] text-body text-grafite">
        Quando um leitor que você segue e que segue você recomendar um livro, ele aparece aqui.
      </p>
      <BotaoPrimario
        class="mt-space-6 w-auto"
        @click="router.push('/descobrir')"
      >
        Voltar para Descobrir
      </BotaoPrimario>
    </EstadoVazio>

    <template v-else>
      <p class="text-caption text-grafite">
        Recomendações saem daqui depois de 90 dias ou quando você põe o livro na estante.
      </p>
      <p
        class="mt-space-4 text-caption text-grafite"
        aria-live="polite"
      >
        <span class="font-mono">{{ total }}</span>
        {{ total === 1 ? 'recomendação' : 'recomendações' }}
      </p>
      <ul class="mt-space-2 divide-y divide-linha md:mt-space-4 md:grid md:grid-cols-2 md:gap-space-5 md:divide-y-0">
        <li
          v-for="recomendacao in itens"
          :key="recomendacao.id"
          class="py-space-4 transition-opacity duration-dur-base md:rounded-base md:p-space-4 md:transition-colors md:hover:bg-papel-elevado"
          :class="descartando.includes(recomendacao.id) ? 'pointer-events-none opacity-50' : ''"
        >
          <ItemRecomendacao
            :recomendacao="recomendacao"
            completa
          >
            <template #acoes>
              <button
                type="button"
                class="-mr-space-3 -mt-space-3 flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-grafite hover:bg-linha md:-mr-space-1 md:-mt-space-1 md:size-8"
                :aria-label="`Mais ações para ${recomendacao.livro.titulo}, recomendado por ${recomendacao.remetente.nomeExibicao}`"
                @click="abrirMenu(recomendacao, $event)"
              >
                <PhDotsThree
                  :size="20"
                  weight="regular"
                  aria-hidden="true"
                />
              </button>
            </template>
          </ItemRecomendacao>
        </li>
      </ul>
      <FimDaLista
        v-if="temMais || falhouMais || carregandoMais"
        :falhou="falhouMais"
        :carregando="carregandoMais"
        @carregar="lista.carregarMais()"
      />
      <p
        v-else
        class="mt-space-6 text-center text-caption text-grafite-suave"
      >
        Essas são todas as suas recomendações.
      </p>
    </template>

    <MenuDeAcoes
      ref="menu"
      :rotulo="daVez ? `${daVez.livro.titulo}, ${daVez.remetente.nomeExibicao} te recomendou` : 'Recomendação'"
      :acoes="acoes"
      :largura="280"
      @escolher="escolher"
    />
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
