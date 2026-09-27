import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');
const PG_POOL = Symbol('PG_POOL');
export type DrizzleDB = NodePgDatabase<typeof schema>;

/**
 * Provê a instância Drizzle (sobre um Pool `pg`) para todo o serviço.
 * A conexão usa a DATABASE_URL, que já fixa o `search_path` no schema
 * do serviço. Acesso a dados sempre por ORM/consulta parametrizada
 * (RNF-SEC-12) — nunca concatenação de string.
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool => {
        const connectionString = config.getOrThrow<string>('DATABASE_URL');
        // Neon (e o Postgres gerenciado do Render) exigem TLS. Em Postgres
        // local sem SSL, desliga para não quebrar o dev.
        const needsSsl =
          /sslmode=require|neon\.tech|\.render\.com/i.test(connectionString) ||
          config.get<string>('NODE_ENV') === 'production';
        const pool = new Pool({
          connectionString,
          ssl: needsSsl ? { rejectUnauthorized: false } : false,
        });
        // Erro em conexão ociosa é logado sem derrubar o processo.
        pool.on('error', (err) =>
          console.error('[pg] erro no pool de conexão:', err.message),
        );
        return pool;
      },
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool): DrizzleDB => drizzle(pool, { schema }),
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Fecha as conexões no desligamento. Sem isto, as conexões ociosas seguram o
   * processo aberto depois de `app.close()`, e cada deploy no Render deixa
   * conexões penduradas no Neon até o timeout do lado do servidor.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
