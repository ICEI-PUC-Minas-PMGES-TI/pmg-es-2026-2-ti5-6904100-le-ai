import { Pool } from 'pg';

/**
 * Pool `pg` do serviço, para a API e para os scripts (backfills). Neon (e o
 * Postgres gerenciado do Render) exigem TLS; em Postgres local sem SSL,
 * desliga para não quebrar o dev.
 */
export function criarPool(connectionString: string, nodeEnv?: string): Pool {
  const precisaDeSsl =
    /sslmode=require|neon\.tech|\.render\.com/i.test(connectionString) ||
    nodeEnv === 'production';
  return new Pool({
    connectionString,
    ssl: precisaDeSsl ? { rejectUnauthorized: false } : false,
  });
}
