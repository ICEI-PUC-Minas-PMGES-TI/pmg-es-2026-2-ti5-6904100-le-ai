import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Tx } from '../../db/tipos';

/**
 * Primeira chave do `pg_advisory_xact_lock` da nota dos leitores ("NOTA" em
 * ASCII). A segunda é `hashtext(livroId)`: a trava é por livro, sem disputar a
 * linha de `acervo.livro` com o consumidor da sinopse, que a segura enquanto
 * consulta as fontes.
 */
export const CLASSE_DA_TRAVA_DE_NOTA = 0x4e4f5441;

type Linhas<T> = { rows: T[] };

/** O que `sincronizarLivro` mudou na projeção, para o backfill mostrar. */
export interface MudancasNaProjecao {
  gravadas: number;
  apagadas: number;
}

/**
 * Projeção da nota dos leitores (RF-ACV-16, RNF-ARQ-06): `nota_leitor_projecao`
 * por usuário e livro e o agregado `nota_livro_agregada`, que é contrato da
 * F-CONTA-2.
 *
 * Todo caminho que escreve aqui passa pela mesma trava por livro: o consumidor
 * de `nota.alterada`, o backfill e o consumidor de `conta.excluida`. Com ela,
 * reler a VIEW e gravar viram uma coisa só, e duas escritas no mesmo livro se
 * serializam e convergem para o estado atual de `v_nota_publicacao_v1`.
 *
 * Quem trava vários livros trava na ordem das chaves, sempre a mesma, e assim
 * não há deadlock entre a exclusão de conta e o consumidor de notas. A ordem é
 * pela chave da trava, e não pelo id, para duas chaves iguais (colisão do
 * `hashtext`) não inverterem a ordem entre transações.
 */
@Injectable()
export class NotaDosLeitoresRepository {
  async travar(tx: Tx, livroIds: readonly string[]): Promise<void> {
    if (livroIds.length === 0) return;
    const valores = sql.join(
      livroIds.map((id) => sql`(${id})`),
      sql`, `,
    );
    const { rows } = (await tx.execute(sql`
      SELECT DISTINCT hashtext(v.id) AS chave
        FROM (VALUES ${valores}) AS v(id)
       ORDER BY chave
    `)) as unknown as Linhas<{ chave: number }>;
    for (const { chave } of rows) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(${CLASSE_DA_TRAVA_DE_NOTA}, ${chave})`,
      );
    }
  }

  /**
   * Leva a nota de um leitor num livro ao estado atual da VIEW: com a linha,
   * upsert; sem ela, apaga. O valor do evento não importa, então entrega
   * repetida e fora de ordem convergem. Livro pessoal ou inexistente não tem
   * nota dos leitores (RN-06.5): devolve `false` sem efeito.
   */
  async sincronizar(
    tx: Tx,
    usuarioId: string,
    livroId: string,
  ): Promise<boolean> {
    await this.travar(tx, [livroId]);
    if (!(await this.ehOficial(tx, livroId))) return false;

    const atual = (await tx.execute(sql`
      SELECT valor
        FROM leitura.v_nota_publicacao_v1
       WHERE usuario_id = ${usuarioId} AND livro_id = ${livroId}
    `)) as unknown as Linhas<{ valor: string }>;
    const linha = atual.rows[0];
    if (linha) {
      await tx.execute(sql`
        INSERT INTO acervo.nota_leitor_projecao (usuario_id, livro_id, valor)
        VALUES (${usuarioId}, ${livroId}, ${linha.valor})
        ON CONFLICT (usuario_id, livro_id) DO UPDATE
           SET valor = EXCLUDED.valor, atualizado_em = now()
         WHERE acervo.nota_leitor_projecao.valor IS DISTINCT FROM EXCLUDED.valor
      `);
    } else {
      await tx.execute(sql`
        DELETE FROM acervo.nota_leitor_projecao
         WHERE usuario_id = ${usuarioId} AND livro_id = ${livroId}
      `);
    }
    await this.recalcular(tx, [livroId]);
    return true;
  }

  /**
   * Reconcilia todos os leitores de um livro com a VIEW, para o backfill:
   * grava o que falta ou mudou e apaga o que saiu. Livro que não é oficial
   * devolve `null`.
   */
  async sincronizarLivro(
    tx: Tx,
    livroId: string,
  ): Promise<MudancasNaProjecao | null> {
    await this.travar(tx, [livroId]);
    if (!(await this.ehOficial(tx, livroId))) return null;

    const apagadas = (await tx.execute(sql`
      DELETE FROM acervo.nota_leitor_projecao p
       WHERE p.livro_id = ${livroId}
         AND NOT EXISTS (
           SELECT 1 FROM leitura.v_nota_publicacao_v1 v
            WHERE v.usuario_id = p.usuario_id AND v.livro_id = p.livro_id
         )
      RETURNING p.usuario_id
    `)) as unknown as Linhas<unknown>;
    const gravadas = (await tx.execute(sql`
      INSERT INTO acervo.nota_leitor_projecao (usuario_id, livro_id, valor)
      SELECT v.usuario_id, v.livro_id, v.valor
        FROM leitura.v_nota_publicacao_v1 v
       WHERE v.livro_id = ${livroId}
      ON CONFLICT (usuario_id, livro_id) DO UPDATE
         SET valor = EXCLUDED.valor, atualizado_em = now()
       WHERE acervo.nota_leitor_projecao.valor IS DISTINCT FROM EXCLUDED.valor
      RETURNING usuario_id
    `)) as unknown as Linhas<unknown>;
    await this.recalcular(tx, [livroId]);
    return { gravadas: gravadas.rows.length, apagadas: apagadas.rows.length };
  }

  /**
   * Recalcula do zero o agregado dos livros, com a trava. Livro sem nenhuma
   * nota fica sem linha, porque o CHECK exige `quantidade > 0`.
   */
  async recalcularAgregados(
    tx: Tx,
    livroIds: readonly string[],
  ): Promise<void> {
    await this.travar(tx, livroIds);
    await this.recalcular(tx, livroIds);
  }

  private async recalcular(tx: Tx, livroIds: readonly string[]): Promise<void> {
    if (livroIds.length === 0) return;
    await tx.execute(sql`
      DELETE FROM acervo.nota_livro_agregada
       WHERE livro_id IN ${livroIds}
    `);
    await tx.execute(sql`
      INSERT INTO acervo.nota_livro_agregada (livro_id, media, quantidade)
      SELECT livro_id, round(avg(valor), 2), count(*)
        FROM acervo.nota_leitor_projecao
       WHERE livro_id IN ${livroIds}
       GROUP BY livro_id
    `);
  }

  private async ehOficial(tx: Tx, livroId: string): Promise<boolean> {
    const { rows } = (await tx.execute(sql`
      SELECT 1 FROM acervo.livro WHERE id = ${livroId} AND tipo = 'oficial'
    `)) as unknown as Linhas<unknown>;
    return rows.length > 0;
  }
}
