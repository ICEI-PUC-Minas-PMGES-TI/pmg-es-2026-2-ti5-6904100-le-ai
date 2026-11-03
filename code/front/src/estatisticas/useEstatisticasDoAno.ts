import { ref, shallowRef } from 'vue'

import { ApiError } from '../services/api'
import type { TotaisEstatistica } from '../services/leitura'

export type EstadoDoBloco = 'carregando' | 'pronto' | 'vazio' | 'falhou' | 'oculto'

export interface ResultadoDoBloco {
  totais: TotaisEstatistica
  /** O leitor não tem o que mostrar no bloco: vira a frase no lugar dos totais. */
  vazio: boolean
}

const PROIBIDO = 403
const NAO_ENCONTRADO = 404

/**
 * Carga do bloco `Estatísticas do ano` de um perfil, independente do resto da
 * página: a falha vira o banner do bloco, nunca o erro da página. Um 403 ou 404
 * do `leitura` (perfil privado sem seguimento, conta ausente) esconde o bloco,
 * porque a página já trata a privacidade e o perfil não encontrado.
 */
export function useEstatisticasDoAno(buscar: () => Promise<ResultadoDoBloco>) {
  const estado = ref<EstadoDoBloco>('carregando')
  const totais = shallowRef<TotaisEstatistica | null>(null)
  let pedido = 0

  async function carregar(): Promise<void> {
    const atual = ++pedido
    estado.value = 'carregando'
    try {
      const resultado = await buscar()
      if (atual !== pedido) return
      totais.value = resultado.totais
      estado.value = resultado.vazio ? 'vazio' : 'pronto'
    } catch (erro) {
      if (atual !== pedido) return
      const escondido = erro instanceof ApiError && (erro.status === PROIBIDO || erro.status === NAO_ENCONTRADO)
      estado.value = escondido ? 'oculto' : 'falhou'
    }
  }

  return { estado, totais, carregar }
}
