import type { LivroOficialResumo, PaginaLivros } from '../services/acervo'

/** Massa dos testes da busca, no formato de `docs/api/acervo.yaml`. */
export function livro(
  id: string,
  titulo: string,
  extras: Partial<LivroOficialResumo> = {},
): LivroOficialResumo {
  return {
    id,
    titulo,
    autores: [{ id: 'evaristo', nome: 'Conceição Evaristo' }],
    editora: 'Pallas',
    anoPublicacao: 2003,
    paginas: 128,
    capa: { url: null, origem: 'placeholder' },
    assuntos: [],
    ...extras,
  }
}

export function pagina(
  itens: LivroOficialResumo[],
  extras: Partial<Omit<PaginaLivros, 'itens'>> = {},
): PaginaLivros {
  return { itens, page: 1, limit: 20, totalItens: itens.length, totalPaginas: 1, ...extras }
}

export const ASSUNTOS = [
  { id: 'romance', nome: 'Romance' },
  { id: 'conto', nome: 'Conto' },
  { id: 'terror', nome: 'Terror' },
]
