import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { novaChaveIdempotencia } from '../services/api'
import { socialService, type RecomendacaoRecebida } from '../services/social'

export const ACAO_VER_PERFIL = 'perfil'
export const ACAO_DESCARTAR = 'descartar'

export interface AvisoDoDescarte {
  texto: string
  /** Recomendação cujo descarte falhou: o aviso oferece tentar de novo. */
  falhou?: RecomendacaoRecebida
}

/** Descarte individual (RF-REC-15) e ver o perfil de quem recomendou, iguais na seção e na lista. */
export function useDescarteDeRecomendacao(aoDescartar: (id: string) => void) {
  const router = useRouter()
  const descartando = ref<string[]>([])
  const aviso = ref<AvisoDoDescarte | null>(null)
  const chaves = new Map<string, string>()

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
      aoDescartar(id)
      aviso.value = { texto: 'Recomendação descartada.' }
    } catch {
      aviso.value = {
        texto: 'Não foi possível descartar a recomendação. Verifique sua conexão e tente de novo.',
        falhou: recomendacao,
      }
    } finally {
      descartando.value = descartando.value.filter((outro) => outro !== id)
    }
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

  return { descartando, aviso, escolher, tentarDeNovo }
}
