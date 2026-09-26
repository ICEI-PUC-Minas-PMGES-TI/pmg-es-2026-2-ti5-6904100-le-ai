import { ErroDeValidacao } from '../../common/erros-de-negocio';

/**
 * Cursor keyset das resenhas: `(criado_em, resenha_id)` em base64url, opaco
 * para o cliente.
 *
 * O `criado_em` vai como o **texto do Postgres**, com microssegundos. `Date` e
 * `toISOString()` param no milissegundo, e duas resenhas criadas no mesmo
 * milissegundo fariam a página seguinte pular uma delas.
 */
export interface PosicaoDaResenha {
  criadoEm: string;
  id: string;
}

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function codificarCursor(posicao: PosicaoDaResenha): string {
  return Buffer.from(
    JSON.stringify({ c: posicao.criadoEm, i: posicao.id }),
  ).toString('base64url');
}

/** Cursor que não veio de uma página anterior é 400 no campo `cursor`. */
export function decodificarCursor(cursor: string): PosicaoDaResenha {
  try {
    const bruto = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as { c?: unknown; i?: unknown };
    if (
      typeof bruto.c === 'string' &&
      INSTANTE.test(bruto.c) &&
      typeof bruto.i === 'string' &&
      UUID.test(bruto.i)
    ) {
      return { criadoEm: bruto.c, id: bruto.i };
    }
  } catch {
    // Cai no mesmo 400 do formato inesperado.
  }
  throw new ErroDeValidacao([
    {
      campo: 'cursor',
      mensagem: 'Cursor inválido. Recomece pela primeira página.',
    },
  ]);
}
