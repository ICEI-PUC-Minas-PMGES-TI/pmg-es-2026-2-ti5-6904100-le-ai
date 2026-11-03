import { shallowRef } from 'vue'

import { usePaginacao } from '../perfil/usePaginacao'
import type { FiltroHistorico, LeituraService, OcorrenciaHistorico, PaginaHistorico } from '../services/leitura'

export type OcorrenciaDaLista = OcorrenciaHistorico & { id: string }

export function useHistorico(
  listar: LeituraService['listarHistorico'],
  filtro: () => Pick<FiltroHistorico, 'ano' | 'q'>,
) {
  const anos = shallowRef<PaginaHistorico['anos']>([])
  const totais = shallowRef<PaginaHistorico['totais'] | null>(null)

  const lista = usePaginacao<OcorrenciaDaLista>(async (pagina) => {
    const resposta = await listar({ ...filtro(), page: pagina + 1 })
    anos.value = resposta.anos
    totais.value = resposta.totais
    return {
      items: resposta.itens.map((item) => ({ ...item, id: item.leituraId })),
      page: pagina,
      size: resposta.paginacao.limite,
      totalElements: resposta.paginacao.totalItens,
      totalPages: resposta.paginacao.totalPaginas,
    }
  })

  return { ...lista, anos, totais }
}
