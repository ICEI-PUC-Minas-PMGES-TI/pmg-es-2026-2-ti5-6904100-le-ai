import { usePaginacao } from '../perfil/usePaginacao'
import type { LeituraService } from '../services/leitura'
import type { ItemDoCard } from './itemDoCard'

export type ItemFavoritoDaGrade = ItemDoCard & { id: string; livroId: string }

export function useFavoritosDaEstante(listar: LeituraService['listarFavoritos'], busca: () => string | undefined) {
  return usePaginacao<ItemFavoritoDaGrade>(async (pagina) => {
    const resposta = await listar({ q: busca(), page: pagina + 1 })
    return {
      items: resposta.itens.map(({ livro, status }) => ({
        id: livro.id,
        livroId: livro.id,
        livro: { titulo: livro.titulo, autor: livro.autor, capaUrl: livro.capaUrl },
        status,
        favorito: true,
      })),
      page: pagina,
      size: resposta.paginacao.limite,
      totalElements: resposta.paginacao.totalItens,
      totalPages: resposta.paginacao.totalPaginas,
    }
  })
}
