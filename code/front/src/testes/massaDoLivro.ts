import type { LivroOficialDetalhe, PaginaResenhas, ResenhaDoLivro } from '../services/acervo'

/** Massa dos testes da página do livro, no formato de `docs/api/acervo.yaml`. */
export function resenha(id: string, nome: string, texto: string, spoiler = false): ResenhaDoLivro {
  return {
    id,
    autorId: `autor-${id}`,
    autorNome: nome,
    autorAvatarUrl: null,
    texto,
    spoiler,
    criadoEm: '2026-08-03T12:00:00.000Z',
    atualizadoEm: '2026-08-03T12:00:00.000Z',
  }
}

export function paginaDeResenhas(itens: ResenhaDoLivro[], proximoCursor: string | null = null): PaginaResenhas {
  return { itens, limit: 10, proximoCursor }
}

export function livroOficial(extras: Partial<LivroOficialDetalhe> = {}): LivroOficialDetalhe {
  return {
    id: 'livro-1',
    titulo: 'Torto Arado',
    autores: [{ id: 'a1', nome: 'Itamar Vieira Junior' }],
    editora: 'Todavia',
    editoraId: null,
    anoPublicacao: 2019,
    paginas: 264,
    capa: { url: null, origem: 'placeholder' },
    assuntos: [],
    serie: null,
    isbn: '9788588808911',
    sinopse: { status: 'disponivel', texto: 'Bibiana e Belonísia crescem no interior da Bahia.' },
    resenhas: paginaDeResenhas([]),
    ...extras,
  }
}
