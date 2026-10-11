import type { LivroSnapshot, UsuarioSnapshot } from '../avaliacoes/eventos';

/**
 * Contrato do evento produzido por F-AVA-2 (`docs/mensageria/catalogo.md` e
 * `resenha.curtida.v1.schema.json`). O consumidor é a fila de notificações do `social`.
 *
 * Publicado **só na primeira curtida** do par resenha e reator: retirar e recurtir, ou
 * alternar entre curtida e descurtida, não publica de novo. Descurtida nunca publica.
 */
export const RESENHA_CURTIDA = { tipo: 'resenha.curtida', versao: 1 } as const;

/** `data` de `resenha.curtida.v1`: o destinatário é o autor da resenha. */
export interface DadosResenhaCurtida {
  destinatarioId: string;
  resenhaId: string;
  autorAcao: UsuarioSnapshot;
  livro: LivroSnapshot;
}

/** `businessKey`: `resenha:<resenhaId>:curtida:<autorAcaoId>`, a chave semântica do par. */
export function chaveDeNegocioDaResenhaCurtida(
  resenhaId: string,
  autorAcaoId: string,
): string {
  return `resenha:${resenhaId}:curtida:${autorAcaoId}`;
}
