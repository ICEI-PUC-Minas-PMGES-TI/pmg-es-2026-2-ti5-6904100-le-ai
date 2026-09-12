import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { PinoLogger } from 'nestjs-pino';
import { DRIZZLE, DrizzleDB } from '../db/drizzle.module';

/**
 * Indicador de saúde do banco: um `SELECT 1` via Drizzle. Compõe o
 * `GET /health` (RNF-OBS-02) — o serviço só está "ok" se o banco responde.
 */
@Injectable()
export class DrizzleHealthIndicator {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(DrizzleHealthIndicator.name);
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.db.execute(sql`SELECT 1`);
      return indicator.up();
    } catch (e) {
      // A causa real (o Drizzle embrulha o erro do pg em `e.cause`) vai só
      // para o log — nunca para a resposta pública (RNF-SEC-22). O corpo
      // devolve uma mensagem genérica.
      const causa =
        e instanceof Error && e.cause instanceof Error
          ? e.cause.message
          : e instanceof Error
            ? e.message
            : String(e);
      this.logger.error({ err: e, causa }, 'Health check do banco falhou');
      return indicator.down({ message: 'Banco indisponível' });
    }
  }
}
