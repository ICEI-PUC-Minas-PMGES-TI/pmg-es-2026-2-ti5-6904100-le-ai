import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const CONTRATOS_EXTERNOS = `
  CREATE SCHEMA acervo;
  CREATE SCHEMA identidade;

  CREATE TABLE acervo.v_livro_referencia_v1 (
    livro_id uuid, tipo text, dono_id uuid, paginas integer, titulo text,
    autor_exibicao text, capa_resolvida text, ativo boolean
  );
  CREATE TABLE identidade.v_perfil_referencia_v1 (
    id uuid, username text, nome_exibicao text, avatar_url text,
    privacidade text, opt_out_recomendacao boolean
  );
  CREATE TABLE identidade.v_seguimento_aceito_v1 (
    seguidor_id uuid, seguido_id uuid
  );
`;

const TABELAS_DE_DADOS = [
  'leitura.mensagem_processada',
  'leitura.outbox_leitura',
  'leitura.idempotencia_leitura',
  'leitura.limiar_inatividade',
  'leitura.leitura',
  'leitura.estante',
  'acervo.v_livro_referencia_v1',
  'identidade.v_perfil_referencia_v1',
  'identidade.v_seguimento_aceito_v1',
];

export async function prepararBanco(): Promise<Pool> {
  const admin = new Pool({ connectionString: process.env.DATABASE_URL_TESTE });
  try {
    await admin.query(`
      DROP SCHEMA IF EXISTS leitura, acervo, identidade CASCADE;
      CREATE SCHEMA leitura;
      ${CONTRATOS_EXTERNOS}
    `);
    await migrate(drizzle(admin), {
      migrationsFolder: resolve(__dirname, '../../drizzle'),
      migrationsSchema: 'leitura',
    });
  } finally {
    await admin.end();
  }
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function limpar(pool: Pool): Promise<void> {
  await pool.query(`TRUNCATE ${TABELAS_DE_DADOS.join(', ')} CASCADE`);
}

export async function contar(
  pool: Pool,
  tabela: string,
  onde = 'true',
  parametros: unknown[] = [],
): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT count(*) AS total FROM ${tabela} WHERE ${onde}`,
    parametros,
  );
  return Number(rows[0].total);
}
