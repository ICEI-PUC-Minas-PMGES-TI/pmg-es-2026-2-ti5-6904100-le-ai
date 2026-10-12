import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { criarPool } from '../db/conexao';
import * as schema from '../db/schema';
import { ReferenciasExternas } from '../referencias/referencias-externas.service';
import { EstatisticasService } from './aplicacao/estatisticas.service';
import { EstatisticasRepository } from './infraestrutura/estatisticas.repository';

/**
 * Backfill das estatísticas (F-STA): recompõe os baldes mensais de todo
 * leitor com progresso, leitura concluída ou nota a partir do estado atual.
 * O efeito de F-STA só entrou em `leai.leitura.metricas` agora, e o histórico
 * anterior só chega aqui. Rodar depois da migration 0006 em cada ambiente; é
 * idempotente.
 *
 * Uso: `npm run backfill:estatisticas` (ou `node dist/estatisticas/backfill.js`).
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida.');
  }
  const pool = criarPool(connectionString, process.env.NODE_ENV);
  try {
    const db = drizzle(pool, { schema });
    const servico = new EstatisticasService(
      db,
      new EstatisticasRepository(db),
      new ReferenciasExternas(db),
    );
    const total = await servico.recalcularTodos();
    console.log(`Estatísticas recompostas para ${total} leitor(es).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Falha no backfill das estatísticas:', err);
  process.exit(1);
});
