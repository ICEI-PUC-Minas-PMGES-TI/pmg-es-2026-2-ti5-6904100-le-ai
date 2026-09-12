import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * Schema lógico do serviço `leitura` no PostgreSQL único do Neon
 * (arquitetura §4.1 — separação lógica, um schema por serviço).
 *
 * SEM tabelas de domínio no Período 0. Estante, leitura, progresso, sessão,
 * nota, resenha, desafios, streak, etc. entram com as features de EST/PRG/AVA/
 * DSF/STA/GAM. Este serviço expõe VIEWs (estante, nota) como contrato para a
 * recomendação em `social`; nenhum serviço lê a tabela crua de outro schema —
 * o acesso entre schemas é só por VIEW de contrato (arquitetura §4.2).
 */
export const leituraSchema = pgSchema(process.env.DB_SCHEMA ?? 'leitura');
