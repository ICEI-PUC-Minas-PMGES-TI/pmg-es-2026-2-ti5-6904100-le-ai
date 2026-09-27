import { ref, shallowRef } from 'vue'

import { usePaginacao } from '../perfil/usePaginacao'
import { ApiError } from '../services/api'
import type { FiltroEstante, ItemEstante, PaginaEstante, TotaisEstante } from '../services/leitura'

export type ItemDaListaEstante = ItemEstante & { id: string }

export type FiltroDaListaEstante = Pick<FiltroEstante, 'status' | 'ordenacao'>

const PROIBIDO = 403
const NAO_ENCONTRADO = 404

export function useEstante(
  listar: (filtro: FiltroEstante) => Promise<PaginaEstante>,
  filtro: () => FiltroDaListaEstante = () => ({}),
) {
  const totais = shallowRef<TotaisEstante | null>(null)
  const restrita = ref(false)
  const indisponivel = ref(false)

  const lista = usePaginacao<ItemDaListaEstante>(async (pagina) => {
    try {
      const resposta = await listar({ ...filtro(), page: pagina + 1 })
      totais.value = resposta.totaisPorStatus
      restrita.value = false
      indisponivel.value = false
      return {
        items: resposta.itens.map((item) => ({ ...item, id: item.livroId })),
        page: pagina,
        size: resposta.paginacao.limite,
        totalElements: resposta.paginacao.totalItens,
        totalPages: resposta.paginacao.totalPaginas,
      }
    } catch (erro) {
      restrita.value = erro instanceof ApiError && erro.status === PROIBIDO
      indisponivel.value = erro instanceof ApiError && erro.status === NAO_ENCONTRADO
      throw erro
    }
  })

  return { ...lista, totais, restrita, indisponivel }
}
