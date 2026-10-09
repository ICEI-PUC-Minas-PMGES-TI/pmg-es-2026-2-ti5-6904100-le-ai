import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { IdempotenciaService } from '../common/idempotencia/idempotencia.service';
import * as schema from '../db/schema';
import { DesafiosService } from './aplicacao/desafios.service';
import { DesafiosRepository } from './infraestrutura/desafios.repository';

/**
 * Backfill dos desafios (F-DSF): materializa as janelas e recompõe as
 * contribuições de todo leitor com desafio a partir dos progressos e
 * finalizações atuais. `leitura.finalizada` só passou a chegar a
 * `leai.leitura.metricas` com a F-DSF, e o que veio antes do binding só chega
 * aqui. Rodar antes de ligar o binding em cada ambiente; é idempotente.
 *
 * Uso: `npm run backfill:desafios` (ou `node dist/desafios/backfill.js`).
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida.');
  }
  const needsSsl =
    /sslmode=require|neon\.tech|\.render\.com/i.test(connectionString) ||
    process.env.NODE_ENV === 'production';
  const pool = new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  });
  try {
    const db = drizzle(pool, { schema });
    const servico = new DesafiosService(
      db,
      new DesafiosRepository(),
      new IdempotenciaService(db),
    );
    const total = await servico.recalcularTodos();
    console.log(`Desafios recompostos para ${total} leitor(es).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Falha no backfill dos desafios:', err);
  process.exit(1);
});
