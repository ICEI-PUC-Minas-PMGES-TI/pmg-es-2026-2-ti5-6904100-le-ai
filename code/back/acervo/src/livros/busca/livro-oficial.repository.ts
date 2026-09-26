import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import type { Tx } from '../../db/tipos';
import { COLUNAS_DO_RESUMO, LinhaDeLivroEncontrado } from './busca.repository';

export type StatusDaSinopse =
  | 'nao_consultada'
  | 'pendente'
  | 'disponivel'
  | 'ausente'
  | 'falha_transitoria';

export interface LinhaDoLivroOficial extends LinhaDeLivroEncontrado {
  isbn: string;
  sinopse: string | null;
  sinopseStatus: StatusDaSinopse;
  /** A abertura desta página deve pedir a sinopse (ver `SINOPSE_A_BUSCAR`). */
  deveBuscarSinopse: boolean;
}

/**
 * Quando uma abertura da página pede a sinopse (RN-19.2):
 *
 * - `nao_consultada`: a primeira abertura;
 * - `falha_transitoria` há mais de 10 minutos: a fonte estava fora do ar, e a
 *   espera evita que cada visita à página martele a fonte;
 * - `pendente` há mais de 15 minutos: resgate do órfão, quando a mensagem se
 *   perdeu ou foi para a DLQ.
 *
 * O relógio é `atualizado_em`, que não tem trigger: toda transição de sinopse (a
 * desta rota e a do consumidor) grava `atualizado_em = now()`.
 */
const SINOPSE_A_BUSCAR = sql`(
  l.sinopse_status = 'nao_consultada'
  OR (l.sinopse_status = 'falha_transitoria'
      AND l.atualizado_em < now() - interval '10 minutes')
  OR (l.sinopse_status = 'pendente'
      AND l.atualizado_em < now() - interval '15 minutes')
)`;

/**
 * Livro oficial da página (RF-ACV-04). Pessoal e inativo ficam de fora pelo
 * predicado literal: a página de livro pessoal é outra rota, com autorização
 * própria (RN-15).
 */
@Injectable()
export class LivroOficialRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async obter(id: string): Promise<LinhaDoLivroOficial | null> {
    const { rows } = await this.db.execute<Record<string, unknown>>(sql`
      SELECT ${COLUNAS_DO_RESUMO},
        l.isbn13 AS isbn,
        l.sinopse,
        l.sinopse_status AS "sinopseStatus",
        ${SINOPSE_A_BUSCAR} AS "deveBuscarSinopse"
      FROM acervo.livro l
      LEFT JOIN acervo.editora ed ON ed.id = l.editora_id
      WHERE l.id = ${id} AND l.tipo = 'oficial' AND l.ativo
    `);
    return (rows[0] as unknown as LinhaDoLivroOficial | undefined) ?? null;
  }

  async existe(id: string): Promise<boolean> {
    const { rows } = await this.db.execute(sql`
      SELECT 1 FROM acervo.livro l
       WHERE l.id = ${id} AND l.tipo = 'oficial' AND l.ativo
    `);
    return rows.length > 0;
  }

  /**
   * Troca a sinopse para `pendente` se ela ainda deve ser buscada, na mesma
   * condição de `SINOPSE_A_BUSCAR`. O UPDATE condicional é o que faz duas
   * aberturas concorrentes gerarem um evento só: a segunda espera o lock da
   * linha, reavalia a condição e não acha mais nada para trocar.
   */
  async marcarSinopsePendente(tx: Tx, id: string): Promise<boolean> {
    const { rows } = await tx.execute(sql`
      UPDATE acervo.livro AS l
         SET sinopse_status = 'pendente', atualizado_em = now()
       WHERE l.id = ${id} AND l.tipo = 'oficial' AND l.ativo
         AND ${SINOPSE_A_BUSCAR}
      RETURNING l.id
    `);
    return rows.length > 0;
  }
}
