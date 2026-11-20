import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { novaChaveIdempotencia } from '../services/api'
import { socialService, type LivroSnapshot, type RecomendacaoRecebida } from '../services/social'
import { recusarPergunta, registrarDescarte } from './sessaoDoDescarteEmLote'

export const ACAO_VER_PERFIL = 'perfil'
export const ACAO_DESCARTAR = 'descartar'

export interface AvisoDoDescarte {
  texto: string
  /** Recomendação cujo descarte falhou: o aviso oferece tentar de novo. */
  falhou?: RecomendacaoRecebida
}

/** Pergunta de descarte em lote aberta (RN-22.12): o livro e quantas recomendações dele restam. */
export interface PerguntaDeLote {
  livro: LivroSnapshot
  restantes: number
}

export interface OpcoesDoDescarteEmLote {
  /** Tira da lista todas as recomendações do livro, depois que o servidor confirmou o lote. */
  aoRemoverDoLivro: (livroId: string) => void
}

export function textoDoLote(removidas: number, titulo: string): string {
  return removidas === 1
    ? `1 recomendação de ${titulo} descartada.`
    : `${removidas} recomendações de ${titulo} descartadas.`
}

/**
 * Descarte individual (RF-REC-15) e ver o perfil de quem recomendou, iguais na seção e na lista.
 *
 * Todo descarte confirmado conta para a pergunta de descarte em lote (F-REC-ALG), mas só quem
 * passa `lote` a faz: a pergunta é da tela `Recomendações recebidas`, não da seção do Descobrir
 * (descobrir.md do Período 3, §10). No terceiro descarte do mesmo livro, sem recusa anterior, a
 * tela pergunta ao servidor quantas restam e, havendo alguma, abre a pergunta no lugar do toast.
 * Se essa consulta falhar, o descarte já valeu e o toast de sempre aparece.
 */
export function useDescarteDeRecomendacao(aoDescartar: (id: string) => void, lote?: OpcoesDoDescarteEmLote) {
  const router = useRouter()
  const descartando = ref<string[]>([])
  const aviso = ref<AvisoDoDescarte | null>(null)
  const chaves = new Map<string, string>()

  const pergunta = ref<PerguntaDeLote | null>(null)
  const removendo = ref(false)
  const erroDoLote = ref(false)
  const chavesDoLote = new Map<string, string>()

  async function abrirPerguntaSeCouber(livro: LivroSnapshot): Promise<boolean> {
    if (!lote || !registrarDescarte(livro.id)) {
      return false
    }
    try {
      const restantes = await socialService.contarRestantesDoLivro(livro.id)
      if (restantes > 0) {
        erroDoLote.value = false
        pergunta.value = { livro, restantes }
        return true
      }
    } catch {
      // A pergunta é conveniência: sem a contagem, fica o descarte individual que já valeu.
    }
    return false
  }

  async function descartar(recomendacao: RecomendacaoRecebida): Promise<void> {
    const { id } = recomendacao
    if (descartando.value.includes(id)) {
      return
    }
    const chave = chaves.get(id) ?? novaChaveIdempotencia()
    chaves.set(id, chave)
    descartando.value = [...descartando.value, id]
    let confirmado = false
    try {
      await socialService.descartarRecomendacao(id, chave)
      confirmado = true
    } catch {
      aviso.value = {
        texto: 'Não foi possível descartar a recomendação. Verifique sua conexão e tente de novo.',
        falhou: recomendacao,
      }
    } finally {
      descartando.value = descartando.value.filter((outro) => outro !== id)
    }
    if (!confirmado) {
      return
    }
    // O mesmo descarte repetido depois de uma falha conta uma vez só: só chega aqui o que o
    // servidor confirmou, e a chave da intenção sai junto.
    chaves.delete(id)
    aoDescartar(id)
    if (!lote) {
      registrarDescarte(recomendacao.livro.id)
    }
    if (await abrirPerguntaSeCouber(recomendacao.livro)) {
      aviso.value = null
      return
    }
    aviso.value = { texto: 'Recomendação descartada.' }
  }

  function escolher(acao: string, recomendacao: RecomendacaoRecebida): void {
    if (acao === ACAO_VER_PERFIL) {
      void router.push(`/leitores/${recomendacao.remetente.username}`)
    } else {
      void descartar(recomendacao)
    }
  }

  function tentarDeNovo(): void {
    const recomendacao = aviso.value?.falhou
    aviso.value = null
    if (recomendacao) {
      void descartar(recomendacao)
    }
  }

  /** `Remover todas`: um pedido só, tudo ou nada; a falha deixa a pergunta aberta com o banner. */
  async function removerTodas(): Promise<void> {
    const atual = pergunta.value
    if (!atual || !lote || removendo.value) {
      return
    }
    const livroId = atual.livro.id
    const chave = chavesDoLote.get(livroId) ?? novaChaveIdempotencia()
    chavesDoLote.set(livroId, chave)
    removendo.value = true
    erroDoLote.value = false
    try {
      const removidas = await socialService.descartarRecomendacoesDoLivro(livroId, chave)
      chavesDoLote.delete(livroId)
      pergunta.value = null
      lote.aoRemoverDoLivro(livroId)
      aviso.value = removidas > 0 ? { texto: textoDoLote(removidas, atual.livro.titulo) } : null
    } catch {
      erroDoLote.value = true
    } finally {
      removendo.value = false
    }
  }

  /** `Agora não`, `Esc` ou clique fora: recusa, e a pergunta não volta para o livro na sessão. */
  function recusar(): void {
    if (!pergunta.value || removendo.value) {
      return
    }
    recusarPergunta(pergunta.value.livro.id)
    pergunta.value = null
    erroDoLote.value = false
  }

  return { descartando, aviso, escolher, tentarDeNovo, pergunta, removendo, erroDoLote, removerTodas, recusar }
}
