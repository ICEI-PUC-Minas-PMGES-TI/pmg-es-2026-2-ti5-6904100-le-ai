import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { validateEnv } from '../../config/env';
import * as schema from '../../db/schema';
import type { CacheDeCapas } from './cache-de-capas.service';
import { criarCacheDeCapas } from './criar-cache-de-capas';

type Linhas<T> = { rows: T[] };
type Db = NodePgDatabase<typeof schema>;

export interface ContagemDoBackfillDeCapas {
  livros: number;
  cacheadas: number;
  bytes: number;
  ausentes: number;
  recusadas: number;
  indisponiveis: number;
}

/**
 * Backfill do cache de capas oficiais (F-ACV-NOTA, RF-ACV-17, RN-14): os livros
 * oficiais distintos de `leitura.v_estante_publica_v1` que ainda não têm cópia
 * própria, um por vez, pelo mesmo `cachear` do consumidor e com uma pausa entre
 * eles, para não martelar a origem.
 *
 * Idempotente: livro já cacheado sai da lista. Rodar de novo substitui o
 * redrive da DLQ. Roda **depois** de o serviço subir em cada ambiente, que cria
 * a fila `leai.acervo.capas`.
 *
 * Uso: `npm run backfill:capas [-- --dry-run]`. O `--dry-run` só conta.
 */

/** Livros oficiais em alguma estante e ainda sem cópia própria. */
export async function livrosSemCopia(db: Db): Promise<string[]> {
  const { rows } = (await db.execute(sql`
    SELECT DISTINCT e.livro_id
      FROM leitura.v_estante_publica_v1 e
      JOIN acervo.livro l ON l.id = e.livro_id
     WHERE l.tipo = 'oficial' AND l.capa_url_propria IS NULL
     ORDER BY e.livro_id
  `)) as unknown as Linhas<{ livro_id: string }>;
  return rows.map((linha) => linha.livro_id);
}

export async function backfillDeCapas(
  db: Db,
  cache: CacheDeCapas,
  pausaMs = 1_000,
): Promise<ContagemDoBackfillDeCapas> {
  const livros = await livrosSemCopia(db);
  const total: ContagemDoBackfillDeCapas = {
    livros: livros.length,
    cacheadas: 0,
    bytes: 0,
    ausentes: 0,
    recusadas: 0,
    indisponiveis: 0,
  };
  for (const [indice, livroId] of livros.entries()) {
    if (indice > 0) await new Promise((r) => setTimeout(r, pausaMs));
    try {
      const desfecho = await db.transaction((tx) => cache.cachear(tx, livroId));
      if (desfecho.tipo === 'cacheada') {
        total.cacheadas++;
        total.bytes += desfecho.bytes;
      } else if (desfecho.tipo === 'ausente') {
        total.ausentes++;
      } else if (desfecho.tipo === 'recusada') {
        total.recusadas++;
      }
    } catch (erro) {
      // Indisponível agora: fica para a próxima rodada.
      total.indisponiveis++;
      console.warn(
        `Capa do livro ${livroId} indisponível: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }
  return total;
}

async function main(): Promise<void> {
  const env = validateEnv(process.env);
  const simular = process.argv.includes('--dry-run');
  const ssl = /sslmode=require|neon\.tech|\.render\.com/i.test(
    env.DATABASE_URL,
  );
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });
  try {
    const db = drizzle(pool, { schema });
    if (simular) {
      const livros = await livrosSemCopia(db);
      console.log(
        `[dry-run] ${livros.length} livro(s) oficial(is) em estante sem cópia própria; pasta ${env.CLOUDINARY_PASTA_CAPAS_OFICIAIS}.`,
      );
      return;
    }
    const cache = criarCacheDeCapas(env);
    if (!cache) {
      throw new Error(
        'CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET são obrigatórias para o backfill de capas.',
      );
    }
    const t = await backfillDeCapas(db, cache);
    console.log(
      `Capas: ${t.cacheadas} de ${t.livros} cacheada(s) em ${env.CLOUDINARY_PASTA_CAPAS_OFICIAIS}, ${(t.bytes / 1_048_576).toFixed(2)} MB; ${t.ausentes} ausente(s), ${t.recusadas} recusada(s), ${t.indisponiveis} indisponível(is).`,
    );
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Falha no backfill de capas:', err);
    process.exit(1);
  });
}
