import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Fixture de banco: schema `acervo` pelas migrations reais e as VIEWs de
 * contrato dos outros serviços como **tabelas comuns**.
 *
 * As VIEWs de `social`, `identidade` e `leitura` não existem num banco que só
 * tem as migrations de `acervo`. Como tabela, a leitura é idêntica — o Drizzle
 * não distingue view de tabela num SELECT — e a massa de RN-15 entra por
 * INSERT direto. As colunas são as de `src/db/contratos-externos.ts`.
 */
const CONTRATOS_EXTERNOS = `
  CREATE SCHEMA social;
  CREATE SCHEMA identidade;
  CREATE SCHEMA leitura;

  CREATE TABLE social.v_atividade_livro_pessoal_v1 (
    atividade_id uuid, dono_id uuid, livro_id uuid
  );
  CREATE TABLE identidade.v_perfil_referencia_v1 (
    id uuid, username text, nome_exibicao text, avatar_url text,
    privacidade text, opt_out_recomendacao boolean
  );
  CREATE TABLE identidade.v_seguimento_aceito_v1 (
    seguidor_id uuid, seguido_id uuid
  );
  CREATE TABLE leitura.v_nota_publicacao_v1 (
    usuario_id uuid, livro_id uuid, valor numeric
  );
  CREATE TABLE leitura.v_resenha_publicacao_v1 (
    resenha_id uuid, usuario_id uuid, livro_id uuid, texto text,
    spoiler boolean, criado_em timestamptz, atualizado_em timestamptz,
    curtidas integer, descurtidas integer
  );
`;

const TABELAS_DE_DADOS = [
  'acervo.mensagem_processada',
  'acervo.outbox_acervo',
  'acervo.idempotencia_acervo',
  'acervo.importacao_livro',
  'acervo.livro_autor',
  'acervo.livro_assunto',
  'acervo.autor_chave_unificada',
  'acervo.livro',
  'acervo.autor',
  'acervo.assunto',
  'acervo.serie',
  'acervo.sinonimo_editora',
  'acervo.editora',
  'social.v_atividade_livro_pessoal_v1',
  'identidade.v_perfil_referencia_v1',
  'identidade.v_seguimento_aceito_v1',
  'leitura.v_nota_publicacao_v1',
  'leitura.v_resenha_publicacao_v1',
];

export async function prepararBanco(): Promise<Pool> {
  const admin = new Pool({ connectionString: process.env.DATABASE_URL_TESTE });
  try {
    await admin.query(`
      DROP SCHEMA IF EXISTS acervo, social, identidade, leitura CASCADE;
      CREATE SCHEMA acervo;
      ${CONTRATOS_EXTERNOS}
    `);
    await migrate(drizzle(admin), {
      migrationsFolder: resolve(__dirname, '../../drizzle'),
      migrationsSchema: 'acervo',
    });
  } finally {
    await admin.end();
  }
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

/** Zera os dados entre testes, mantendo estrutura e migrations. */
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
