import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
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
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.db.execute(sql`SELECT 1`);
      return indicator.up();
    } catch (e) {
      const detalhe = e instanceof Error ? e.message : String(e);
      return indicator.down({ message: `Banco indisponível: ${detalhe}` });
    }
  }
}
