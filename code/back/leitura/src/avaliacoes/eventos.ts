/**
 * Contratos dos eventos produzidos por F-AVA. Os valores vêm do catálogo
 * canônico (`docs/mensageria/catalogo.md`) e dos schemas versionados; não são
 * escolha desta implementação. `outbox_leitura.payload` guarda só o `data`: o
 * envelope é montado pelo despachante de P0-MSG.
 */

/**
 * Publicado sem consumidor no Período 1, de propósito: F-ACV-NOTA faz backfill
 * de `v_nota_publicacao_v1` antes de ligar a fila (catálogo, "consumidor
 * futuro").
 */
export const NOTA_ALTERADA = { tipo: 'nota.alterada', versao: 1 } as const;

export type OperacaoDaNota = 'criada' | 'atualizada' | 'excluida';

/** `data` de `nota.alterada.v1`: `nota` é nula somente na exclusão. */
export interface DadosNotaAlterada {
  usuarioId: string;
  livroId: string;
  operacao: OperacaoDaNota;
  nota: number | null;
}

/** `businessKey`: `nota:<usuarioId>:<livroId>`. Não é única: identifica o fato. */
export function chaveDeNegocioDaNota(
  usuarioId: string,
  livroId: string,
): string {
  return `nota:${usuarioId}:${livroId}`;
}

/**
 * Publicado **só na criação** (`atualizacao=false`): editar não gera atividade nova no feed. O
 * consumidor é F-FEED, na fila `leai.social.feed`.
 */
export const RESENHA_PUBLICADA = {
  tipo: 'resenha.publicada',
  versao: 1,
} as const;

/** Publicado na exclusão física. F-FEED remove a atividade e suas interações. */
export const RESENHA_EXCLUIDA = {
  tipo: 'resenha.excluida',
  versao: 1,
} as const;

/** `UsuarioSnapshot` do `common-v1`: os dados do autor no instante do fato. */
export interface UsuarioSnapshot {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** `LivroSnapshot` do `common-v1`. `autor` é `null` em livro oficial sem autor. */
export interface LivroSnapshot {
  id: string;
  tipo: 'oficial' | 'pessoal';
  titulo: string;
  autor: string | null;
  capaUrl: string | null;
}

/** `data` de `resenha.publicada.v1`: sem texto nem spoiler, que o feed não guarda. */
export interface DadosResenhaPublicada {
  usuarioId: string;
  resenhaId: string;
  livroId: string;
  atualizacao: false;
  usuario: UsuarioSnapshot;
  livro: LivroSnapshot;
}

/** `data` de `resenha.excluida.v1`. */
export interface DadosResenhaExcluida {
  usuarioId: string;
  resenhaId: string;
  livroId: string;
}

export function chaveDeNegocioDaResenhaPublicada(resenhaId: string): string {
  return `resenha:${resenhaId}:publicada`;
}

export function chaveDeNegocioDaResenhaExcluida(resenhaId: string): string {
  return `resenha:${resenhaId}:excluida`;
}
