import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { criarPool } from '../db/conexao';
import * as schema from '../db/schema';
import { SequenciaRepository } from './sequencia.repository';
import { SequenciaService } from './sequencia.service';

/**
 * Backfill da sequência (F-GAM): recompõe dias e sequências de todo leitor a
 * partir dos progressos atuais. `progresso.registrado` era publicado sem fila
 * acumuladora (catálogo de mensageria), então o que veio antes do binding de
 * `leai.leitura.metricas` só chega aqui. Rodar antes de ligar o consumidor em
 * cada ambiente; é idempotente.
 *
 * Uso: `npm run backfill:sequencia` (ou `node dist/sequencia/backfill.js`).
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida.');
  }
  const pool = criarPool(connectionString, process.env.NODE_ENV);
  try {
    const db = drizzle(pool, { schema });
    const servico = new SequenciaService(db, new SequenciaRepository(db));
    const total = await servico.recalcularTodos();
    console.log(`Sequência recomposta para ${total} leitor(es).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Falha no backfill da sequência:', err);
  process.exit(1);
});
