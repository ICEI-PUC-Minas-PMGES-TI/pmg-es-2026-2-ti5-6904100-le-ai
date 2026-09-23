<script setup lang="ts">
import { PhCheckCircle } from '@phosphor-icons/vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CardLivroConfirmacao from '../../components/livros/CardLivroConfirmacao.vue'
import CartaoProgresso from '../../components/livros/CartaoProgresso.vue'
import BannerAviso from '../../components/ui/BannerAviso.vue'
import BotaoPrimario from '../../components/ui/BotaoPrimario.vue'
import BotaoTextual from '../../components/ui/BotaoTextual.vue'
import CampoTexto from '../../components/ui/CampoTexto.vue'
import FaixaInformativa from '../../components/ui/FaixaInformativa.vue'
import { digitosDoIsbn } from '../../livros/isbn'
import { useCadastroIsbn } from '../../livros/useCadastroIsbn'

/**
 * Cadastro por ISBN (RF-ACV-05, RF-ACV-07). Estrutura e copy de
 * docs/design/periodo-1/F-ACV-CADASTRO/cadastro-por-isbn.md §4, §5 e §8. Na web, coluna central
 * de 640px; abaixo de 768px a coluna ocupa a largura e o botão volta à largura total.
 *
 * O acompanhamento acontece nesta tela, no lugar do cartão de progresso (§10); só o
 * `nao_encontrado` troca de rota, porque ele negocia outro caminho (isbn-nao-encontrado.md §1).
 */
const route = useRoute()
const router = useRouter()
const cadastro = useCadastroIsbn()
const { fase, lento, coldStart, livroId, isbn, mensagemDoServidor } = cadastro

const origem = computed(() => String(route.params.origem ?? 'descobrir'))
const digitado = ref(typeof route.query.isbn === 'string' ? route.query.isbn : '')

const buscando = computed(() => fase.value === 'buscando')
const comLivro = computed(() => fase.value === 'encontrado' || fase.value === 'duplicata')
const podeBuscar = computed(() => digitosDoIsbn(digitado.value).length === 13 && !buscando.value)
const mostraBuscar = computed(() => !comLivro.value && fase.value !== 'indisponivel')

const linhaDoCartao = computed(() => {
  if (coldStart.value) {
    return 'O serviço está iniciando. Isso pode levar alguns segundos.'
  }
  if (lento.value) {
    return 'Ainda procurando. As fontes externas estão lentas agora.'
  }
  return 'Procurando em nossas fontes. Isso pode levar alguns segundos.'
})

watch(digitado, () => cadastro.campoAlterado())

watch(fase, (nova) => {
  if (nova === 'naoEncontrado') {
    // `replace`: a seta de voltar da tela seguinte leva à origem, não de volta a esta espera.
    void router.replace({
      name: 'isbn-nao-encontrado',
      params: { origem: origem.value },
      query: { isbn: isbn.value ?? undefined, digitado: digitado.value || undefined },
    })
  }
})

function buscar(): void {
  if (podeBuscar.value) {
    void cadastro.buscar(digitado.value)
  }
}

function cadastrarOutro(): void {
  digitado.value = ''
  cadastro.recomecar()
}

function abrirLivro(): void {
  if (livroId.value) {
    void router.push({ name: 'livro-oficial', params: { id: livroId.value }, query: { origem: origem.value } })
  }
}

function cadastrarPessoal(): void {
  void router.push({ name: 'livro-pessoal-novo', params: { origem: origem.value } })
}
</script>

<template>
  <div class="mx-auto w-full max-w-[640px] pb-space-12 pt-space-6">
    <p class="text-body text-grafite">
      Informe o ISBN de 13 dígitos impresso no livro, geralmente perto do código de barras.
    </p>

    <form
      novalidate
      class="mt-space-6"
      @submit.prevent="buscar"
    >
      <CampoTexto
        v-model="digitado"
        label="ISBN"
        placeholder="978-85-359-1484-9"
        inputmode="numeric"
        autocomplete="off"
        mono
        :somente-leitura="buscando || comLivro"
        :helper="fase === 'invalido' ? undefined : 'Só o ISBN. Links e títulos não funcionam aqui.'"
        :erro="fase === 'invalido' ? 'Esse ISBN não confere. Verifique os 13 dígitos impressos no livro.' : undefined"
      />
      <BotaoPrimario
        v-if="mostraBuscar"
        tipo="submit"
        class="mt-space-6 md:w-auto md:px-space-8 md:hover:bg-musgo-vivo"
        :disabled="!podeBuscar || fase === 'invalido'"
        :carregando="buscando"
      >
        {{ buscando ? 'Buscando' : 'Buscar livro' }}
      </BotaoPrimario>
    </form>

    <!-- Região viva: o desfecho é anunciado sem o foco saltar para ele (§9). -->
    <div
      aria-live="polite"
      class="mt-space-5"
    >
      <CartaoProgresso
        v-if="buscando"
        :mensagem="linhaDoCartao"
      />

      <template v-else-if="comLivro">
        <p
          v-if="fase === 'encontrado'"
          class="flex items-center gap-space-2 text-body-strong text-musgo"
        >
          <PhCheckCircle
            :size="20"
            weight="fill"
            aria-hidden="true"
          />
          Livro adicionado ao acervo.
        </p>
        <FaixaInformativa v-else>
          Este livro já está no acervo.
        </FaixaInformativa>
        <CardLivroConfirmacao
          class="mt-space-4"
          :isbn="isbn"
        />
        <div class="mt-space-5 flex flex-col items-center gap-space-3 md:flex-row md:gap-space-4">
          <BotaoPrimario
            class="md:w-auto md:px-space-8 md:hover:bg-musgo-vivo"
            @click="abrirLivro"
          >
            Abrir página do livro
          </BotaoPrimario>
          <BotaoTextual
            class="min-h-12 md:min-h-10"
            @click="cadastrarOutro"
          >
            Cadastrar outro ISBN
          </BotaoTextual>
        </div>
      </template>

      <template v-else-if="fase === 'indisponivel'">
        <BannerAviso variante="alerta">
          Não conseguimos consultar nossas fontes agora. Seu pedido foi guardado.
        </BannerAviso>
        <div class="mt-space-4 flex flex-col items-center gap-space-3 md:flex-row md:gap-space-4">
          <BotaoPrimario
            class="md:w-auto md:px-space-8 md:hover:bg-musgo-vivo"
            @click="cadastro.tentarDeNovo()"
          >
            Tentar de novo
          </BotaoPrimario>
          <BotaoTextual
            class="min-h-12 md:min-h-10"
            @click="cadastrarPessoal"
          >
            Cadastrar livro pessoal
          </BotaoTextual>
        </div>
      </template>

      <BannerAviso
        v-else-if="fase === 'limitado'"
        variante="alerta"
      >
        {{ mensagemDoServidor ?? 'Muitas requisições em pouco tempo. Tente novamente em instantes.' }}
      </BannerAviso>

      <BannerAviso
        v-else-if="fase === 'semConexao'"
        variante="erro"
      >
        {{ mensagemDoServidor ?? 'Não foi possível acessar o servidor. Tente novamente.' }}
      </BannerAviso>
    </div>

    <div class="mt-space-8 border-t border-linha pt-space-6">
      <p class="text-caption text-grafite">
        Não tem o ISBN em mãos?
      </p>
      <BotaoTextual
        class="mt-space-1 min-h-12 md:min-h-10"
        @click="cadastrarPessoal"
      >
        Cadastrar livro pessoal
      </BotaoTextual>
    </div>
  </div>
</template>
