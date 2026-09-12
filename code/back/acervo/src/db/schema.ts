import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * Schema lógico do serviço `acervo` no PostgreSQL único do Neon
 * (arquitetura §4.1 — separação lógica, um schema por serviço).
 *
 * SEM tabelas de domínio no Período 0. Livro, autor, editora, série, etc.
 * entram com as features de ACV. Nenhum serviço lê a tabela crua de outro
 * schema — o acesso entre schemas é só por VIEW de contrato (arquitetura §4.2).
 */
export const acervoSchema = pgSchema(process.env.DB_SCHEMA ?? 'acervo');
