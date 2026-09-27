import { computed, ref } from 'vue'

import { novaChaveIdempotencia } from '../services/api'
import { leituraService, type LeituraService, type MinhaAvaliacao } from '../services/leitura'

export type EstadoDaAvaliacao = 'carregando' | 'pronta' | 'erro'

/** O que o painel e o editor mostram do livro: o card compacto (capa, título, autor). */
export interface LivroAvaliado {
  titulo: string
  autor: string | null
  capaUrl: string | null
}

/**
 * Nota e resenha do leitor para um livro (F-AVA), carregadas à parte da página: se o `leitura`
 * estiver lento ou fora, a página abre igual e só o bloco "Sua avaliação" espera ou mostra erro.
 *
 * Uma chave de idempotência por intenção: reenviar a mesma nota depois de um erro repete a chave e
 * não cria uma segunda nota (RNF-ERR-04); trocar o valor é outra intenção. Depois do sucesso a
 * chave é esquecida: dar 4 de novo depois de remover é uma intenção nova, e a chave antiga só
 * repetiria a resposta guardada no servidor, sem gravar nada.
 *
 * O livro vem em `carregar(id)`, como na página: trocar de livro na mesma rota não remonta a view.
 * Uma resposta atrasada do livro anterior é descartada pelo contador de geração.
 */
export function useMinhaAvaliacao(opcoes: { servico?: LeituraService } = {}) {
  const servico = opcoes.servico ?? leituraService

  const estado = ref<EstadoDaAvaliacao>('carregando')
  const avaliacao = ref<MinhaAvaliacao | null>(null)
  let livroId = ''
  let geracao = 0

  const nota = computed(() => avaliacao.value?.nota ?? null)
  const resenha = computed(() => avaliacao.value?.resenha ?? null)

  const chaves = new Map<string, { corpo: string; chave: string }>()
  function chaveDa(intencao: string, corpo: string): string {
    const atual = chaves.get(intencao)
    if (atual?.corpo === corpo) {
      return atual.chave
    }
    const chave = novaChaveIdempotencia()
    chaves.set(intencao, { corpo, chave })
    return chave
  }

  /**
   * Depois de uma escrita: com a avaliação conhecida, atualiza no lugar. Sem ela (a carga falhou
   * ou ainda não voltou), o resto continua desconhecido e vem do servidor — declarar `pronta` com
   * a resenha nula liberaria o editor para sobrescrever uma resenha que existe.
   */
  function aplicar(intencao: string, parcial: Partial<MinhaAvaliacao>): void {
    chaves.delete(intencao)
    if (estado.value === 'pronta' && avaliacao.value) {
      avaliacao.value = { ...avaliacao.value, ...parcial }
    } else {
      void carregar()
    }
  }

  async function carregar(id: string = livroId): Promise<void> {
    if (id !== livroId) {
      livroId = id
      avaliacao.value = null
      chaves.clear()
    }
    const minha = ++geracao
    estado.value = 'carregando'
    try {
      const resposta = await servico.obterMinhaAvaliacao(id)
      if (minha === geracao) {
        avaliacao.value = resposta
        estado.value = 'pronta'
      }
    } catch {
      if (minha === geracao) {
        estado.value = 'erro'
      }
    }
  }

  /** Lança o erro da API para o painel mostrar a mensagem e continuar aberto. */
  async function salvarNota(valor: number): Promise<void> {
    const salva = await servico.salvarNota(livroId, valor, chaveDa('nota', String(valor)))
    aplicar('nota', { nota: salva })
  }

  /** Remove a nota depois da confirmação da tela (RNF-USA-04). A resenha não é afetada. */
  async function removerNota(): Promise<void> {
    await servico.excluirNota(livroId, chaveDa('remocao', nota.value?.atualizadoEm ?? ''))
    aplicar('remocao', { nota: null })
  }

  /** Publica ou salva a resenha. Lança o erro da API para o editor preservar o texto. */
  async function salvarResenha(texto: string, spoiler: boolean): Promise<void> {
    const salva = await servico.salvarResenha(livroId, texto, spoiler, chaveDa('resenha', `${spoiler}|${texto}`))
    aplicar('resenha', { resenha: salva })
  }

  /** Exclui a resenha depois da confirmação irreversível (RNF-USA-04). A nota não é afetada. */
  async function excluirResenha(): Promise<void> {
    await servico.excluirResenha(livroId, chaveDa('exclusao', resenha.value?.id ?? ''))
    aplicar('exclusao', { resenha: null })
  }

  return { estado, avaliacao, nota, resenha, carregar, salvarNota, removerNota, salvarResenha, excluirResenha }
}

export type MinhaAvaliacaoDoLivro = ReturnType<typeof useMinhaAvaliacao>
