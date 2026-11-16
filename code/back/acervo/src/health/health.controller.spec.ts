import type { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, TerminusModule } from '@nestjs/terminus';
import { PinoLogger } from 'nestjs-pino';
import request from 'supertest';
import { AllExceptionsFilter } from '../common/all-exceptions.filter';
import { DRIZZLE } from '../db/drizzle.module';
import { HealthController } from './health.controller';
import { DrizzleHealthIndicator } from './drizzle.health';

describe('HealthController', () => {
  let controller: HealthController;
  const check = jest.fn();

  beforeEach(async () => {
    check.mockResolvedValue({ status: 'ok', details: {} });
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check } },
        {
          provide: DrizzleHealthIndicator,
          useValue: { isHealthy: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('acervo') },
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('retorna status ok com nome do serviço e timestamp ISO', async () => {
    const res = await controller.check();
    expect(res.status).toBe('ok');
    expect(res.service).toBe('acervo');
    expect(() => new Date(res.time).toISOString()).not.toThrow();
    expect(check).toHaveBeenCalledTimes(1);
  });
});

/**
 * `GET /health` com o banco fora do ar (L-10): o indicador real fica `down`, o
 * `HealthCheckService` real lança, e o `AllExceptionsFilter` devolve o corpo de
 * erro padrão com 503, sem o detalhe do terminus nem a causa do driver.
 */
describe('GET /health com o banco fora do ar', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const logger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
      controllers: [HealthController],
      providers: [
        DrizzleHealthIndicator,
        {
          provide: DRIZZLE,
          useValue: {
            execute: jest.fn().mockRejectedValue(
              new Error('Failed query: SELECT 1', {
                cause: new Error('connect ECONNREFUSED 10.0.0.7:5432'),
              }),
            ),
          },
        },
        { provide: PinoLogger, useValue: logger },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('acervo') },
        },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(() => app.close());

  it('banco fora do ar responde 503 no corpo de erro padrão', async () => {
    const resposta = await request(app.getHttpServer()).get('/health');

    expect(resposta.status).toBe(503);
    expect(resposta.body).toEqual({
      codigo: 'SERVICO_INDISPONIVEL',
      mensagem:
        'Serviço temporariamente indisponível. Tente novamente em instantes.',
      correlationId: expect.any(String),
    });
    expect(JSON.stringify(resposta.body)).not.toContain('ECONNREFUSED');
  });
});
