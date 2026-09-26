import type { LivroSnapshot } from '../../leituras/dominio/eventos';

/** `OrdenacaoEstante` do contrato. */
export const ORDENACOES_ESTANTE = [
  'adicionado_desc',
  'adicionado_asc',
  'titulo_asc',
  'titulo_desc',
  'autor_asc',
  'autor_desc',
  'progresso_asc',
  'progresso_desc',
] as const;
export type OrdenacaoEstante = (typeof ORDENACOES_ESTANTE)[number];

export const ORDENACAO_PADRAO: OrdenacaoEstante = 'adicionado_desc';

/** `livro` do `ItemEstante`: o snapshot dos eventos, com autor opcional. */
export type LivroItemEstante = Pick<LivroSnapshot, 'titulo' | 'capaUrl'> & {
  autor: string | null;
};
