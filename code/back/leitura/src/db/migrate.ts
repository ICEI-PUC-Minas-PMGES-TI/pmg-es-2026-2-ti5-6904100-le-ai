import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Runner de migrations. Cada serviço migra SÓ o seu schema (arquitetura §4.3);
 * toda migration é revisada por humano antes de subir (plano §5).
 * Uso: `npm run db:migrate` (lê DATABASE_URL / DB_SCHEMA do ambiente).
 */
async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não definida.');
  }
  const migrationsSchema = process.env.DB_SCHEMA ?? 'leitura';

  const needsSsl =
    /sslmode=require|neon\.tech|\.render\.com/i.test(connectionString) ||
    process.env.NODE_ENV === 'production';
  const pool = new Pool({
    connectionString,
    ssl: needsSsl,
  });
  try {
    // Garante o schema antes de criar a tabela de controle das migrations nele.
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${migrationsSchema}"`);
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: './drizzle', migrationsSchema });
    console.log(`Migrations aplicadas no schema "${migrationsSchema}".`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Falha ao aplicar migrations:', err);
  process.exit(1);
});
