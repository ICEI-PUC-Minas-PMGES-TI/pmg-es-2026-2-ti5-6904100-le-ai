import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../db/schema';
import { NotaDosLeitoresRepository } from './nota-dos-leitores.repository';

type Linhas<T> = { rows: T[] };
type Db = NodePgDatabase<typeof schema>;

export interface ContagemDoBackfill {
  livros: number;
  gravadas: number;
  apagadas: number;
}

/**
 * Backfill da nota dos leitores (F-ACV-NOTA): leva `nota_leitor_projecao` e
 * `nota_livro_agregada` ao estado atual de `leitura.v_nota_publicacao_v1`.
 *
 * Um livro por transação, pelo mesmo `sincronizarLivro` e com a mesma trava do
 * consumidor de `nota.alterada`: os dois podem rodar juntos e convergem. Os
 * livros vêm da união dos que estão na VIEW e na projeção, para apagar também o
 * que ficou velho. Idempotente.
 *
 * Roda **depois** de o serviço subir, que cria a fila `leai.acervo.notas`:
 * evento publicado antes de a fila existir se perde, e o backfill o recupera.
 *
 * Uso: `npm run backfill:notas [-- --dry-run]`. O `--dry-run` só conta.
 */

/** Só conta o que o backfill gravaria e apagaria, sem escrever. */
export async function simularBackfillDeNotas(
  db: Db,
): Promise<ContagemDoBackfill> {
  const { rows } = (await db.execute(sql`
    WITH v AS (
      SELECT v.usuario_id, v.livro_id, v.valor
        FROM leitura.v_nota_publicacao_v1 v
        JOIN acervo.livro l ON l.id = v.livro_id AND l.tipo = 'oficial'
    )
    SELECT
      (SELECT count(*) FROM v
        LEFT JOIN acervo.nota_leitor_projecao p USING (usuario_id, livro_id)
        WHERE p.valor IS DISTINCT FROM v.valor)::int AS gravadas,
      (SELECT count(*) FROM acervo.nota_leitor_projecao p
        WHERE NOT EXISTS (SELECT 1 FROM v
                           WHERE v.usuario_id = p.usuario_id
                             AND v.livro_id = p.livro_id))::int AS apagadas,
      (SELECT count(DISTINCT livro_id) FROM v)::int AS livros
  `)) as unknown as Linhas<ContagemDoBackfill>;
  return rows[0];
}

export async function backfillDeNotas(db: Db): Promise<ContagemDoBackfill> {
  const notas = new NotaDosLeitoresRepository();
  const { rows } = (await db.execute(sql`
    SELECT livro_id FROM leitura.v_nota_publicacao_v1
    UNION
    SELECT livro_id FROM acervo.nota_leitor_projecao
    ORDER BY livro_id
  `)) as unknown as Linhas<{ livro_id: string }>;

  const total: ContagemDoBackfill = { livros: 0, gravadas: 0, apagadas: 0 };
  for (const { livro_id } of rows) {
    const mudancas = await db.transaction((tx) =>
      notas.sincronizarLivro(tx, livro_id),
    );
    if (!mudancas) continue;
    total.livros++;
    total.gravadas += mudancas.gravadas;
    total.apagadas += mudancas.apagadas;
  }
  return total;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida.');
  }
  const simular = process.argv.includes('--dry-run');
  const ssl = /sslmode=require|neon\.tech|\.render\.com/i.test(
    connectionString,
  );
  const pool = new Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });
  try {
    const db = drizzle(pool, { schema });
    if (simular) {
      const { livros, gravadas, apagadas } = await simularBackfillDeNotas(db);
      console.log(
        `[dry-run] ${livros} livro(s) oficial(is) com nota; ${gravadas} nota(s) a gravar e ${apagadas} a apagar.`,
      );
      return;
    }
    const { livros, gravadas, apagadas } = await backfillDeNotas(db);
    console.log(
      `Nota dos leitores sincronizada em ${livros} livro(s) oficial(is): ${gravadas} nota(s) gravada(s) e ${apagadas} apagada(s).`,
    );
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Falha no backfill da nota dos leitores:', err);
    process.exit(1);
  });
}
