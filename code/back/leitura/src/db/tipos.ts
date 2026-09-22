import type { DrizzleDB } from './drizzle.module';

/**
 * O handle de transação que o Drizzle passa ao callback de `db.transaction`.
 *
 * Todo repositório recebe isto como primeiro parâmetro, nunca o `db` global:
 * sobre um `Pool`, usar o `db` global dentro do callback pega **outra conexão**,
 * fora da transação — a escrita commitaria sozinha e o rollback não a desfaria.
 */
export type Tx = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];
