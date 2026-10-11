import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Fixture de banco: schema `leitura` pelas migrations reais e as VIEWs de
 * contrato dos outros serviços como **tabelas comuns**.
 *
 * As VIEWs de `acervo`, `identidade` e `social` não existem num banco que só
 * tem as migrations de `leitura`. Como tabela, a leitura é idêntica — o Drizzle não
 * distingue view de tabela num SELECT — e a massa entra por INSERT direto. As
 * colunas são as de `src/db/contratos-externos.ts`.
 *
 * Consequência a lembrar nos testes de RN-08: as VIEWs reais já omitem conta
 * suspensa ou em exclusão, então aqui "suspenso" e "em exclusão" são o mesmo
 * caso — sem linha na tabela.
 */
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

  CREATE SCHEMA social;

  CREATE TABLE social.v_atividade_livro_pessoal_v1 (
    atividade_id uuid, dono_id uuid, livro_id uuid
  );
  CREATE TABLE social.v_lista_livro_pessoal_v1 (
    lista_id uuid, dono_id uuid, livro_id uuid
  );
`;

/** Tabelas do Drizzle que guardam o histórico de migrations: nunca zerar. */
const TABELAS_PRESERVADAS = ['__drizzle_migrations'];

export async function prepararBanco(): Promise<Pool> {
  const admin = new Pool({ connectionString: process.env.DATABASE_URL_TESTE });
  try {
    await admin.query(`
      DROP SCHEMA IF EXISTS leitura, acervo, identidade, social CASCADE;
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

/**
 * Zera os dados entre testes, mantendo estrutura e migrations.
 *
 * A lista vem do catálogo, não de um array fixo: `leitura` é compartilhado por
 * F-AVA, F-EST e F-PRG, e uma tabela nova de qualquer feature entra na limpeza
 * sem ninguém lembrar de editar este arquivo.
 */
export async function limpar(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ tabela: string }>(
    `SELECT format('%I.%I', schemaname, tablename) AS tabela
       FROM pg_tables
      WHERE schemaname IN ('leitura', 'acervo', 'identidade', 'social')
        AND tablename <> ALL($1)`,
    [TABELAS_PRESERVADAS],
  );
  if (rows.length) {
    await pool.query(
      `TRUNCATE ${rows.map((r) => r.tabela).join(', ')} CASCADE`,
    );
  }
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
