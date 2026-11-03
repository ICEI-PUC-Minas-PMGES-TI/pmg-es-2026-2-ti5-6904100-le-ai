import type { ItemEstante, StatusEstante } from '../services/leitura'

export type ItemDoCard = Pick<ItemEstante, 'livroId' | 'livro' | 'favorito' | 'paginaAtual' | 'totalPaginas' | 'percentualConcluido'> & {
  status: StatusEstante | null
  vezesLido?: number
}
