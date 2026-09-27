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
