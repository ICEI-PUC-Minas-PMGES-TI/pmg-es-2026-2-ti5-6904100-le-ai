import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import type { Tx } from '../../db/tipos';
import type { LinhaDaDistribuicao } from '../notas/notas-da-pagina';
import { COLUNAS_DO_RESUMO, LinhaDeLivroEncontrado } from './busca.repository';

export type StatusDaSinopse =
  | 'nao_consultada'
  | 'pendente'
  | 'disponivel'
  | 'ausente'
  | 'falha_transitoria';

export interface LinhaDoLivroOficial extends LinhaDeLivroEncontrado {
  isbn: string;
  /** Links da ficha às páginas de editora e série (F-ACV-DESCOBERTA). */
  editoraId: string | null;
  serieId: string | null;
  serieNome: string | null;
  sinopse: string | null;
  sinopseStatus: StatusDaSinopse;
  /** Nota geral da fonte externa (RF-ACV-15): as duas nulas ou as duas preenchidas. */
  notaGeral: string | null;
  notaGeralQtd: number | null;
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
        l.editora_id AS "editoraId",
        sr.id AS "serieId",
        sr.nome AS "serieNome",
        l.sinopse,
        l.sinopse_status AS "sinopseStatus",
        l.nota_geral AS "notaGeral",
        l.nota_geral_qtd AS "notaGeralQtd",
        ${SINOPSE_A_BUSCAR} AS "deveBuscarSinopse"
      FROM acervo.livro l
      LEFT JOIN acervo.editora ed ON ed.id = l.editora_id
      LEFT JOIN acervo.serie sr ON sr.id = l.serie_id
      WHERE l.id = ${id} AND l.tipo = 'oficial' AND l.ativo
    `);
    return (rows[0] as unknown as LinhaDoLivroOficial | undefined) ?? null;
  }

  /**
   * Distribuição da nota dos leitores (RF-ACV-04) numa consulta só sobre a
   * projeção individual: uma linha por valor, com o total e a média do livro.
   * A média sai arredondada a 1 casa aqui, sobre os valores individuais, e não
   * a partir da `nota_livro_agregada` (já arredondada a 2 casas): assim não há
   * arredondamento duplo, e a contagem sempre bate com a soma das faixas.
   */
  async notasDosLeitores(livroId: string): Promise<LinhaDaDistribuicao[]> {
    const { rows } = await this.db.execute<Record<string, unknown>>(sql`
      SELECT valor,
             count(*)::int AS quantidade,
             sum(count(*)) OVER ()::int AS total,
             round(sum(valor * count(*)) OVER () / sum(count(*)) OVER (), 1) AS media
        FROM acervo.nota_leitor_projecao
       WHERE livro_id = ${livroId}
       GROUP BY valor
    `);
    return rows as unknown as LinhaDaDistribuicao[];
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
