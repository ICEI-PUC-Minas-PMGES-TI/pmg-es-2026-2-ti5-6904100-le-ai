import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const schema = process.env.DB_SCHEMA ?? 'leitura';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // Só o schema deste serviço — nunca enxerga tabelas de outro (arquitetura §4.2).
  schemaFilter: [schema],
  // Tabela de controle das migrations vive no schema do próprio serviço.
  migrations: {
    schema,
  },
  verbose: true,
  strict: true,
});
