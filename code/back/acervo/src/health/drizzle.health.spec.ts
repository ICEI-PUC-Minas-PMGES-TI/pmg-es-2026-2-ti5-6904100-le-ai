import { HealthIndicatorService } from '@nestjs/terminus';
import type { PinoLogger } from 'nestjs-pino';
import type { DrizzleDB } from '../db/drizzle.module';
import { DrizzleHealthIndicator } from './drizzle.health';

function logger() {
  return { setContext: jest.fn(), error: jest.fn() };
}

/** Erro como o Drizzle entrega: o do driver `pg` embrulhado em `cause`. */
function erroDeConexao(): Error {
  const causa = Object.assign(
    new Error('connect ECONNREFUSED 10.0.0.7:5432 senha=nao-vaza'),
    { code: 'ECONNREFUSED' },
  );
  return new Error('Failed query: SELECT 1', { cause: causa });
}

describe('DrizzleHealthIndicator (RNF-OBS-02)', () => {
  it('banco no ar deixa o indicador up', async () => {
    const db = { execute: jest.fn().mockResolvedValue({ rows: [] }) };
    const indicador = new DrizzleHealthIndicator(
      db as unknown as DrizzleDB,
      new HealthIndicatorService(),
      logger() as unknown as PinoLogger,
    );

    expect(await indicador.isHealthy('database')).toEqual({
      database: { status: 'up' },
    });
  });

  it('banco fora do ar deixa o indicador down com a mensagem de banco indisponível', async () => {
    const db = { execute: jest.fn().mockRejectedValue(erroDeConexao()) };
    const log = logger();
    const indicador = new DrizzleHealthIndicator(
      db as unknown as DrizzleDB,
      new HealthIndicatorService(),
      log as unknown as PinoLogger,
    );

    const resultado = await indicador.isHealthy('database');

    expect(resultado).toEqual({
      database: { status: 'down', message: 'Banco indisponível' },
    });
    // A causa real vai só para o log, nunca para o resultado (RNF-SEC-22).
    expect(JSON.stringify(resultado)).not.toContain('ECONNREFUSED');
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        causa: 'connect ECONNREFUSED 10.0.0.7:5432 senha=nao-vaza',
      }),
      'Health check do banco falhou',
    );
  });
});
